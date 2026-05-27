import { Middleware } from "./types.js"

export const withResponseObjectCheck: Middleware = async (req, ctx, next) => {
  const rawResponse = await next(req, ctx)

  const canSerializeToResponse =
    rawResponse !== null &&
    typeof rawResponse === "object" &&
    "serializeToResponse" in rawResponse &&
    typeof rawResponse.serializeToResponse === "function"

  if (
    typeof rawResponse === "object" &&
    !(rawResponse instanceof Response) &&
    !canSerializeToResponse
  ) {
    throw new Error(
      "Use ctx.json({...}) instead of returning an object directly."
    )
  }

  return rawResponse
}
