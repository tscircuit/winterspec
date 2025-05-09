import { loadConfig, ResolvedWinterSpecConfig } from "src/config/utils.js"
import type { StartDevServerOptions } from "./dev-server.js"
import Watcher from "watcher"
import * as esbuild from "esbuild"
import http from "node:http"
import path from "node:path"
import fs from "node:fs/promises"
import { isGitIgnored } from "globby"
import { getTempPathInApp } from "src/bundle/get-temp-path-in-app.js"
import { constructManifest } from "src/bundle/construct-manifest.js"
import { formatMessages } from "esbuild"
import type { AddressInfo } from "node:net"
import { getNodeHandler } from "src/adapters/node.js"
import { pathToFileURL } from "node:url"
import { once } from "node:events"

// Unlike the original dev server, startDevServer2 takes a much simpler approach.
// When it detects a relevant file system change, it rebundles the entire app.
// It does not use a headless dev server bundler.
export const startDevServer2 = async (options: StartDevServerOptions) => {
  const config = await loadConfig(
    options.rootDirectory ?? process.cwd(),
    options.config
  )

  const port = options.port ?? 3000
  let isFirstBuildListening = true

  const rootDirectory = config.rootDirectory
  const tempDir = await getTempPathInApp(rootDirectory)
  const manifestPath = path.join(tempDir, "dev-manifest.ts")
  const devBundlePath = path.join(tempDir, "dev-bundle.js")

  let server: http.Server | null = null
  let buildContext: esbuild.BuildContext | null = null

  const ignore = await isGitIgnored({ cwd: rootDirectory })

  const updateManifest = async () => {
    const manifestContent = await constructManifest({
      routesDirectory: config.routesDirectory,
      bundledAdapter:
        config.platform === "wintercg-minimal" ? "wintercg-minimal" : undefined,
    })
    await fs.writeFile(manifestPath, manifestContent, "utf-8")
  }

  const build = async () => {
    options.onBuildStart?.()
    const buildStartedAt = performance.now()

    try {
      if (!buildContext) {
        await updateManifest()
        buildContext = await esbuild.context({
          entryPoints: [manifestPath],
          bundle: true,
          platform: config.platform === "wintercg-minimal" ? "browser" : "node",
          packages: config.platform === "node" ? "external" : undefined,
          format: config.platform === "wintercg-minimal" ? "cjs" : "esm",
          outfile: devBundlePath,
          write: true,
          sourcemap: "inline",
          logLevel: "silent",
        })
      }

      const result = await buildContext.rebuild()
      const durationMs = performance.now() - buildStartedAt

      if (result.errors.length === 0) {
        options.onBuildEnd?.({
          type: "success",
          bundlePath: devBundlePath,
          buildUpdatedAtMs: Date.now(),
        })

        const bundleUrl = pathToFileURL(devBundlePath).href + `?t=${Date.now()}`
        const importedModule = await import(bundleUrl)

        if (server) {
          await new Promise<void>((resolve) => server!.close(() => resolve()))
        }

        if (config.platform === "node") {
          const winterSpecBundle = importedModule.default
          if (!winterSpecBundle) {
            const errorMessage =
              "Node bundle did not export default WinterSpec object."
            console.error(errorMessage)
            options.onBuildEnd?.({
              type: "failure",
              errorMessage,
              buildUpdatedAtMs: Date.now(),
            })
            return
          }
          const nodeHandler = getNodeHandler(winterSpecBundle, {
            port: port,
            middleware: options.middleware,
          })
          server = http.createServer(nodeHandler)
        } else {
          // wintercg-minimal
          const errorMessage =
            "Built for wintercg-minimal. This bundle calls addFetchListener and is not directly servable by startDevServer2's Node.js server. The bundle was executed, but the HTTP server may not reflect changes or serve content as expected."
          console.warn(errorMessage)
          // Notify via onBuildEnd about the situation, possibly as a partial success or specific warning.
          // For simplicity, we'll still call it a "success" in terms of bundling, but the serving aspect is limited.
          // A more advanced system might have a different status for this.
          // options.onBuildEnd?.({ type: "warning", message: errorMessage, buildUpdatedAtMs: Date.now() });

          // Create a placeholder server if none exists, or let the old one (if any) continue.
          // This state is not ideal for wintercg-minimal.
          if (!server) {
            server = http.createServer((req, res) => {
              res.writeHead(500, { "Content-Type": "text/plain" })
              res.end(errorMessage)
            })
          }
        }

        if (server && !server.listening) {
          server.on("error", (err: NodeJS.ErrnoException) => {
            if (err.code === "EADDRINUSE") {
              const errorMessage = `Port ${port} is already in use. Please choose a different port.`
              console.error(errorMessage)
              options.onBuildEnd?.({
                type: "failure",
                errorMessage,
                buildUpdatedAtMs: Date.now(),
              })
              // Consider stopping the watcher and context here.
            } else {
              console.error("Server error:", err)
              options.onBuildEnd?.({
                type: "failure",
                errorMessage: `Server error: ${err.message}`,
                buildUpdatedAtMs: Date.now(),
              })
            }
          })

          server.listen(port, () => {
            const address = server!.address() as AddressInfo
            if (isFirstBuildListening) {
              options.onListening?.(address.port)
              isFirstBuildListening = false
            }
          })
          await once(server, "listening").catch((err) => {
            // This catch might be redundant if 'error' event handles EADDRINUSE before `await once` resolves/rejects
            if ((err as NodeJS.ErrnoException).code !== "EADDRINUSE") {
              // EADDRINUSE is handled by the 'error' listener
              console.error("Failed to start server after build:", err)
              options.onBuildEnd?.({
                type: "failure",
                errorMessage: `Failed to start server: ${
                  (err as Error).message
                }`,
                buildUpdatedAtMs: Date.now(),
              })
            }
          })
        }
      } else {
        const errorMessages = await formatMessages(result.errors, {
          kind: "error",
        })
        options.onBuildEnd?.({
          type: "failure",
          errorMessage: errorMessages.join("\n"),
          buildUpdatedAtMs: Date.now(),
        })
      }
    } catch (err: any) {
      console.error("Build process error:", err)
      options.onBuildEnd?.({
        type: "failure",
        errorMessage: err.message,
        buildUpdatedAtMs: Date.now(),
      })
    }
  }

  const watcher = new Watcher(rootDirectory, {
    recursive: true,
    ignoreInitial: false, // Build on initial scan
    debounce: 200,
    ignore: (filePath: string) => {
      if (filePath.includes(".winterspec")) {
        return true
      }
      if (!path.relative(rootDirectory, filePath).startsWith("..")) {
        return ignore(filePath)
      }
      return true
    },
  })

  const handleFileChange = async (isManifestChange: boolean = false) => {
    if (isManifestChange) {
      await updateManifest()
    }
    await build()
  }

  watcher.on("change", async (file) => {
    await handleFileChange(false)
  })
  watcher.on("add", async (file) => {
    await handleFileChange(true)
  })
  watcher.on("unlink", async (file) => {
    await handleFileChange(true)
  })
  watcher.on("unlinkDir", async (dir) => {
    await handleFileChange(true)
  })

  // Initial build is triggered by watcher's ignoreInitial: false
  // If ignoreInitial were true, you'd call:
  // await updateManifest();
  // await build();

  const stop = async () => {
    watcher.close()
    if (server) {
      await new Promise<void>((resolve) => server!.close(() => resolve()))
    }
    if (buildContext) {
      await buildContext.dispose()
    }
  }

  process.on("SIGINT", async () => {
    await stop()
    process.exit(0)
  })
  process.on("SIGTERM", async () => {
    await stop()
    process.exit(0)
  })

  // Wait for the first listening event to ensure port is correctly reported.
  // This relies on the initial build completing and server starting.
  if (isFirstBuildListening && server) {
    await once(server, "listening")
  } else if (isFirstBuildListening && !server) {
    // If server isn't created yet, wait for a build that might create it.
    // This path is tricky; initial build should set up the server.
    // A robust way is to await the first successful onListening call.
    await new Promise<void>((resolve) => {
      const originalOnListening = options.onListening
      options.onListening = (p) => {
        originalOnListening?.(p)
        resolve()
      }
    })
  }

  return {
    // Port might not be available until the first successful build and listen.
    // The caller should ideally get the port from the onListening callback.
    // For now, return the configured port, with the understanding it might fail.
    port: port.toString(),
    stop,
  }
}
