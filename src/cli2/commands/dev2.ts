import { Command } from "commander"
import { durationFormatter } from "human-readable"
import ora from "ora"
import Watcher from "watcher"
import * as esbuild from "esbuild"
import http from "node:http"
import path from "node:path"
import fs from "node:fs/promises"
import { isGitIgnored } from "globby"
import { BaseCommand } from "../base-command.js"
import { ResolvedWinterSpecConfig } from "src/config/utils.js"
import { getTempPathInApp } from "src/bundle/get-temp-path-in-app.js"
import { constructManifest } from "src/bundle/construct-manifest.js"
import { createNodeServerFromRouteMap } from "src/serve/create-node-server-from-route-map.js"
import { formatMessages } from "esbuild"
import { IncomingMessage, ServerResponse } from "node:http"

export class Dev2Command extends BaseCommand {
  register(): void {
    this.program
      .command("dev2")
      .description("Start a development server (simplified version)")
      .option("-p, --port <port>", "The port to serve your app on", "3000")
      .option("--no-emulate-wintercg", "Disable WinterCG runtime emulation")
      .option("--root <path>", "Path to your project root")
      .option("--tsconfig <path>", "Path to your tsconfig.json")
      .option("--routes-directory <path>", "Path to your routes directory")
      .option("--platform <platform>", "The platform to bundle for")
      .action(async (options) => {
        const config = await this.loadConfig(options)

        const configWithOverrides = {
          ...config,
          emulateWinterCG: options.emulateWintercg ?? true
        }

        await this.startDev2Server({
          port: parseInt(options.port, 10),
          config: configWithOverrides,
        })
      })
  }

  async startDev2Server({
    port,
    config,
  }: {
    port: number
    config: ResolvedWinterSpecConfig
  }): Promise<void> {
    const listenSpinner = ora({
      text: "Starting server...",
      hideCursor: false,
      discardStdin: false,
    }).start()

    const buildSpinner = ora({
      hideCursor: false,
      discardStdin: false,
      text: "Building...",
    })

    const timeFormatter = durationFormatter({
      allowMultiples: ["m", "s", "ms"],
    })

    // Setting up file watcher
    const rootDirectory = config.rootDirectory
    const ignore = await isGitIgnored({
      cwd: rootDirectory,
    })

    // Create temp directory for bundle
    const tempDir = await getTempPathInApp(rootDirectory)
    const manifestPath = path.join(tempDir, "dev-manifest.ts")
    const devBundlePath = path.join(tempDir, "dev-bundle.js")

    let server: http.Server | null = null
    let buildContext: esbuild.BuildContext | null = null
    let isFirstBuild = true
    let httpHandler: ((req: IncomingMessage, res: ServerResponse) => void) | null = null

    // Function to create or update the manifest
    const updateManifest = async () => {
      const manifest = await constructManifest({
        routesDirectory: config.routesDirectory,
        bundledAdapter: config.platform === "wintercg-minimal" ? "wintercg-minimal" : undefined,
      })
      await fs.writeFile(manifestPath, manifest, "utf-8")
    }

    // Function to build the project
    const build = async () => {
      let buildStartedAt = performance.now()
      buildSpinner.start("Building...")

      try {
        if (!buildContext) {
          // Create build context on first run
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
          buildSpinner.succeed(`Built in ${timeFormatter(durationMs)}`)
          
          // Import the bundle and create a new request handler
          try {
            // Clean require cache to ensure we get the latest version
            delete require.cache[devBundlePath]
            
            // Import the fresh bundle
            const { default: routeMap } = await import(devBundlePath)
            
            // Create a new server from the route map
            server = await createNodeServerFromRouteMap(
              routeMap,
              { defaultOrigin: `http://localhost:${port}` }
            )
            
            // No need for a separate request handler - the server handles it
            
            // Start server on first successful build
            if (isFirstBuild) {
              // Server already created by createNodeServerFromRouteMap
              
              server.listen(port, () => {
                listenSpinner.stopAndPersist({
                  symbol: "☃️",
                  text: ` listening on port ${port}: http://localhost:${port}\n`,
                })
                isFirstBuild = false
              })
            }
          } catch (err) {
            const error = err as Error
            buildSpinner.fail(`Error loading bundle: ${error.message}`)
          }
        } else {
          const errorMessages = await formatMessages(result.errors, {
            kind: "error",
          })
          buildSpinner.fail(`Build failed.\n${errorMessages.join("\n")}`)
        }
      } catch (err) {
        const error = err as Error
        buildSpinner.fail(`Build failed: ${error.message}`)
      }
    }

    // Set up the file watcher
    const watcher = new Watcher(rootDirectory, {
      recursive: true,
      ignoreInitial: true,
      debounce: 300, // Debounce to avoid multiple rebuilds in quick succession
      ignore: (filePath: string) => {
        if (filePath.includes(".winterspec")) {
          return true
        }

        // Skip files outside the root directory
        if (!path.relative(rootDirectory, filePath).startsWith("..")) {
          return ignore(filePath)
        }

        return true
      },
    })

    // Watch for file changes
    watcher.on("change", async () => {
      await build()
    })

    watcher.on("add", async () => {
      await updateManifest()
      await build()
    })

    watcher.on("unlink", async () => {
      await updateManifest()
      await build()
    })

    watcher.on("unlinkDir", async () => {
      await updateManifest() 
      await build()
    })

    // Handle process exit
    const cleanup = async () => {
      if (server) {
        server.close()
      }
      
      if (buildContext) {
        await buildContext.dispose()
      }
      
      watcher.close()
    }

    process.on("SIGINT", async () => {
      await cleanup()
      process.exit(0)
    })
    
    process.on("SIGTERM", async () => {
      await cleanup()
      process.exit(0)
    })

    // Start the initial build
    await build()
  }
}