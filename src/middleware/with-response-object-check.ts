import { ResponseValidationError } from "./http-exceptions.js"
import { Middleware } from "./types.js"
import { RouteSpec } from "src/types/route-spec.js"

export const withResponseObjectCheck: Middleware<
  { routeSpec: RouteSpec<any> },
  {}
> = async (req, ctx, next) => {
  const rawResponse = await next(req, ctx)

  if (typeof rawResponse === "object" && !(rawResponse instanceof Response)) {
    const method = req.method
    const path = new URL(req.url).pathname
    throw new Error(
      `Route handler for ${method} ${path} returned a plain object instead of a Response. ` +
        `Use ctx.json({...}) instead of returning an object directly.\n` +
        `Example fix: return ctx.json({ ok: true })`
    )
  }

  return rawResponse
}
