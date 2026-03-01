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
      "Use ctx.json(...) instead of returning an object directly"
    )
  )
})

test("should log a clear ctx.json instruction for raw object responses", async (t) => {
  const { axios, getLogs } = await getTestRoute(t, {
    globalSpec: {
      authMiddleware: {},
    },
    routeSpec: {
      methods: ["GET"],
      jsonBody: z.any(),
      jsonResponse: z.any(),
    },
    routePath: "/",
    routeFn: () => {
      return { foo: "bar" } as any
    },
  })

  const response = await axios.get("/", { validateStatus: () => true })
  t.is(response.status, 500)

  const logs = getLogs()
  const errorLogText = logs.error
    .flat()
    .map((entry) => (entry instanceof Error ? entry.message : String(entry)))
    .join("\n")

  t.true(errorLogText.includes("Use ctx.json(...) instead of returning an object directly"))
})
