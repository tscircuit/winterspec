import { MessageChannel } from "node:worker_threads"
import { AddressInfo } from "node:net"
import type { ChannelOptions } from "birpc"
import type { WinterSpecConfig } from "src/config/config.js"
import { loadConfig } from "src/config/utils.js"
import {
  StartHeadlessDevServerOptions,
  startHeadlessDevServer,
} from "./headless/start-server.js"
import { startHeadlessDevBundler } from "./headless/start-bundler.js"

export type StartDevServerOptions = {
  rootDirectory?: string
  config?: WinterSpecConfig
  port?: number
} & Pick<
  StartHeadlessDevServerOptions,
  "middleware" | "onListening" | "onBuildStart" | "onBuildEnd"
>

/**
 * Start an WinterSpec dev server. It will continuously watch your code and rebuild on changes. (This is the same function called by `winterspec dev`.)
 *
 * This must be run within a native context (Node.js, Bun, or Deno).
 */
export const startDevServer = async (options: StartDevServerOptions) => {
  const config = await loadConfig(
    options.rootDirectory ?? process.cwd(),
    options.config
  )

  const messageChannel = new MessageChannel()

  const httpServerRpcChannel: ChannelOptions = {
    post: (data) => messageChannel.port2.postMessage(data),
    on: (data) => messageChannel.port2.on("message", data),
  }

  const port = options.port ?? 3000
  const headlessServer = await startHeadlessDevServer({
    port,
    config,
    rpcChannel: httpServerRpcChannel,
    middleware: options.middleware,
    onListening: options.onListening,
    onBuildStart: options.onBuildStart,
    onBuildEnd: options.onBuildEnd,
  })

  const bundlerRpcChannel: ChannelOptions = {
    post: (data) => messageChannel.port1.postMessage(data),
    on: (data) => messageChannel.port1.on("message", data),
  }

  const headlessBundler = await startHeadlessDevBundler({
    config,
    initialRpcChannels: [bundlerRpcChannel],
  })

  return {
    port: (headlessServer.server.address() as AddressInfo).port.toString(),
    stop: async () => {
      await Promise.all([headlessServer.stop(), headlessBundler.stop()])
      messageChannel.port1.close()
      messageChannel.port2.close()
    },
  }
}
