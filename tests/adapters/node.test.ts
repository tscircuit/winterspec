import test from "ava"
import { bundle } from "src/bundle/bundle.js"
import path from "node:path"
import fs from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { execa } from "execa"
import getPort from "@ava/get-port"
import pRetry from "p-retry"
import axios from "axios"
import { once } from "node:events"
import { resolveConfig } from "src/config/utils.js"

test.serial("test bundle with Node adapter", async (t) => {
  const currentDirectory = path.dirname(fileURLToPath(import.meta.url))

  const bundled = await bundle(
    resolveConfig({
      routesDirectory: path.join(currentDirectory, "api"),
      rootDirectory: currentDirectory,
    })
  )

  const port = await getPort()

  const bundlePath = path.join(currentDirectory, "bundled.js")
  const bundleEntrypointPath = path.join(
    currentDirectory,
    "bundled.entrypoint.mjs"
  )
  await fs.writeFile(bundlePath, bundled.code, "utf-8")
  await fs.writeFile(
    bundleEntrypointPath,
    `
    import {startServer} from "../../dist/adapters/node.js"
    import bundle from "./bundled.js"

    const fooMiddleware = (req, ctx, next) => {
      req.foo = "bar"
      return next(req, ctx)
    }

    startServer(bundle, { port: ${port}, middleware: [fooMiddleware] })
  `,
    "utf-8"
  )

  const cmd = execa("node", [bundleEntrypointPath])

  cmd.stderr!.on("data", (data) => {
    console.error("From child process: " + data.toString())
  })

  cmd.stdout!.on("data", (data) => {
    console.log("From child process: " + data.toString())
  })

  cmd.addListener("close", (code) => {
    if (code) t.fail(`Server exited with code ${code}`)
  })

  const waitForExit = once(cmd, "exit")

  t.teardown(async () => {
    cmd.kill("SIGTERM")
    await waitForExit
  })

  await pRetry(
    async () => {
      try {
        const response = await axios.get(`http://localhost:${port}/health`)

        t.true(response.data.ok)
      } catch (e: any) {
        t.log("axios failed (a few failures expected): " + e.message)
        throw e
      }
    },
    {
      retries: 3,
    }
  )

  const response = await axios.get(`http://localhost:${port}/health`)
  t.is(response.data.foo, "bar")
})

test.serial(
  "test bundle with Node adapter and manual server start",
  async (t) => {
    const currentDirectory = path.dirname(fileURLToPath(import.meta.url))

    const bundled = await bundle(
      resolveConfig({
        routesDirectory: path.join(currentDirectory, "api"),
        rootDirectory: currentDirectory,
      })
    )

    const port = await getPort()

    const bundlePath = path.join(currentDirectory, "bundled.js")
    const bundleEntrypointPath = path.join(
      currentDirectory,
      "bundled.entrypoint.mjs"
    )
    await fs.writeFile(bundlePath, bundled.code, "utf-8")
    await fs.writeFile(
      bundleEntrypointPath,
      `
    import http from "node:http"

    import {getNodeHandler} from "../../dist/adapters/node.js"
    import bundle from "./bundled.js"

    const fooMiddleware = (req, ctx, next) => {
      req.foo = "bar"
      return next(req, ctx)
    }

    const nodeHandler = getNodeHandler(bundle, { port: ${port}, middleware: [fooMiddleware] })

    const server = http.createServer(nodeHandler)

    server.listen(${port})
  `,
      "utf-8"
    )

    const cmd = execa("node", [bundleEntrypointPath])

    cmd.stderr!.on("data", (data) => {
      console.error("From child process: " + data.toString())
    })

    cmd.stdout!.on("data", (data) => {
      console.log("From child process: " + data.toString())
    })

    cmd.addListener("close", (code) => {
      if (code) t.fail(`Server exited with code ${code}`)
    })

    const waitForExit = once(cmd, "exit")

    t.teardown(async () => {
      cmd.kill("SIGTERM")
      await waitForExit
    })

    await pRetry(
      async () => {
        try {
          const response = await axios.get(`http://localhost:${port}/health`)

          t.true(response.data.ok)
        } catch (e: any) {
          t.log("axios failed (a few failures expected): " + e.message)
          throw e
        }
      },
      {
        retries: 3,
      }
    )

    const response = await axios.get(`http://localhost:${port}/health`)
    t.is(response.data.foo, "bar")
  }
)
