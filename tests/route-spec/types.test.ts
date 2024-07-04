import test from "ava"
import { createWithWinterSpec } from "src/create-with-winter-spec.js"
import { expectTypeOf } from "expect-type"
import { WinterSpecResponse } from "src/types/web-handler.js"
import { z } from "zod"
import { Middleware } from "src/middleware/index.js"
import { getDefaultContext } from "src/types/context.js"
import { AccumulateMiddlewareChainResultOptions } from "src/middleware/types.js"

const withSessionToken: Middleware<
  {},
  { auth: { session_token: { user: "lucille" } } }
> = (req, ctx, next) => {
  ctx.auth = { ...ctx.auth, session_token: { user: "lucille" } }
  return next(req, ctx)
}

const withPat: Middleware<{}, { auth: { pat: { user: "lucille" } } }> = (
  req,
  ctx,
  next
) => {
  ctx.auth = { ...ctx.auth, pat: { user: "lucille" } }
  return next(req, ctx)
}

const withApiToken: Middleware<
  {},
  { auth: { api_token: { user: "lucille" } } }
> = (req, ctx, next) => {
  ctx.auth = { ...ctx.auth, api_token: { user: "lucille" } }
  return next(req, ctx)
}

const withName: Middleware<{}, { name: string }> = (req, ctx, next) => {
  ctx.name = "lucille"
  return next(req, ctx)
}

test.skip("auth none is always supported", () => {
  createWithWinterSpec({
    authMiddleware: {},
  })({
    auth: "none",
    methods: ["GET"],
  })
})

test.skip("auth none is optional", () => {
  createWithWinterSpec({
    authMiddleware: {},
  })({
    methods: ["GET"],
  })((req, _) => {
    expectTypeOf(req).not.toBeNever()
    return new Response()
  })
})

test.skip("auth none cannot be provided in an array", () => {
  createWithWinterSpec({
    authMiddleware: {},
  })({
    // @ts-expect-error
    auth: ["none"],
    methods: ["GET"],
  })
})

test.skip("cannot select non-existent auth methods", () => {
  const withWinterSpec = createWithWinterSpec({
    authMiddleware: {},
  })

  withWinterSpec({
    // @ts-expect-error
    auth: "session_token",
    methods: ["GET"],
  })

  withWinterSpec({
    // @ts-expect-error
    auth: ["session_token"],
    methods: ["GET"],
  })
})

test.skip("can select existing middleware", () => {
  const withWinterSpec = createWithWinterSpec({
    authMiddleware: {
      session_token: (req, ctx, next) => next(req, ctx),
    },
  })

  withWinterSpec({
    auth: "session_token",
    methods: ["GET"],
  })

  withWinterSpec({
    auth: ["session_token"],
    methods: ["GET"],
  })
})

test.skip("middleware objects are available", () => {
  const withWinterSpec = createWithWinterSpec({
    authMiddleware: {},
    beforeAuthMiddleware: [withName],
  })

  withWinterSpec({
    auth: "none",
    methods: ["GET"],
  })((req, ctx) => {
    expectTypeOf<(typeof ctx)["name"]>().toBeString()

    return new Response()
  })
})

test.skip("auth middleware objects are available as singleton", () => {
  const withWinterSpec = createWithWinterSpec({
    authMiddleware: {
      session_token: withSessionToken,
    },
  })

  withWinterSpec({
    auth: "session_token",
    methods: ["GET"],
  })((req, ctx) => {
    expectTypeOf<(typeof ctx)["auth"]>().toMatchTypeOf<{
      session_token: { user: string }
    }>()

    return new Response()
  })
})

test.skip("auth middleware objects are available as union", () => {
  const withWinterSpec = createWithWinterSpec({
    authMiddleware: {
      session_token: withSessionToken,
      pat: withPat,
      api_token: withApiToken,
    },
  })

  withWinterSpec({
    auth: ["session_token", "pat"],
    methods: ["GET"],
  })((req, ctx) => {
    expectTypeOf<(typeof ctx)["auth"]>().toMatchTypeOf<
      | {
          session_token: { user: string }
        }
      | {
          pat: { user: string }
        }
    >()

    return new Response()
  })
})

test.skip("route-local middlewares are available to request", () => {
  const withWinterSpec = createWithWinterSpec({
    authMiddleware: {},
  })

  withWinterSpec({
    auth: "none",
    methods: ["GET"],
    middleware: [withName],
  })((req, ctx) => {
    expectTypeOf<(typeof ctx)["name"]>().toBeString()

    return new Response()
  })
})

