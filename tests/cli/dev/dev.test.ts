import test from "ava"
import { getTestCLI } from "tests/fixtures/get-test-cli.js"
import path from "node:path/posix"
import { fileURLToPath } from "node:url"
import getPort from "@ava/get-port"
import pRetry from "p-retry"

test("CLI dev command starts a dev server", async (t) => {
  const cli = await getTestCLI(t)

  const port = await getPort()

  const rootDirectory = path.dirname(fileURLToPath(import.meta.url))

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
