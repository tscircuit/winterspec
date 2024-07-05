import test from "ava"
import { getTestCLI } from "tests/fixtures/get-test-cli.js"
import os from "node:os"
import path from "node:path"
import { randomUUID } from "node:crypto"
import { fileURLToPath } from "node:url"
import fs from "node:fs/promises"

test("CLI bundle-routes command produces a routes bundle", async (t) => {
  const cli = await getTestCLI(t)

  const tempPath = path.join(os.tmpdir(), `${randomUUID()}.js`)
  const appDirectoryPath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "../smoke/api"
  )
  const execution = cli.executeCommand([
    "bundle-routes",
    "-o",
    tempPath,
    "--routes-directory",
    appDirectoryPath,
  ])
  const result = await execution.waitUntilExit()
  t.is(result.exitCode, 0)

  const bundleContent = await fs.readFile(tempPath, "utf-8")
  console.log(bundleContent)
  t.true(
    bundleContent.includes(
      'import { WinterSpecRouteMap } from "@winterspec/types"'
    )
  )
  t.true(bundleContent.includes("const routeMap ="))
  t.true(bundleContent.includes("export default routeMap"))
})
