import test from "ava"
import { z } from "zod"
import { getTestRoute } from "tests/fixtures/get-test-route.js"
import { RAW_OBJECT_RESPONSE_ERROR_MESSAGE } from "src/middleware/with-response-object-check.js"

const getRouteThatReportsHandlerErrors = async (t: any, routeFn: any) =>
  getTestRoute(t, {
    globalSpec: {
      authMiddleware: {},
      beforeAuthMiddleware: [
        async (req, ctx, next) => {
          try {
            return await next(req, ctx)
          } catch (e: any) {
            return Response.json({ error: e.message }, { status: 500 })
          }
        },
      ],
    },
    routeSpec: {
      methods: ["GET"],
      jsonResponse: z.any(),
    },
    routePath: "/",
    routeFn,
  })

test("handler returning ctx.json(...) still works", async (t) => {
  const { axios } = await getTestRoute(t, {
    globalSpec: {
      authMiddleware: {},
    },
    routeSpec: {
      methods: ["GET"],
      jsonResponse: z.any(),
    },
    routePath: "/",
    routeFn: (req, ctx) => {
      return ctx.json({ foo: "bar" })
    },
  })

  const response = await axios.get("/")

  t.is(response.status, 200)
  t.deepEqual(response.data, { foo: "bar" })
})

test("handler returning Response still works", async (t) => {
  const { axios } = await getTestRoute(t, {
    globalSpec: {
      authMiddleware: {},
    },
    routeSpec: {
      methods: ["GET"],
      jsonResponse: z.any(),
    },
    routePath: "/",
    routeFn: () => {
      return Response.json({ foo: "bar" })
    },
  })

  const response = await axios.get("/")

  t.is(response.status, 200)
  t.deepEqual(response.data, { foo: "bar" })
})

test("handler returning a raw object throws a clear ctx.json error", async (t) => {
  const { axios } = await getRouteThatReportsHandlerErrors(t, () => {
    return { foo: "bar" } as any
  })

  const { data, status } = await axios.get("/", {
    validateStatus: () => true,
  })

  t.is(status, 500)
  t.is(data.error, RAW_OBJECT_RESPONSE_ERROR_MESSAGE)
})

test("handler returning a raw array throws a clear ctx.json error", async (t) => {
  const { axios } = await getRouteThatReportsHandlerErrors(t, () => {
    return ["foo"] as any
  })

  const { data, status } = await axios.get("/", {
    validateStatus: () => true,
  })

  t.is(status, 500)
  t.is(data.error, RAW_OBJECT_RESPONSE_ERROR_MESSAGE)
})
