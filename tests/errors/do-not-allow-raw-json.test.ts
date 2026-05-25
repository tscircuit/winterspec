import test, { type ExecutionContext } from "ava"
import { z } from "zod"
import { getTestRoute } from "tests/fixtures/get-test-route.js"
import { RAW_RESPONSE_OBJECT_ERROR_MESSAGE } from "src/middleware/with-response-object-check.js"
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

const assertInvalidRawReturnError = (t: ExecutionContext, error: string) => {
  t.true(error.includes(RAW_RESPONSE_OBJECT_ERROR_MESSAGE))
}

test("should throw an error when responding with raw JSON", async (t) => {
  const error = await getInvalidResponseError(t, () => {
    return { foo: "bar" } as any
  })

  assertInvalidRawReturnError(t, error)
})

for (const [label, value] of [
  ["string", "plain text"],
  ["number", 200],
  ["boolean", true],
  ["bigint", 200n],
  ["symbol", Symbol("raw")],
  ["function", () => "raw"],
] as const) {
  test(`should throw an error when responding with raw ${label}`, async (t) => {
    const error = await getInvalidResponseError(t, () => {
      return value as any
    })

    assertInvalidRawReturnError(t, error)
  })
}

test("should throw an error when responding with null", async (t) => {
  const error = await getInvalidResponseError(t, () => {
    return null as any
  })

  assertInvalidRawReturnError(t, error)
})

test("should throw an error when responding with undefined", async (t) => {
  const error = await getInvalidResponseError(t, () => {
    return undefined as any
  })

  assertInvalidRawReturnError(t, error)
})

test("should allow custom serializable response objects", async (t) => {
  class PlainTextResponse implements SerializableToResponse {
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
    routeFn: () => new PlainTextResponse() as any,
  })

  const response = await axios.get("/", {
    responseType: "text",
  })

  t.is(response.status, 200)
  t.is(response.data, "custom response")
})
