import test from "ava"
import { getTestRoute } from "../fixtures/get-test-route.js"
import { withRequestLogging } from "src/middleware/with-request-logging.js"

test("request logging middleware logs requests and responses", async (t) => {
  const { axios, getLogs } = await getTestRoute(t, {
    globalSpec: {
      authMiddleware: {},
      beforeAuthMiddleware: [withRequestLogging],
    },
    routeSpec: {
      auth: "none",
      methods: ["GET"],
    },
    routeFn: () => {
      return Response.json({ message: "success" })
    },
    routePath: "/test",
  })

  await axios.get("/test")

  const logs = getLogs()

  const successLog = logs.info[0]?.[0] ?? ""
  t.true(successLog.includes("200"))
  t.true(successLog.includes('{"message":"success"}'))
})

test("request logging middleware logs errors", async (t) => {
  const { axios, getLogs } = await getTestRoute(t, {
    globalSpec: {
      authMiddleware: {},
      beforeAuthMiddleware: [withRequestLogging],
    },
    routeSpec: {
      auth: "none",
      methods: ["GET"],
    },
    routeFn: () => {
      throw new Error("Test error")
    },
    routePath: "/test",
  })

  await axios.get("/test", { validateStatus: () => true })

  const logs = getLogs()

  const errorInfoLog = logs.info[0]?.[0] ?? ""
  t.true(errorInfoLog.includes("ERROR"))
  t.true(errorInfoLog.includes("Test error"))

  const errorLog = logs.error[0]?.[0]
  t.true(errorLog instanceof Error)
  t.is(errorLog.message, "Test error")
})
