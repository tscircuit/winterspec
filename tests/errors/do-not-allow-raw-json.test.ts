import test from "ava"
import { z } from "zod"
import { getTestRoute } from "tests/fixtures/get-test-route.js"

test("should throw an error when responding with raw JSON", async (t) => {
  const { axios } = await getTestRoute(t, {
    globalSpec: {
      authMiddleware: {},
      beforeAuthMiddleware: [
        async (req, ctx, next) => {
          try {
            return await next(req, ctx)
          } catch (e: any) {
            console.error(e)
            return Response.json({ error: e.message }, { status: 500 })
          }
        },
      ],
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

  const { data } = await axios.get("/", {
    validateStatus: () => true,
  })
  t.true(
    data.error.includes(
      "Use ctx.json({...}) instead of returning an object directly"
    )
  )
})

const invalidReturnCases = [
  { name: "undefined", value: undefined },
  { name: "null", value: null },
  { name: "string", value: "not a response" },
  { name: "number", value: 42 },
  { name: "boolean", value: true },
  { name: "bigint", value: BigInt(42) },
  { name: "symbol", value: Symbol("not-a-response") },
  { name: "function", value: () => "not a response" },
]

for (const { name, value } of invalidReturnCases) {
  test(`should throw ctx.json guidance when route returns ${name}`, async (t) => {
    const { axios } = await getTestRoute(t, {
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
        jsonBody: z.any(),
        jsonResponse: z.any(),
      },
      routePath: "/",
      routeFn: () => value as any,
    })

    const { data } = await axios.get("/", {
      validateStatus: () => true,
    })
    t.true(
      data.error.includes(
        "Use ctx.json({...}) instead of returning an object directly"
      )
    )
  })
}
