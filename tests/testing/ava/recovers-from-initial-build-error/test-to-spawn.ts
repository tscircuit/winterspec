import test from "ava"
import { fileURLToPath } from "node:url"
import path from "node:path/posix"
import { getTestServer } from "src/testing/ava/fixture.js"

test("can fetch health endpoint", async (t) => {
  const rootDirectory = path.dirname(fileURLToPath(import.meta.url))

  const { port } = await getTestServer(t, {
    rootDirectory,
  })

  const healthResponse = await fetch(`http://localhost:${port}/health`)
  t.is(healthResponse.status, 200)
  t.is(await healthResponse.text(), "OK")
})
