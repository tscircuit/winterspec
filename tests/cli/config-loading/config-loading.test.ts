import getPort from "@ava/get-port"
import test from "ava"
import path from "node:path/posix"
import { fileURLToPath } from "node:url"
import pRetry from "p-retry"
import { getTestCLI } from "tests/fixtures/get-test-cli.js"

test("Config paths are resolved relative to root directory", async (t) => {
  const cli = await getTestCLI(t)

  const rootDirectory = path.dirname(fileURLToPath(import.meta.url))

  const port = await getPort()

  cli.executeCommand(["dev", "--root", rootDirectory, "-p", port.toString()])

  await t.notThrowsAsync(async () => {
    await pRetry(
      async () => {
        const response = await fetch(`http://localhost:${port}/health`)
        if (response.status !== 200) {
          throw new Error("Server has not started yet")
        }
      },
      {
        retries: 10,
        minTimeout: 500,
        factor: 1,
      }
    )
  })
})
