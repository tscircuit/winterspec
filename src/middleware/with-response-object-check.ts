import { Middleware } from "./types.js"
import { RouteSpec } from "src/types/route-spec.js"

export const withResponseObjectCheck: Middleware<
  { routeSpec: RouteSpec<any> },
  {}
> = async (req, ctx, next) => {
  const rawResponse = await next(req, ctx)

  if (typeof rawResponse === "object" && !(rawResponse instanceof Response)) {
    const url = new URL(req.url)
    throw new Error(
      `Invalid route return value for ${req.method} ${url.pathname}. ` +
        "Use ctx.json({...}) instead of returning an object directly. " +
        "Example: return ctx.json({ ok: true })."
    )
  }

  return rawResponse
}
