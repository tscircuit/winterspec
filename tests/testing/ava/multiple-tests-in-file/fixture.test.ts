import test from "ava"
import { fileURLToPath } from "node:url"
import path from "node:path/posix"
import { getTestServer } from "src/testing/ava/fixture.js"
import { Middleware } from "src/middleware/index.js"

// Runs many tests concurrently to assert there's no race conditions
for (let i = 0; i < 100; i++) {
  test(`health check with middleware injection (${i})`, async (t) => {
    const sampleMiddleware: Middleware<{}, { foo: string }> = (
      req,
      ctx,
      next
    ) => {
      ctx.foo = t.title
      return next(req, ctx)
    }

    const { port } = await getTestServer(t, {
      rootDirectory: path.dirname(fileURLToPath(import.meta.url)),
      middleware: [sampleMiddleware],
    })

    const healthResponse = await fetch(
      `http://localhost:${port}/middleware-test`
    )
    t.is(healthResponse.status, 200)
    t.is(await healthResponse.text(), t.title)
  })
}
