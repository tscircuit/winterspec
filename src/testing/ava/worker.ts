import EventEmitter2 from "eventemitter2"
import { InitialWorkerData, MessageFromWorker, MessageToWorker } from "./types"
import { HeadlessBuildEvents, devServer } from "src/dev/dev"
import { SharedWorker } from "ava/plugin"
import { loadConfig } from "src/config"

export class Worker {
  private headlessEventEmitter: EventEmitter2
  private firstFinishedBuildingEventPromise: Promise<
    Parameters<HeadlessBuildEvents["finished-building"]>
  >
  private startBundlerPromise: ReturnType<
    typeof devServer.headless.startBundler
  >

  constructor(private initialData: InitialWorkerData) {
    this.headlessEventEmitter = new EventEmitter2({ wildcard: true })

    this.firstFinishedBuildingEventPromise = EventEmitter2.once(
      this.headlessEventEmitter,
      "finished-building"
    ).then((data) => data as HeadlessBuildEvents["finished-building"])

    this.startBundlerPromise = this.startBundler()
  }

  public async handleTestWorker(
    testWorker: SharedWorker.TestWorker<MessageToWorker | MessageFromWorker>
  ) {
    for await (const message of testWorker.subscribe()) {
      if (message.data.type === "get-initial-bundle") {
        await this.startBundlerPromise
        const [{ bundlePath }] = await this.firstFinishedBuildingEventPromise
        message.reply({ type: "initial-bundle", bundlePath })
      }
    }

    this.headlessEventEmitter.on("*", function (...args) {
      const message: MessageFromWorker = {
        type: "from-headless-dev-bundler",
        originalEventType: this.event,
        data: args,
      }
      testWorker.publish(message)
    })
  }

  private async startBundler() {
    const config = await loadConfig({
      rootDirectory: this.initialData.rootDirectory,
    })
    return devServer.headless.startBundler({
      config,
      headlessEventEmitter: this.headlessEventEmitter as any,
    })
  }
}
