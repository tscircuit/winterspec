import { getRouteMatcher } from "next-route-matcher"
import { normalizeRouteMap } from "../lib/normalize-route-map.js"
import { WinterSpecRouteFn } from "src/types/web-handler.js"
import {
  MakeRequestOptions,
  WinterSpecRouteBundle,
  WinterSpecOptions,
  makeRequestAgainstWinterSpec,
} from "src/types/winter-spec.js"

export const createWinterSpecFromRouteMap = (
  routeMap: Record<string, WinterSpecRouteFn>,
  winterSpecOptions?: Partial<WinterSpecOptions>
): WinterSpecRouteBundle => {
  const formattedRoutes = normalizeRouteMap(routeMap)
  const routeMatcher = getRouteMatcher(Object.keys(formattedRoutes))

  const routeMapWithHandlers = Object.fromEntries(
    Object.entries(formattedRoutes).map(([routeFormatted, route]) => [
      routeFormatted,
      routeMap[route],
    ])
  )

  const winterSpec = {
    routeMatcher,
    routeMapWithHandlers,
    makeRequest: async (req: Request, opts?: MakeRequestOptions) =>
      makeRequestAgainstWinterSpec(winterSpec, opts)(req),
    ...winterSpecOptions,
  }

  return winterSpec
}
