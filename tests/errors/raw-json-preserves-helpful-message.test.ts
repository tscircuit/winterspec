import test from "ava"
import { z } from "zod"
import { getTestRoute } from "tests/fixtures/get-test-route.js"
import { withJsonErrorHandler } from "src/middleware/with-json-error-handler.js"

test("returning raw object keeps ctx.json guidance message", async (t) => {
  const { axios } = await getTestRoute(t, {
    globalSpec: {
      authMiddleware: {},
      beforeAuthMiddleware: [withJsonErrorHandler],
    },
    routeSpec: {
      methods: ["GET"],
      jsonBody: z.any(),
      jsonResponse: z.any(),
    },
    routePath: "/",
    routeFn: () => {
      return { foo: "bar" } as any
    },
  })

  const response = await axios.get("/", { validateStatus: () => true })

  t.is(response.status, 500)
  t.true(
    response.data.error.message.includes(
      "Use ctx.json({...}) instead of returning an object directly."
    )
  )
})
