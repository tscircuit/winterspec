import test from "ava"
import { GlobalSpec } from "src/types/global-spec.js"
import { WinterSpecResponse } from "src/types/web-handler.js"
import { getTestRoute } from "tests/fixtures/get-test-route.js"
import { z } from "zod"
import formurlencoded from "form-urlencoded"

const defaultSpecs = {
  globalSpec: {
    authMiddleware: {},
    beforeAuthMiddleware: [
      async (req, ctx, next) => {
        try {
          return await next(req, ctx)
        } catch (e: any) {
          console.log(e)
          return Response.json(
            { error_type: e.constructor.name },
            { status: 500 }
          )
        }
      },
    ],
  } satisfies GlobalSpec,
} as const

test("validates json response success", async (t) => {
  const { axios } = await getTestRoute(t, {
    ...defaultSpecs,
    routeSpec: {
      auth: "none",
      methods: ["POST"],
      jsonBody: z.object({
        name: z.string(),
      }),
      jsonResponse: z.object({
        message: z.string(),
      }),
    },
    routeFn: (req) => {
      return WinterSpecResponse.json({
        message: `hello, ${req.jsonBody.name}!`,
      })
    },
    routePath: "/hello",
  })

  const { data, status } = await axios.post("/hello", { name: "alexandra" })

  t.is(status, 200)
  t.is(data.message, "hello, alexandra!")
})

test("validates json response failure", async (t) => {
  const { axios } = await getTestRoute(t, {
    ...defaultSpecs,
    routeSpec: {
      auth: "none",
      methods: ["POST"],
      jsonBody: z.object({
        name: z.string(),
      }),
      jsonResponse: z.object({
        message: z.string().max(3),
      }),
    },
    routeFn: (req) => {
      return WinterSpecResponse.json({
        message: `hello, ${req.jsonBody.name}!`,
      })
    },
    routePath: "/hello",
  })

  const { data, status } = await axios.post(
    "/hello",
    { name: "alexandra" },
    { validateStatus: () => true }
  )

  t.is(status, 500)
  t.is(data.error_type, "ResponseValidationError")
})

test("validates form data response success", async (t) => {
  const { axios } = await getTestRoute(t, {
    ...defaultSpecs,
    routeSpec: {
      auth: "none",
      methods: ["POST"],
      multiPartFormData: z.object({
        name: z.string(),
      }),
      jsonResponse: z.object({
        message: z.string(),
      }),
    },
    routeFn: (req) => {
      return WinterSpecResponse.json({
        message: `hello, ${req.multiPartFormData.name}!`,
      })
    },
    routePath: "/hello",
  })

  const formData = new FormData()

  formData.set("name", "alexandra")

  const { data, status } = await axios.post("/hello", formData, {
    validateStatus: () => true,
  })

  t.is(status, 200)
  t.is(data.message, "hello, alexandra!")
})

test("validates form data response failure", async (t) => {
  const { axios } = await getTestRoute(t, {
    ...defaultSpecs,
    routeSpec: {
      auth: "none",
      methods: ["POST"],
      multiPartFormData: z.object({
        name: z.number(),
      }),
      jsonResponse: z.object({
        message: z.string(),
      }),
    },
    routeFn: (req) => {
      return WinterSpecResponse.json({
        message: `hello, ${req.multiPartFormData.name}!`,
      })
    },
    routePath: "/hello",
  })

  const formData = new FormData()

  formData.set("name", "alexandra")

  const { data, status } = await axios.post("/hello", formData, {
    validateStatus: () => true,
  })

  t.is(status, 500)
  t.is(data.error_type, "InputValidationError")
})

