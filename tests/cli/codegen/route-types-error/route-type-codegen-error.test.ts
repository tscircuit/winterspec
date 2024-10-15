import test from "ava"
import { getTestCLI } from "tests/fixtures/get-test-cli.js"
import os from "node:os"
import path from "node:path/posix"
import { randomUUID } from "node:crypto"
import { fileURLToPath } from "node:url"

test("CLI codegen route-types command shows diagnostics if compilation fails", async (t) => {
  const cli = await getTestCLI(t)

  const testFileDirectory = path.dirname(fileURLToPath(import.meta.url))

  const tempPath = path.join(os.tmpdir(), `${randomUUID()}.d.ts`)
  const appDirectoryPath = path.join(testFileDirectory, "api")
  const tsconfigPath = path.join(testFileDirectory, "tsconfig.json")
  const execution = cli.executeCommand([
    "codegen",
    "route-types",
    "-o",
    tempPath,
    "--routes-directory",
    appDirectoryPath,
    "--tsconfig",
    tsconfigPath,
  ])
  const cliResult = await execution.waitUntilExit()
  t.is(cliResult.exitCode, 1)
  t.true(
    cliResult.stderr.includes(
      `Property 'thisMethodDoesNotExist' does not exist`
    )
  )
})
