import { createWithWinterSpec } from "dist"
import { createWithDefaultExceptionHandling } from "dist/middleware"

export const withWinterSpec = createWithWinterSpec({
  apiName: "hello-world",
  productionServerUrl: "https://example.com",

  authMiddleware: {},
  beforeAuthMiddleware: [createWithDefaultExceptionHandling()],
})