test.skip("route-local middleware with request dependencies works", () => {
  const withFoo: Middleware<{}, { foo: string }> = (req, ctx, next) => {
    ctx.foo = "bar"
    return next(req, ctx)
  }

  const withName: Middleware<{ foo: string }, { name: string }> = (
    req,
    ctx,
    next
  ) => {
    ctx.name = "lucille"
    return next(req, ctx)
  }

  const withWinterSpec = createWithWinterSpec({
    authMiddleware: {
      simple: withFoo,
    },
  })

  withWinterSpec({
    // todo: should not work with none
    auth: "simple",
    methods: ["GET"],
    middleware: [withName],
  })((req, ctx) => {
    expectTypeOf<(typeof ctx)["name"]>().toBeString()

    return new Response()
  })
})

test.skip("custom response map types are enforced", () => {
  const withWinterSpec = createWithWinterSpec({
    authMiddleware: {},
  })

  withWinterSpec({
    auth: "none",
    methods: ["GET"],
    customResponseMap: {
      "text/html": z.string(),
      "custom/response": z.number(),
    },
    // @ts-expect-error
  })(() => {
    return WinterSpecResponse.custom("not a number", "custom/response")
  })({} as any, getDefaultContext())
})

test.skip("route param types", () => {
  const withWinterSpec = createWithWinterSpec({
    authMiddleware: {},
  })

  withWinterSpec({
    auth: "none",
    methods: ["GET"],
    routeParams: z.object({ id: z.coerce.number() }),
  })((req) => {
    expectTypeOf(req.routeParams.id).toBeNumber()
    return new Response()
  })({} as any, getDefaultContext())
})

const middlewareWithInputs: Middleware<{ x: number }, { y: number }> = (
  req,
  ctx,
  next
) => next(req, ctx)

test.skip("allows middleware with inputs", () => {
  const withWinterSpec = createWithWinterSpec({
    authMiddleware: {
      test: middlewareWithInputs,
    },
  })

  withWinterSpec({
    auth: "test",
    methods: ["GET"],
    routeParams: z.object({ id: z.coerce.number() }),
  })((req, ctx) => {
    expectTypeOf(ctx.y).toBeNumber()
    return new Response()
  })({} as any, getDefaultContext())
})

test.skip("typed ctx.json()", () => {
  const withWinterSpec = createWithWinterSpec({
    authMiddleware: {
      test: middlewareWithInputs,
    },
  })

  withWinterSpec({
    auth: "test",
    methods: ["GET"],
    jsonResponse: z.object({
      id: z.number(),
    }),
    routeParams: z.object({ id: z.coerce.number() }),
  })((req, ctx) => {
    expectTypeOf(ctx.y).toBeNumber()
    return new Response()
  })({} as any, {} as any)
})

test.skip("middlewares have routeParams", () => {
  const _: Middleware = (req, ctx, next) => {
    expectTypeOf(req.routeParams).toMatchTypeOf<Record<string, unknown>>()
    return next(req, ctx)
  }
})

test.skip("middlewares have routeParams which can be typed", () => {
  const _: Middleware<{}, {}, { routeParams: { fake: string } }> = (
    req,
    ctx,
    next
  ) => {
    expectTypeOf(req.routeParams.fake).toMatchTypeOf<string>()
    return next(req, ctx)
  }
})

test.skip("urlEncodedFormData can be .refine()ed", () => {
  const withWinterSpec = createWithWinterSpec({
    authMiddleware: {
      test: middlewareWithInputs,
    },
  })

  withWinterSpec({
    auth: "test",
    methods: ["GET"],
    urlEncodedFormData: z
      .object({
        id: z.number(),
      })
      .refine((v) => v.id > 0, "id must be positive"),
  })((req) => {
    expectTypeOf(req.urlEncodedFormData.id).toBeNumber()
    return new Response()
  })({} as any, {} as any)
})

test.skip("cascading partial middlewares", () => {
  const withWinterSpec = createWithWinterSpec({
    beforeAuthMiddleware: [
      {} as unknown as Middleware<{ a: string }, { a: string }>,
      {} as unknown as Middleware<{ a?: string }, { a: string }>,
    ],
    authMiddleware: {},
  })

  withWinterSpec({
    auth: "none",
    methods: ["GET"],
    urlEncodedFormData: z
      .object({
        id: z.number(),
      })
      .refine((v) => v.id > 0, "id must be positive"),
  })((_, ctx) => {
    expectTypeOf(ctx.a).toBeString()
    return new Response("")
  })({} as any, {} as any)

  type m1 = Middleware<{ a: string }, { a: string }>
  type m2 = Middleware<{ a?: string }, { b: string }>

  type m3 = AccumulateMiddlewareChainResultOptions<[m1, m2], "intersection">
})
