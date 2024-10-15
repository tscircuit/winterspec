import test from "ava"
import fs from "node:fs/promises"
import path from "node:path/posix"
import { fileURLToPath } from "node:url"
import { getTestServer } from "tests/fixtures/get-test-server.js"
import pRetry, { AbortError } from "p-retry"

test("dev server rebuilds when a route is added", async (t) => {
  const { axios } = await getTestServer(t, import.meta.url)

  const routePath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "api",
    "health.ts"
  )

  await fs.writeFile(
    routePath,
    `
    export default () => {
      return new Response("ok")
    }
  `
  )
  t.teardown(async () => {
    await fs.unlink(routePath)
  })

  t.timeout(10_000)
  await t.notThrowsAsync(async () => {
    // The watcher waits a little bit to debounce
    await pRetry(
      async () => {
        const response = await axios.get("/health")

        if (response.data !== "ok") {
          if (response.status !== 404) {
            throw new AbortError("Received non-404 response")
          }

          throw new Error("Server has not rebuilt yet")
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
