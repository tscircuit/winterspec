import test from "ava"
import { getTestCLI } from "tests/fixtures/get-test-cli.js"
import os from "node:os"
import path from "node:path"
import { randomUUID } from "node:crypto"
import { fileURLToPath } from "node:url"

test("winterspec bundle doesn't throw for node:* imports when --platform node is provided", async (t) => {
  const cli = await getTestCLI(t)

  const tempPath = path.join(os.tmpdir(), `${randomUUID()}.js`)
  const appDirectoryPath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "./nodejs-winterspec-project/api"
  )
  const execution = cli.executeCommand([
    "bundle",
    "--platform",
    "node",
    "-o",
    tempPath,
    "--routes-directory",
    appDirectoryPath,
  ])
  const result = await execution.waitUntilExit()
  t.is(result.exitCode, 0)
})
