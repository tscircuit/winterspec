import { once } from "node:events"
import { createServer } from "node:http"
import kleur from "kleur"
import { transformToNodeBuilder } from "src/edge/transform-to-node.js"
import { ResolvedWinterSpecConfig } from "src/config/utils.js"
import { RequestHandlerController } from "./request-handler-controller.js"
import { Middleware } from "src/middleware/index.js"
import { createBirpc, type ChannelOptions } from "birpc"
import { BundlerRpcFunctions, HttpServerRpcFunctions } from "./types.js"

export interface StartHeadlessDevServerOptions {
  port: number
  config: ResolvedWinterSpecConfig
  rpcChannel: ChannelOptions
  middleware?: Middleware[]
  onListening?: (port: number) => void
  onBuildStart?: HttpServerRpcFunctions["onBuildStart"]
  onBuildEnd?: HttpServerRpcFunctions["onBuildEnd"]
}

/**
 * Start a headless WinterSpec dev server. It receives a bundle from the headless dev bundler and serves it.
 *
 * This must be run within a native context (Node.js, Bun, or Deno).
 */
export const startHeadlessDevServer = async ({
  port,
  config,
  rpcChannel,
  middleware = [],
  onListening,
  onBuildStart,
  onBuildEnd,
}: StartHeadlessDevServerOptions) => {
  const birpc = createBirpc<BundlerRpcFunctions, HttpServerRpcFunctions>(
    {
      onBuildStart: () => {
        onBuildStart?.()
      },
      onBuildEnd: (result) => {
        onBuildEnd?.(result)
      },
    },
    rpcChannel
  )
  const controller = new RequestHandlerController(birpc, middleware)

  const server = createServer(
    transformToNodeBuilder({
      defaultOrigin: `http://localhost:${port}`,
    })(async (req) => {
      try {
        if (config.platform === "wintercg-minimal") {
          const runtime = await controller.getWinterCGRuntime()
          const response = await runtime.dispatchFetch(req.url, req)
          await response.waitUntil()
          return response
        }

        const nodeHandler = await controller.getNodeHandler()
        return await nodeHandler(req)
      } catch (error) {
        if (error instanceof Error) {
          process.stderr.write(
            kleur.bgRed("\nUnhandled exception:\n") +
              (error.stack ?? error.message) +
              "\n"
          )
        } else {
          process.stderr.write(
            "Unhandled exception:\n" +
              ((error as any).stack
                ? (error as any).stack
                : JSON.stringify(error)) +
              "\n"
          )
        }

        return new Response("Internal server error", {
          status: 500,
        })
      }
    })
  )

  const listeningPromise = once(server, "listening")
  server.listen(port)
  await listeningPromise
  onListening?.(port)

  return {
    server,
    stop: async () => {
      const closePromise = once(server, "close")
      server.close()
      await closePromise
    },
    getBuildResult: async () => {
      return birpc.waitForAvailableBuild()
    },
  }
}
