import { ResponseValidationError } from "./http-exceptions.js"
import { Middleware } from "./types.js"
import { RouteSpec } from "src/types/route-spec.js"
import { INVALID_ROUTE_RETURN_VALUE_MESSAGE } from "./route-return-value-error.js"

export const withResponseObjectCheck: Middleware<
  { routeSpec: RouteSpec<any> },
  {}
> = async (req, ctx, next) => {
  const rawResponse = await next(req, ctx)

  if (typeof rawResponse === "object" && !(rawResponse instanceof Response)) {
    throw new Error(INVALID_ROUTE_RETURN_VALUE_MESSAGE)
  }

  return rawResponse
}
