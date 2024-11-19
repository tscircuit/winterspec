import test from "ava"
import { getTestRoute } from "../fixtures/get-test-route.js"
import { withCors } from "../../src/middleware/with-cors.js"

test("CORS middleware adds correct headers to response", async (t) => {
  const { axios } = await getTestRoute(t, {
    globalSpec: {
      authMiddleware: {},
      beforeAuthMiddleware: [withCors],
    },
    routeSpec: {
      auth: "none",
      methods: ["GET"],
    },
    routeFn: () => {
      return new Response("ok")
    },
    routePath: "/test",
  })

  const response = await axios.get("/test", {
    headers: {
      origin: "http://example.com",
    },
  })

  t.is(response.headers["access-control-allow-origin"], "http://example.com")
  t.is(response.headers["access-control-allow-credentials"], "true")
  t.truthy(response.headers["access-control-allow-methods"])
  t.truthy(response.headers["access-control-allow-headers"])
})

test("CORS middleware handles OPTIONS requests", async (t) => {
  const { axios } = await getTestRoute(t, {
    globalSpec: {
      authMiddleware: {},
      beforeAuthMiddleware: [withCors],
    },
    routeSpec: {
      auth: "none",
      methods: ["GET"],
    },
    routeFn: () => {
      return new Response("ok")
    },
    routePath: "/test",
  })

  const response = await axios.options("/test", {
    headers: {
      origin: "http://example.com",
    },
  })

  t.is(response.status, 200)
  t.is(response.headers["access-control-allow-origin"], "http://example.com")
  t.is(response.headers["access-control-max-age"], "86400")
})
