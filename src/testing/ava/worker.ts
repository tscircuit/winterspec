import { InitialWorkerData } from "./types.js"
import { devServer } from "src/dev/dev.js"
import { SharedWorker } from "ava/plugin"
import { loadConfig } from "src/config/index.js"
import { ChannelOptions } from "birpc"
import { once } from "node:events"

export class Worker {
  private startBundlerPromise: ReturnType<
    typeof devServer.headless.startBundler
  >

  constructor(private initialData: InitialWorkerData) {
    console.log("worker constructed")
    this.startBundlerPromise = this.startBundler()
  }

  public async handleTestWorker(testWorker: SharedWorker.TestWorker) {
    console.log("handleTestWorker")
    let workerRpcCallback: (data: any) => void
    const channel: ChannelOptions = {
      post: (data) => testWorker.publish(data),
      on: (data) => {
        workerRpcCallback = data
      },
    }

    const messageHandlerAbortController = new AbortController()
    const messageHandlerPromise = Promise.race([
      once(messageHandlerAbortController.signal, "abort"),
      (async () => {
        let didAddChannel = false

        for await (const msg of testWorker.subscribe()) {
          if (!didAddChannel) {
            const bundler = await this.startBundlerPromise

            bundler.birpc.updateChannels((channels) => channels.push(channel))
            didAddChannel = true
          }

          workerRpcCallback!(msg.data)

          if (messageHandlerAbortController.signal.aborted) {
            break
          }
        }
      })(),
    ])

    testWorker.teardown(async () => {
      const bundler = await this.startBundlerPromise
      bundler.birpc.updateChannels((channels) =>
        channels.filter((c) => c !== channel)
      )
      messageHandlerAbortController.abort()
      await messageHandlerPromise
    })
  }

  private async startBundler() {
    const config = await loadConfig(this.initialData.rootDirectory)
    return devServer.headless.startBundler({
      config,
    })
  }
}
