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

  // Old implementation:
  // const { initialData } = protocol
  // const worker = new Worker(initialData as any);

  const getDirectoryFromPath = (filePath: string) => {
    if (filePath.includes("/"))
      return filePath.split("/").slice(0, -1).join("/")
    return filePath.split("\\").slice(0, -1).join("\\")
  }

  for await (const testWorker of protocol.testWorkers()) {
    const testFileDirectory = getDirectoryFromPath(
      fileURLToPath(testWorker.file)
    )

    const worker = new Worker({ rootDirectory: testFileDirectory } as any)

    void worker.handleTestWorker(testWorker as any)
  }
}

export default workerWrapper
