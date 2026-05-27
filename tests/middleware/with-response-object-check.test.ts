import test from "ava"
import { z } from "zod"
import { getTestRoute } from "../fixtures/get-test-route.js"
import { createWithDefaultExceptionHandling } from "../../src/middleware/with-default-exception-handling.js"

test("returning a plain object with jsonResponse validation under default exception handling", async (t) => {
  const { axios } = await getTestRoute(t, {
    globalSpec: {
      authMiddleware: {},
      beforeAuthMiddleware: [createWithDefaultExceptionHandling()],
    },
    routeSpec: {
      auth: "none",
      methods: ["GET"],
      jsonResponse: z.object({
        ok: z.boolean(),
        message: z.string(),
      }),
    },
    routeFn: (_, ctx) => {
      // Accidental plain object return
      return { ok: true, message: "hello" } as any
    },
    routePath: "/test-plain-object",
  })

  const response = await axios.get("/test-plain-object", {
    validateStatus: () => true,
  })

  console.log("Response status:", response.status)
  console.log("Response data:", response.data)

  t.is(response.status, 500)
  t.is(
    response.data.message,
    "Use ctx.json({...}) instead of returning an object directly."
  )
})
