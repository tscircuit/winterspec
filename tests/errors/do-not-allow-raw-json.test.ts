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

const invalidPrimitiveReturns = [
  { label: "undefined", value: undefined },
  { label: "null", value: null, returnedType: "null" },
  { label: "string", value: "hello" },
  { label: "number", value: 42 },
  { label: "boolean", value: true },
  { label: "symbol", value: Symbol("invalid") },
  { label: "bigint", value: BigInt(42) },
  { label: "function", value: () => "invalid" },
]

for (const invalidReturn of invalidPrimitiveReturns) {
  test(`should throw an actionable error when responding with ${invalidReturn.label}`, async (t) => {
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
      routeFn: () => {
        return invalidReturn.value as any
      },
    })

    const { data } = await axios.get("/", {
      validateStatus: () => true,
    })

    t.true(data.error.includes("Use ctx.json({...}) or return a Response"))
    t.true(
      data.error.includes(
        `returning ${invalidReturn.returnedType ?? typeof invalidReturn.value}`
      )
    )
  })
}