test("validates url encoded response success", async (t) => {
  const { axios } = await getTestRoute(t, {
    ...defaultSpecs,
    routeSpec: {
      auth: "none",
      methods: ["POST"],
      urlEncodedFormData: z.object({
        name: z.string(),
      }),
      jsonResponse: z.object({
        message: z.string(),
      }),
    },
    routeFn: (req) => {
      return WinterSpecResponse.json({
        message: `hello, ${req.urlEncodedFormData.name}!`,
      })
    },
    routePath: "/hello",
  })

  const formData = new FormData()

  formData.set("name", "alexandra")

  const { data, status } = await axios.post(
    "/hello",
    formurlencoded({ name: "alexandra" }),
    {
      validateStatus: () => true,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  )

  t.is(status, 200)
  t.is(data.message, "hello, alexandra!")
})

test("validates url encoded response failure", async (t) => {
  const { axios } = await getTestRoute(t, {
    ...defaultSpecs,
    routeSpec: {
      auth: "none",
      methods: ["POST"],
      urlEncodedFormData: z.object({
        name: z.number(),
      }),
      jsonResponse: z.object({
        message: z.string(),
      }),
    },
    routeFn: (req) => {
      return WinterSpecResponse.json({
        message: `hello, ${req.urlEncodedFormData.name}!`,
      })
    },
    routePath: "/hello",
  })

  const formData = new FormData()

  formData.set("name", "alexandra")

  const { data, status } = await axios.post(
    "/hello",
    formurlencoded({ name: "alexandra" }),
    {
      validateStatus: () => true,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  )

  t.is(status, 500)
  t.is(data.error_type, "InputValidationError")
})

test("commonParams supports json and query params", async (t) => {
  const { axios } = await getTestRoute(t, {
    ...defaultSpecs,
    routeSpec: {
      auth: "none",
      methods: ["POST"],
      commonParams: z.object({
        first_name: z.string(),
        last_name: z.string(),
      }),
      jsonResponse: z.object({
        message: z.string(),
      }),
    },
    routeFn: (req) => {
      return WinterSpecResponse.json({
        message: `hello, ${req.commonParams.first_name} ${req.commonParams.last_name}!`,
      })
    },
    routePath: "/hello",
  })

  const formData = new FormData()

  formData.set("name", "alexandra")

  const { data, status } = await axios.post(
    "/hello",
    {
      first_name: "John",
    },
    {
      params: {
        last_name: "Doe",
      },
      validateStatus: () => true,
    }
  )

  t.log(data)

  t.is(status, 200)
  t.is(data.message, "hello, John Doe!")
})

test("validate query params success", async (t) => {
  const { axios } = await getTestRoute(t, {
    ...defaultSpecs,
    routeSpec: {
      auth: "none",
      methods: ["GET"],
      queryParams: z.object({
        name: z.string(),
      }),
      jsonResponse: z.object({
        message: z.string(),
      }),
    },
    routeFn: (req) => {
      return WinterSpecResponse.json({
        message: `hello, ${req.query.name}!`,
      })
    },
    routePath: "/hello",
  })

  const formData = new FormData()

  formData.set("name", "alexandra")

  const { data, status } = await axios.get("/hello", {
    params: {
      name: "jane",
    },
    validateStatus: () => true,
  })

  t.is(status, 200)
  t.is(data.message, "hello, jane!")
})

test("validate query params failure", async (t) => {
  const { axios } = await getTestRoute(t, {
    ...defaultSpecs,
    routeSpec: {
      auth: "none",
      methods: ["GET"],
      queryParams: z.object({
        name: z.number(),
      }),
      jsonResponse: z.object({
        message: z.string(),
      }),
    },
    routeFn: (req) => {
      return WinterSpecResponse.json({
        message: `hello, ${req.query.name}!`,
      })
    },
    routePath: "/hello",
  })

  const formData = new FormData()

  formData.set("name", "alexandra")

  const { data, status } = await axios.get("/hello", {
    params: {
      name: "jane",
    },
    validateStatus: () => true,
  })

  t.is(status, 500)
  t.is(data.error_type, "InputValidationError")
})

test("validate route params", async (t) => {
  const { axios } = await getTestRoute(t, {
    ...defaultSpecs,
    routeSpec: {
      auth: "none",
      methods: ["GET"],
      routeParams: z.object({
        world: z.coerce.number(),
      }),
      jsonResponse: z.object({
        value: z.number(),
      }),
    },
    routeFn: (req) => {
      return WinterSpecResponse.json({
        value: req.routeParams.world,
      })
    },
    routePath: "/hello/[world]",
  })

  const { data, status } = await axios.get("/hello/4", {
    validateStatus: () => true,
  })

  t.is(status, 200)
  t.is(data.value, 4)
})

test("allows getting json", async (t) => {
  const { axios } = await getTestRoute(t, {
    ...defaultSpecs,
    routeSpec: {
      auth: "none",
      methods: ["POST"],
      jsonBody: z.object({
        hello: z.string(),
      }),
      jsonResponse: z.object({
        hello: z.string(),
      }),
    },
    routeFn: async (req) => {
      return WinterSpecResponse.json(await req.json())
    },
    routePath: "/hello/world",
  })

  const { data, status } = await axios.post(
    "/hello/world",
    { hello: "world" },
    {
      validateStatus: () => true,
    }
  )

  t.is(status, 200)
  t.is(data.hello, "world")
})

test("doesn't throw when body is optional", async (t) => {
  const { axios } = await getTestRoute(t, {
    ...defaultSpecs,
    routeSpec: {
      auth: "none",
      methods: ["GET", "POST"],
      jsonBody: z
        .object({
          hello: z.string(),
        })
        .optional(),
      jsonResponse: z.object({
        hello: z.string(),
      }),
    },
    routeFn: async (req, ctx) => {
      if (req.method === "GET") {
        return ctx.json({ hello: "world" })
      }

      return ctx.json({ hello: req.jsonBody?.hello ?? "world" })
    },
    routePath: "/hello/world",
  })

  // GET without body works
  {
    const { data, status } = await axios.get("/hello/world", {
      validateStatus: () => true,
    })

    t.is(status, 200)
    t.is(data.hello, "world")
  }

  // POST with body works
  {
    const { data, status } = await axios.post(
      "/hello/world",
      {
        hello: "seam",
      },
      {
        validateStatus: () => true,
      }
    )

    t.is(status, 200)
    t.is(data.hello, "seam")
  }
})
