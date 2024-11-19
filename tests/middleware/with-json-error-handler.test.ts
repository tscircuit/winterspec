import test from "ava"
import { getTestRoute } from "../fixtures/get-test-route.js"
import { withJsonErrorHandler } from "../../src/middleware/with-json-error-handler.js"

test("json error handler formats errors as JSON", async (t) => {
  const { axios } = await getTestRoute(t, {
    globalSpec: {
      authMiddleware: {},
      beforeAuthMiddleware: [withJsonErrorHandler],
    },
    routeSpec: {
      auth: "none",
      methods: ["GET"],
    },
    routeFn: () => {
      const error = new Error("Test error")
      ;(error as any).error_code = "test_error"
      ;(error as any).status = 400
      throw error
    },
    routePath: "/test",
  })

  const response = await axios.get("/test", { validateStatus: () => true })

  t.is(response.status, 400)
  t.deepEqual(response.data, {
    ok: false,
    error: {
      message: "Test error",
      error_code: "test_error",
    },
  })
})

test("json error handler uses default status and error code", async (t) => {
  const { axios } = await getTestRoute(t, {
    globalSpec: {
      authMiddleware: {},
      beforeAuthMiddleware: [withJsonErrorHandler],
    },
    routeSpec: {
      auth: "none",
      methods: ["GET"],
    },
    routeFn: () => {
      throw new Error("Test error")
    },
    routePath: "/test",
  })

  const response = await axios.get("/test", { validateStatus: () => true })

  t.is(response.status, 500)
  t.deepEqual(response.data, {
    ok: false,
    error: {
      message: "Test error",
      error_code: "internal_server_error",
    },
  })
})

test("json error handler passes through Response errors", async (t) => {
  const { axios } = await getTestRoute(t, {
    globalSpec: {
      authMiddleware: {},
      beforeAuthMiddleware: [withJsonErrorHandler],
    },
    routeSpec: {
      auth: "none",
      methods: ["GET"],
    },
    routeFn: () => {
      throw new Response("Custom error", { status: 418 })
    },
    routePath: "/test",
  })

  const response = await axios.get("/test", { validateStatus: () => true })

  t.is(response.status, 418)
  t.is(response.data, "Custom error")
})
