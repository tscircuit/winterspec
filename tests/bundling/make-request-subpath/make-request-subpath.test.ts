import test, { ExecutionContext } from "ava"
import { getTestCLI } from "tests/fixtures/get-test-cli.js"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { loadBundle } from "src/helpers.js"
import fs from "node:fs/promises"

const createChildBundle = async (t: ExecutionContext) => {
  const cli = await getTestCLI(t)

  const bundlePath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "built-child.js"
  )
  const appDirectoryPath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "./child"
  )

  t.teardown(async () => {
    await fs.unlink(bundlePath)
  })

  const execution = cli.executeCommand([
    "bundle",
    "-o",
    bundlePath,
    "--routes-directory",
    appDirectoryPath,
  ])
  const result = await execution.waitUntilExit()
  t.is(result.exitCode, 0)
}

const createAndLoadParentBundle = async (t: ExecutionContext) => {
  const cli = await getTestCLI(t)

  const bundlePath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "built-parent.js"
  )
  const appDirectoryPath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "./parent"
  )

  t.teardown(async () => {
    await fs.unlink(bundlePath)
  })

  const execution = cli.executeCommand([
    "bundle",
    "-o",
    bundlePath,
    "--routes-directory",
    appDirectoryPath,
  ])
  const result = await execution.waitUntilExit()
  t.is(result.exitCode, 0)

  return loadBundle(pathToFileURL(bundlePath).href)
}

test.serial("automatically detects and removes base path", async (t) => {
  await createChildBundle(t)

  const bundle = await createAndLoadParentBundle(t)

  const response = await bundle.makeRequest(
    new Request(new URL("https://example.com/foo/health"))
  )
  t.is(response.status, 200)
  t.is(await response.text(), "ok")
})

test.serial("base path removal works with nested route", async (t) => {
  await createChildBundle(t)

  const bundle = await createAndLoadParentBundle(t)

  const response = await bundle.makeRequest(
    new Request(new URL("https://example.com/foo/nested/health"))
  )
  t.is(response.status, 200)
  t.is(await response.text(), "ok")
})

test.serial(
  "throws 404 instead of assuming unknown path segment is part of base path to be removed",
  async (t) => {
    await createChildBundle(t)

    const bundle = await createAndLoadParentBundle(t)

    const response = await bundle.makeRequest(
      // intentionally misspelled to make sure it doesn't match the root /health on the child service
      new Request(new URL("https://example.com/foo/neste/health"))
    )
    t.is(response.status, 404)
  }
)
