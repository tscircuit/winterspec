import test from "ava"
import { z } from "zod"
import { getTestRoute } from "tests/fixtures/get-test-route.js"
import { createWithDefaultExceptionHandling } from "src/middleware/with-default-exception-handling.js"

test("should throw an error when responding with raw JSON", async (t) => {
  const { axios, getLogs } = await getTestRoute(t, {
    globalSpec: {
      beforeAuthMiddleware: [createWithDefaultExceptionHandling()],
      authMiddleware: {},
    },
    routeSpec: {
      methods: ["POST"],
      jsonBody: z.any(),
      jsonResponse: z.any(),
    },
    routePath: "/echo",
    routeFn: (req, ctx) => {
      return ctx.json(req.jsonBody)
    },
  })

  const { status } = await axios.post(
    "/echo",
    { foo: "boo" },
    { validateStatus: () => true }
  )
  t.is(status, 500)

  const logs = getLogs()
  const loggedError = logs.error.find((log) => Boolean(log[0]))?.[0]
  t.truthy(loggedError)
  t.true(
    loggedError.includes(
      "Use ctx.json({...}) instead of returning an object directly"
    )
  )
})
