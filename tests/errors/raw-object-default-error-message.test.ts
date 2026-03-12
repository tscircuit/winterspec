import test from "ava"
import { z } from "zod"
import { getTestRoute } from "tests/fixtures/get-test-route.js"

test("returning a raw object surfaces ctx.json guidance by default", async (t) => {
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
    routeFn: () => {
      return { foo: "bar" } as any
    },
  })

  const response = await axios.get("/", {
    validateStatus: () => true,
    responseType: "text",
  })

  t.is(response.status, 500)
  t.true(
    String(response.data).includes(
      "Use ctx.json({...}) instead of returning an object directly"
    )
  )
})
