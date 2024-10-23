import { SharedWorker } from "ava/plugin"
import { Worker } from "./worker.js"
import { fileURLToPath } from "node:url"

const needsToNegotiateProtocol = (
  arg: SharedWorker.FactoryOptions | SharedWorker.Protocol
): arg is SharedWorker.FactoryOptions => {
  return (
    typeof (arg as SharedWorker.FactoryOptions).negotiateProtocol === "function"
  )
}

const workerWrapper = async (
  arg: SharedWorker.FactoryOptions | SharedWorker.Protocol
) => {
  const protocol = needsToNegotiateProtocol(arg)
    ? arg.negotiateProtocol(["ava-4"]).ready()
    : arg

  const { initialData } = protocol

  for await (const testWorker of protocol.testWorkers()) {
    const route = fileURLToPath(testWorker.file)
      .split("\\")
      .slice(0, -1)
      .join("\\")
    const worker = new Worker({ rootDirectory: route } as any)
    void worker.handleTestWorker(testWorker as any)
  }
}

export default workerWrapper
