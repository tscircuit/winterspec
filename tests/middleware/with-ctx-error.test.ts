import test from "ava"
import { getTestRoute } from "../fixtures/get-test-route.js"
import { withCtxError } from "../../src/middleware/with-ctx-error.js"

test("ctx.error helper creates error responses", async (t) => {
  const { axios } = await getTestRoute(t, {
    globalSpec: {
      authMiddleware: {},
      beforeAuthMiddleware: [withCtxError],
    },
    routeSpec: {
      auth: "none",
      methods: ["GET"],
    },
    routeFn: (_, ctx) => {
      return ctx.error(400, {
        error_code: "bad_request",
        message: "Invalid input",
      })
    },
    routePath: "/test",
  })

  const response = await axios.get("/test", { validateStatus: () => true })

  t.is(response.status, 400)
  t.deepEqual(response.data, {
    error: {
      error_code: "bad_request",
      message: "Invalid input",
    },
  })
})
