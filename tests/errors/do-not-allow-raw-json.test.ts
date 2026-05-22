import test, { type ExecutionContext } from "ava"
import { z } from "zod"
import { getTestRoute } from "tests/fixtures/get-test-route.js"
import type { WinterSpecRouteFn } from "src/types/web-handler.js"

const getInvalidResponseError = async (
  t: ExecutionContext,
  routeFn: WinterSpecRouteFn<any, any, any>
) => {
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
    routeFn,
  })

  const { data } = await axios.get("/", {
    validateStatus: () => true,
  })

  return data.error
}

test("should throw an error when responding with raw JSON", async (t) => {
  const error = await getInvalidResponseError(t, () => {
    return { foo: "bar" } as any
  })

  t.true(
    error.includes(
      "Use ctx.json({...}) instead of returning an object directly"
    )
  )
})

for (const [name, value] of [
  ["string", "hello"],
  ["number", 42],
  ["boolean", true],
] as const) {
  test(`should throw an error when responding with a raw ${name}`, async (t) => {
    const error = await getInvalidResponseError(t, () => {
      return value as any
    })

    t.true(
      error.includes(
        "Use ctx.json({...}) instead of returning an object directly"
      )
    )
  })
}

test("should throw an error when responding with a raw bigint", async (t) => {
  const error = await getInvalidResponseError(t, () => {
    return 42n as any
  })

  t.true(
    error.includes(
      "Use ctx.json({...}) instead of returning an object directly"
    )
  )
})
