import test from "ava"
import { z } from "zod"
import { getTestRoute } from "../fixtures/get-test-route.js"

test("plain-object-return: GET route returning plain object is serialized as JSON", async (t) => {
  const { axios } = await getTestRoute(t, {
    globalSpec: {
      apiName: "hello-world",
      productionServerUrl: "https://example.com",
      authMiddleware: {},
      beforeAuthMiddleware: [],
    },
    routeSpec: {
      auth: "none",
      methods: ["GET"],
    },
    routePath: "/health",
    routeFn: async (_req: any): Promise<any> => {
      return { ok: true }
    },
  })

  const { data, status } = await axios.get("/health")
  t.is(status, 200)
  t.is(data.ok, true)
})

test("plain-object-return: POST route returning plain object with multiple fields", async (t) => {
  const { axios } = await getTestRoute(t, {
    globalSpec: {
      apiName: "hello-world",
      productionServerUrl: "https://example.com",
      authMiddleware: {},
      beforeAuthMiddleware: [],
    },
    routeSpec: {
      auth: "none",
      methods: ["POST"],
      jsonResponse: z.object({
        message: z.string(),
        count: z.number(),
      }),
    },
    routePath: "/items",
    routeFn: async (_req: any): Promise<any> => {
      return { message: "created", count: 42 }
    },
  })

  const { data, status } = await axios.post("/items")
  t.is(status, 200)
  t.is(data.message, "created")
  t.is(data.count, 42)
})

test("plain-object-return: plain object validates against jsonResponse schema", async (t) => {
  const { axios } = await getTestRoute(t, {
    globalSpec: {
      apiName: "hello-world",
      productionServerUrl: "https://example.com",
      authMiddleware: {},
      beforeAuthMiddleware: [],
    },
    routeSpec: {
      auth: "none",
      methods: ["GET"],
      jsonResponse: z.object({ ok: z.boolean() }),
    },
    routePath: "/check",
    routeFn: async (_req: any): Promise<any> => {
      return { ok: true }
    },
  })

  const { data } = await axios.get("/check")
  t.is(data.ok, true)
})
