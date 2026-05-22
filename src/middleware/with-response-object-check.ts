import { Middleware } from "./types.js"
import { RouteSpec } from "src/types/route-spec.js"

export const RAW_RESPONSE_OBJECT_ERROR_MESSAGE =
  "Use ctx.json({...}) instead of returning an object directly."

export const withResponseObjectCheck: Middleware<
  { routeSpec: RouteSpec<any> },
  {}
> = async (req, ctx, next) => {
  const rawResponse = await next(req, ctx)

  if (typeof rawResponse === "object" && !(rawResponse instanceof Response)) {
    throw new Error(RAW_RESPONSE_OBJECT_ERROR_MESSAGE)
  }

  return rawResponse
}
