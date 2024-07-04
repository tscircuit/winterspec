import test from "ava"
import { WinterSpecResponse } from "src/types/web-handler.js"
import { getTestRoute } from "../fixtures/get-test-route.js"
import { z } from "zod"
import { GlobalSpec } from "src/types/global-spec.js"

const defaultSpecs = {
  globalSpec: {
    authMiddleware: {},
    beforeAuthMiddleware: [
      async (req, ctx, next) => {
        try {
          return await next(req, ctx)
        } catch (e: any) {
          return WinterSpecResponse.json(
            { error_type: e.constructor.name },
            { status: 500 }
          )
        }
      },
    ],
  } satisfies GlobalSpec,
} as const

test("serializes json basic", async (t) => {
  const { axios } = await getTestRoute(t, {
    ...defaultSpecs,
    routeSpec: {
      auth: "none",
      methods: ["GET"],
      jsonResponse: z.object({
        hello: z.string(),
      }),
    },
    routeFn: () => {
      return WinterSpecResponse.json({
        hello: "world",
      })
    },
    routePath: "/hello",
  })
  const response = await axios.get("/hello")

  t.is(response.status, 200)
  t.deepEqual(response.data, { hello: "world" })
})

test("serializes json with status", async (t) => {
  const { axios } = await getTestRoute(t, {
    ...defaultSpecs,
    routeSpec: {
      auth: "none",
      methods: ["GET"],
      jsonResponse: z.object({
        hello: z.string(),
      }),
    },
    routeFn: () => {
      return WinterSpecResponse.json({
        hello: "world",
      }).status(201)
    },
    routePath: "/hello",
  })
  const response = await axios.get("/hello")

  t.is(response.status, 201)
  t.deepEqual(response.data, { hello: "world" })
})

test("validates json response", async (t) => {
  const { axios } = await getTestRoute(t, {
    ...defaultSpecs,
    routeSpec: {
      auth: "none",
      methods: ["GET"],
      jsonResponse: z.object({
        hello: z.string().max(3),
      }),
    },
    routeFn: () => {
      return WinterSpecResponse.json({
        hello: "world",
      })
    },
    routePath: "/hello",
  })
  const response = await axios.get("/hello", { validateStatus: () => true })

  t.is(response.status, 500)
  t.like(response.data, { error_type: "ResponseValidationError" })
})

test("doesnt validates json response if response validation disabled", async (t) => {
  const { axios } = await getTestRoute(t, {
    globalSpec: {
      ...defaultSpecs.globalSpec,
      shouldValidateResponses: false,
    },
    routeSpec: {
      auth: "none",
      methods: ["GET"],
      jsonResponse: z.object({
        hello: z.string().max(3),
      }),
    },
    routeFn: () => {
      return WinterSpecResponse.json({
        hello: "world",
      })
    },
    routePath: "/hello",
  })

  const response = await axios.get("/hello", {
    validateStatus: () => true,
  })

  t.is(response.status, 200)
  t.deepEqual(response.data, { hello: "world" })
})

test("serializes form data", async (t) => {
  const { axios } = await getTestRoute(t, {
    ...defaultSpecs,
    routeSpec: {
      auth: "none",
      methods: ["GET"],
      multipartFormDataResponse: z.object({
        hello: z.string(),
      }),
    },
    routeFn: () => {
      return WinterSpecResponse.multipartFormData({
        hello: "world",
      })
    },
    routePath: "/hello",
  })

  const response = await axios.get("/hello")

  t.is(response.status, 200)

  const formData = response.data

  // @ts-expect-error - request.headers.get is bugged for some reason :/
  t.is(response.headers.get?.("content-type"), "multipart/form-data")

  t.regex(formData, /name="hello"/)
  t.regex(formData, /world/)
})

test("can set headers, status", async (t) => {
  const { axios } = await getTestRoute(t, {
    ...defaultSpecs,
    routeSpec: {
      auth: "none",
      methods: ["GET"],
      multipartFormDataResponse: z.object({
        hello: z.string(),
      }),
    },
    routeFn: () => {
      return WinterSpecResponse.json({
        hello: "world",
      })
        .status(201)
        .header("x-hello", "world")
        .headers({
          "x-hello-2": "world2",
          "x-hello": "world2",
        })
    },
    routePath: "/hello",
  })

  const response = await axios.get("/hello")

  t.is(response.status, 201)
  // @ts-expect-error
  t.is(response.headers.get("content-type"), "application/json")
  // @ts-expect-error
  t.is(response.headers.get("x-hello"), "world2")
  // @ts-expect-error
  t.is(response.headers.get("x-hello-2"), "world2")

  t.deepEqual(response.data, { hello: "world" })
})

test("can set headers, status w/ context", async (t) => {
  const { axios } = await getTestRoute(t, {
    ...defaultSpecs,
    routeSpec: {
      auth: "none",
      methods: ["GET"],
      multipartFormDataResponse: z.object({
        hello: z.string(),
      }),
    },
    routeFn: (_, ctx) => {
      return ctx
        .json({
          hello: "world",
        })
        .status(201)
        .header("x-hello", "world")
        .headers({
          "x-hello-2": "world2",
          "x-hello": "world2",
        })
    },
    routePath: "/hello",
  })

  const response = await axios.get("/hello")

  t.is(response.status, 201)
  // @ts-expect-error
  t.is(response.headers.get("content-type"), "application/json")
  // @ts-expect-error
  t.is(response.headers.get("x-hello"), "world2")
  // @ts-expect-error
  t.is(response.headers.get("x-hello-2"), "world2")

  t.deepEqual(response.data, { hello: "world" })
})

test("can return custom response types", async (t) => {
  const { axios } = await getTestRoute(t, {
    ...defaultSpecs,
    routeSpec: {
      auth: "none",
      methods: ["GET"],
      customResponseMap: {
        "text/html": z.string(),
      },
    },
    routeFn: () => {
      return WinterSpecResponse.custom("<h1>Hello, world</h1>", "text/html")
    },
    routePath: "/hello",
  })

  const response = await axios.get("/hello")

  t.is(response.status, 200)
  // @ts-expect-error
  t.is(response.headers.get("content-type"), "text/html")
  t.is(response.data, "<h1>Hello, world</h1>")
})

test("can have multiple custom response types", async (t) => {
  const { axios } = await getTestRoute(t, {
    ...defaultSpecs,
    routeSpec: {
      auth: "none",
      methods: ["GET"],
      customResponseMap: {
        "text/html": z.string(),
        "custom/response": z.number(),
      },
    },
    routeFn: () => {
      return WinterSpecResponse.custom(4, "custom/response")
    },
    routePath: "/hello",
  })

  const response = await axios.get("/hello")

  t.is(response.status, 200)
  // @ts-expect-error
  t.is(response.headers.get("content-type"), "custom/response")
  t.is(response.data, 4)
})
