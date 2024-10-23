import test from "ava"
import { getTestCLI } from "tests/fixtures/get-test-cli.js"
import os from "node:os"
import path from "node:path"
import { randomUUID } from "node:crypto"
import { fileURLToPath, pathToFileURL } from "node:url"

test("CLI bundle command requires an output path", async (t) => {
  const cli = await getTestCLI(t)

  const execution = cli.executeCommand(["bundle"])
  const result = await execution.waitUntilExit()
  t.is(result.exitCode, 1)
})

test("CLI bundle command produces a bundle", async (t) => {
  const cli = await getTestCLI(t)

  const tempPath = path.join(os.tmpdir(), `${randomUUID()}.js`)
  const appDirectoryPath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "../smoke/routes"
  )
  const execution = cli.executeCommand([
    "bundle",
    "-o",
    tempPath,
    "--routes-directory",
    appDirectoryPath,
  ])
  const result = await execution.waitUntilExit()
  t.is(result.exitCode, 0)

  const bundle = await import(pathToFileURL(tempPath).href)
  t.truthy(bundle.default.routeMapWithHandlers)
})
