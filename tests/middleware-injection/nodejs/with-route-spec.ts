import { createWithWinterSpec } from "../../../src/index.js"
import type { Middleware } from "../../../src/middleware/index.js"

const sampleMiddleware: Middleware<{}, { middlewareType: string }> = (
  req,
  ctx,
  next
) => {
  if (!ctx.middlewareType) {
    ctx.middlewareType = "uninjected"
  }

  return next(req, ctx)
}

export const withRouteSpec = createWithWinterSpec({
  beforeAuthMiddleware: [sampleMiddleware],
  authMiddleware: {},
  apiName: "Example",
  productionServerUrl: "https://example.com",
})
