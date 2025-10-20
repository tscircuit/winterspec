import { createWithWinterSpec } from "../../../../src/index.js"

export const withWinterSpec = createWithWinterSpec({
  openapi: {
    apiName: "hello-world",
    productionServerUrl: "https://example.com",
  },
  authMiddleware: {},
  beforeAuthMiddleware: [],
})
