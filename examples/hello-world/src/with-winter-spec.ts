import { createWithWinterSpec } from "dist"
import { withDefaultExceptionHandling } from "dist/middleware"

export const withWinterSpec = createWithWinterSpec({
  apiName: "hello-world",
  productionServerUrl: "https://example.com",

  authMiddleware: {},
  beforeAuthMiddleware: [withDefaultExceptionHandling],
})
