import { Middleware } from "./types.js"
import { RouteSpec } from "src/types/route-spec.js"

export const RAW_RESPONSE_OBJECT_ERROR_MESSAGE =
  "Use ctx.json({...}) instead of returning an object directly."

function hasWinterSpecSerializer(
  rawResponse: unknown
): rawResponse is { serializeToResponse: (...args: any[]) => Response } {
  return (
    typeof rawResponse === "object" &&
    rawResponse !== null &&
    "serializeToResponse" in rawResponse &&
    typeof rawResponse.serializeToResponse === "function"
  )
}

export function assertRouteReturnsResponse(rawResponse: unknown) {
  if (rawResponse instanceof Response || hasWinterSpecSerializer(rawResponse)) {
    return
  }

  throw new Error(
    `${RAW_RESPONSE_OBJECT_ERROR_MESSAGE} Route handlers must return a Response or ctx.json(...).`
  )
}

export const withResponseObjectCheck: Middleware<
  { routeSpec: RouteSpec<any> },
  {}
> = async (req, ctx, next) => {
  const rawResponse = await next(req, ctx)

  assertRouteReturnsResponse(rawResponse)

  return rawResponse
}
