import test from "ava"
import { z } from "zod"
import { getTestRoute } from "tests/fixtures/get-test-route.js"

test("sending an invalid response logs a verbose error when using default exception middleware", async (t) => {
  const { axios, getLogs } = await getTestRoute(t, {
    globalSpec: {
      authMiddleware: {},
      beforeAuthMiddleware: [],
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

  const { status } = await axios.get("/", {
    validateStatus: () => true,
    timeout: 1000,
  })
  t.is(status, 500)
  const logs = getLogs()
  t.true(
    logs.error[0][0].message.includes(
      "Use ctx.json({...}) instead of returning an object directly"
    )
  )
})
