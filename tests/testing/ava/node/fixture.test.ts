import test from "ava"
import { fileURLToPath } from "node:url"
import path from "node:path/posix"
import { getTestServer } from "src/testing/ava/fixture.js"

test("Node.js APIs can be used", async (t) => {
  const { port } = await getTestServer(t, {
    rootDirectory: path.dirname(fileURLToPath(import.meta.url)),
  })

  const randomResponse = await fetch(`http://localhost:${port}/random`)
  t.is(randomResponse.status, 200)
  t.is((await randomResponse.text()).length, 32)
})
