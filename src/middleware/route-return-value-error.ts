export const INVALID_ROUTE_RETURN_VALUE_MESSAGE =
  "Use ctx.json({...}) instead of returning an object directly."

export function isValidRouteReturnValue(value: unknown): boolean {
  return (
    value instanceof Response ||
    (typeof value === "object" &&
      value !== null &&
      "serializeToResponse" in value)
  )
}

export function assertValidRouteReturnValue(value: unknown) {
  if (!isValidRouteReturnValue(value)) {
    throw new Error(INVALID_ROUTE_RETURN_VALUE_MESSAGE)
  }
}
