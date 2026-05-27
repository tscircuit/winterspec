import test, { ExecutionContext } from "ava"
import { getTestCLI } from "tests/fixtures/get-test-cli.js"
import os from "node:os"
import path from "node:path"
import { randomUUID } from "node:crypto"
import { fileURLToPath, pathToFileURL } from "node:url"
import { loadBundle } from "src/helpers.js"

const createAndLoadBundle = async (t: ExecutionContext) => {
  const cli = await getTestCLI(t)

  const tempPath = path.join(os.tmpdir(), `${randomUUID()}.js`)
  const appDirectoryPath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "./api"
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

  return loadBundle(pathToFileURL(tempPath).href)
}

test.serial("simple request works", async (t) => {
  const bundle = await createAndLoadBundle(t)
  t.truthy(bundle.makeRequest)

  const response = await bundle.makeRequest(
    new Request(new URL("https://example.com/health"))
  )
  t.is(response.status, 200)
  t.is(await response.text(), "ok")
})

test.serial("custom middleware works", async (t) => {
  const bundle = await createAndLoadBundle(t)
  t.truthy(bundle.makeRequest)

  const response = await bundle.makeRequest(
    new Request(new URL("https://example.com/health")),
    {
      middleware: [
        (req, ctx, next) => {
          // intercept and return something different
          return new Response("intercepted")
        },
      ],
    }
  )
  t.is(response.status, 200)
  t.is(await response.text(), "intercepted")
})

test.serial("custom middleware can return ctx.json", async (t) => {
  const bundle = await createAndLoadBundle(t)
  t.truthy(bundle.makeRequest)

  const response = await bundle.makeRequest(
    new Request(new URL("https://example.com/health")),
    {
      middleware: [
        (_req, ctx: any) => {
          return ctx.json({ ok: true })
        },
      ],
    }
  )
  t.is(response.status, 200)
  t.deepEqual(await response.json(), { ok: true })
})

test.serial("custom middleware rejects raw object responses", async (t) => {
  const bundle = await createAndLoadBundle(t)
  t.truthy(bundle.makeRequest)

  const error = await t.throwsAsync(() =>
    bundle.makeRequest(new Request(new URL("https://example.com/health")), {
      middleware: [
        () => {
          return { ok: true } as any
        },
      ],
    })
  )

  t.true(
    error?.message.includes(
      "Use ctx.json({...}) instead of returning an object directly"
    )
  )
})

test.serial("can make request when hosted on subpath", async (t) => {
  const bundle = await createAndLoadBundle(t)

  const response = await bundle.makeRequest(
    new Request(new URL("https://example.com/a/sample/module/sub/path/health")),
    {
      removePathnamePrefix: "/a/sample/module/sub/path",
      automaticallyRemovePathnamePrefix: false,
    }
  )
  t.is(response.status, 200)
  t.is(await response.text(), "ok")
})
