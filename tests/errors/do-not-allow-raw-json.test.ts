import test from "ava"
import { z } from "zod"
import { getTestRoute } from "tests/fixtures/get-test-route.js"

test("should auto-wrap plain object returns in Response.json()", async (t) => {
  const { axios } = await getTestRoute(t, {
    globalSpec: {
      authMiddleware: {},
    },
    routeSpec: {
      methods: ["GET"],
      jsonBody: z.any(),
      jsonResponse: z.any(),
    },
    routePath: "/",
    routeFn: (req, ctx) => {
      return { foo: "bar" } as any
    },
  })

  const { data, status } = await axios.get("/")
  t.is(status, 200)
  t.is(data.foo, "bar")
})
