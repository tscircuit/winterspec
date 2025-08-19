import { createServer } from "node:http"
import { getRouteMatcher } from "@tscircuit/routematch"
import { normalizeRouteMap } from "../lib/normalize-route-map.js"
import {
  type TransformToNodeOptions,
  transformToNodeBuilder,
} from "src/edge/transform-to-node.js"
import { WinterSpecRouteFn } from "src/types/web-handler.js"
import {
  WinterSpecRouteBundle,
  WinterSpecOptions,
  makeRequestAgainstWinterSpec,
  MakeRequestOptions,
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

export const createNodeServerFromRouteMap = async (
  routeMap: Record<string, WinterSpecRouteFn>,
  transformToNodeOptions: TransformToNodeOptions,
  winterSpecOptions?: Partial<WinterSpecOptions>
) => {
  const winterSpec = createWinterSpecFromRouteMap(routeMap, winterSpecOptions)

  const transformToNode = transformToNodeBuilder(transformToNodeOptions)

  const server = createServer(
    transformToNode(makeRequestAgainstWinterSpec(winterSpec))
  )

  return server
}
