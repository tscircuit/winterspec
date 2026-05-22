import test, { type ExecutionContext } from "ava"
import { z } from "zod"
import { getTestRoute } from "tests/fixtures/get-test-route.js"
import type {
  SerializableToResponse,
  WinterSpecRouteFn,
} from "src/types/web-handler.js"

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

test("should allow custom serializable response objects", async (t) => {
  class CustomSerializableResponse implements SerializableToResponse {
    statusCode() {
      return 200
    }

    serializeToResponse() {
      return new Response("custom response", {
        headers: { "content-type": "text/plain" },
      })
    }
  }

  const { axios } = await getTestRoute(t, {
    globalSpec: {
      authMiddleware: {},
    },
    routeSpec: {
      methods: ["GET"],
      jsonResponse: z.object({
        message: z.string(),
      }),
    },
    routePath: "/",
    routeFn: () => new CustomSerializableResponse() as any,
  })

  const res = await axios.get("/", {
    responseType: "text",
  })

  t.is(res.status, 200)
  t.is(res.data, "custom response")
})
