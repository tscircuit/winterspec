import { ResponseValidationError } from "./http-exceptions.js"
import { Middleware } from "./types.js"
import { RouteSpec } from "src/types/route-spec.js"

export const withResponseValidation: Middleware<
  { routeSpec: RouteSpec<any> },
  {}
> = async (req, ctx, next) => {
  const rawResponse = await next(req, ctx)

  if (typeof rawResponse === "object" && !(rawResponse instanceof Response)) {
    throw new Error(
      "Use ctx.json({...}) instead of returning an object directly."
    )
  }

  return rawResponse
}
