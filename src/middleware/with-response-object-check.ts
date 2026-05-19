import { Middleware } from "./types.js"
import { RouteSpec } from "src/types/route-spec.js"

export const RAW_OBJECT_RESPONSE_ERROR_MESSAGE =
  "Use ctx.json({...}) instead of returning an object directly."

export const isRawObjectResponse = (response: unknown) =>
  response === null ||
  (typeof response === "object" &&
    !(response instanceof Response) &&
    !("serializeToResponse" in response))

export const withResponseObjectCheck: Middleware<
  { routeSpec: RouteSpec<any> },
  {}
> = async (req, ctx, next) => {
  const rawResponse = await next(req, ctx)

  if (isRawObjectResponse(rawResponse)) {
    throw new Error(RAW_OBJECT_RESPONSE_ERROR_MESSAGE)
  }

  return rawResponse
}
