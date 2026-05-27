import test from "ava"
import { z } from "zod"
import { createWithWinterSpec } from "src/create-with-winter-spec.js"
import { createWinterSpecFromRouteMap } from "src/serve/create-winter-spec-from-route-map.js"
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

test("should throw an error when adapter middleware responds with raw JSON", async (t) => {
  const withRouteSpec = createWithWinterSpec({
    authMiddleware: {},
  })
  const winterSpec = createWinterSpecFromRouteMap({
    "/": withRouteSpec({
      methods: ["GET"],
      auth: "none",
      jsonResponse: z.any(),
    })((req, ctx) => {
      return ctx.json({ ok: true })
    }),
  })
  const makeRequest = (request: Request) =>
    winterSpec.makeRequest(request, {
      middleware: [
        async () => {
          return { foo: "bar" } as any
        },
      ],
    })

  const error = await t.throwsAsync(
    makeRequest(new Request("https://example.com/"))
  )
  t.true(
    error?.message.includes(
      "Use ctx.json({...}) instead of returning an object directly."
    )
  )
})

test("should serialize ctx.json returned by adapter middleware", async (t) => {
  const withRouteSpec = createWithWinterSpec({
    authMiddleware: {},
  })
  const winterSpec = createWinterSpecFromRouteMap({
    "/": withRouteSpec({
      methods: ["GET"],
      auth: "none",
      jsonResponse: z.any(),
    })((req, ctx) => {
      return ctx.json({ ok: true })
    }),
  })
  const response = await winterSpec.makeRequest(
    new Request("https://example.com/"),
    {
      middleware: [
        async (_req, ctx: any) => {
          return ctx.json({ intercepted: true })
        },
      ],
    }
  )
  t.true(response instanceof Response)
  t.is(response.status, 200)
  t.deepEqual(await response.json(), { intercepted: true })
})

test("should throw a helpful error when adapter middleware returns undefined", async (t) => {
  const withRouteSpec = createWithWinterSpec({
    authMiddleware: {},
  })
  const winterSpec = createWinterSpecFromRouteMap({
    "/": withRouteSpec({
      methods: ["GET"],
      auth: "none",
      jsonResponse: z.any(),
    })((req, ctx) => {
      return ctx.json({ ok: true })
    }),
  })

  const error = await t.throwsAsync(
    winterSpec.makeRequest(new Request("https://example.com/"), {
      middleware: [
        async () => {
          return undefined as any
        },
      ],
    })
  )
  t.true(
    error?.message.includes(
      "WinterSpec handlers must return a Response or ctx.json(...)."
    )
  )
})

test("should throw an error when handle404 responds with raw JSON", async (t) => {
  const withRouteSpec = createWithWinterSpec({
    authMiddleware: {},
  })
  const winterSpec = createWinterSpecFromRouteMap(
    {
      "/": withRouteSpec({
        methods: ["GET"],
        auth: "none",
      })(() => {
        return new Response("ok")
      }),
    },
    {
      handle404: () => {
        return { error: "not found" } as any
      },
    }
  )

  const error = await t.throwsAsync(
    winterSpec.makeRequest(new Request("https://example.com/missing"))
  )
  t.true(
    error?.message.includes(
      "Use ctx.json({...}) instead of returning an object directly."
    )
  )
})

test("should serialize ctx.json returned by handle404", async (t) => {
  const withRouteSpec = createWithWinterSpec({
    authMiddleware: {},
  })
  const winterSpec = createWinterSpecFromRouteMap(
    {
      "/": withRouteSpec({
        methods: ["GET"],
        auth: "none",
      })(() => {
        return new Response("ok")
      }),
    },
    {
      handle404: ((_req: any, ctx: any) => {
        return ctx.json({ error: "not found" })
      }) as any,
    }
  )

  const response = await winterSpec.makeRequest(
    new Request("https://example.com/missing")
  )
  t.true(response instanceof Response)
  t.is(response.status, 200)
  t.deepEqual(await response.json(), { error: "not found" })
})

test("should throw a helpful error when handle404 returns a primitive", async (t) => {
  const withRouteSpec = createWithWinterSpec({
    authMiddleware: {},
  })
  const winterSpec = createWinterSpecFromRouteMap(
    {
      "/": withRouteSpec({
        methods: ["GET"],
        auth: "none",
      })(() => {
        return new Response("ok")
      }),
    },
    {
      handle404: (() => {
        return "not found"
      }) as any,
    }
  )

  const error = await t.throwsAsync(
    winterSpec.makeRequest(new Request("https://example.com/missing"))
  )
  t.true(
    error?.message.includes(
      "WinterSpec handlers must return a Response or ctx.json(...)."
    )
  )
})
