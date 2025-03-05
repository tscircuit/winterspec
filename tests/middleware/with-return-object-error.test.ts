import test from "ava"
import { wrapMiddlewares } from "src/create-with-winter-spec.js"
import { WinterSpecRequest, WinterSpecRouteFn } from "src/types/web-handler.js"
import { ResponseTypeToContext } from "src/types/context.js"
import { MiddlewareChain } from "src/middleware/types.js"

test("wrapMiddlewares throws error when route function returns an object directly", async (t) => {
  const middlewares: MiddlewareChain = []
  const routeFn: WinterSpecRouteFn<any, any, any> = async () => {
    return { message: "This should use ctx.json" }
  }
  const request = {} as WinterSpecRequest
  const ctx = {} as ResponseTypeToContext<Response>

  const error = await t.throwsAsync(() =>
    wrapMiddlewares(middlewares, routeFn, request, ctx)
  )
  t.is(
    error.message,
    "Return value must be a Response. Use ctx.json({...}) instead of returning an object directly."
  )
})

test("wrapMiddlewares does not throw error when route function returns a Response", async (t) => {
  const middlewares: MiddlewareChain = []
  const routeFn: WinterSpecRouteFn<any, any, any> = async () => {
    return new Response(JSON.stringify({ message: "This is correct" }), {
      status: 200,
    })
  }
  const request = {} as WinterSpecRequest
  const ctx = {} as ResponseTypeToContext<Response>

  const result = await wrapMiddlewares(middlewares, routeFn, request, ctx)
  t.true(result instanceof Response)
  t.is(result.status, 200)
})

test("wrapMiddlewares processes middlewares correctly", async (t) => {
  const middlewares: MiddlewareChain = [
    async (req, ctx, next) => {
      ctx.processed = true
      return next(req, ctx)
    },
  ]
  const routeFn: WinterSpecRouteFn<any, any, any> = async (req, ctx) => {
    return new Response(JSON.stringify({ processed: ctx.processed }), {
      status: 200,
    })
  }
  const request = {} as WinterSpecRequest
  const ctx = { processed: false } as ResponseTypeToContext<Response> & {
    processed: boolean
  }

  const result = await wrapMiddlewares(middlewares, routeFn, request, ctx)
  const json = await result.json()
  t.true(json.processed)
  t.is(result.status, 200)
})