import { createWithWinterSpec } from "../../../../src/index.js"

export const withWinterSpec = createWithWinterSpec({
  openapi: {
    apiName: "openapi-example",
    productionServerUrl: "https://example.com",
  },
  authMiddleware: {},
  beforeAuthMiddleware: [],
})
