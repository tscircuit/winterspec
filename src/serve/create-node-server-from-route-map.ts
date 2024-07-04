import { createServer } from "node:http"
import { getRouteMatcher } from "next-route-matcher"
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
} from "src/types/winter-spec.js"

const createWinterSpecFromRouteMap = (
  routeMap: Record<string, WinterSpecRouteFn>,
  edgeSpecOptions?: Partial<WinterSpecOptions>
): WinterSpecRouteBundle => {
  const formattedRoutes = normalizeRouteMap(routeMap)
  const routeMatcher = getRouteMatcher(Object.keys(formattedRoutes))

  const routeMapWithHandlers = Object.fromEntries(
    Object.entries(formattedRoutes).map(([routeFormatted, route]) => [
      routeFormatted,
      routeMap[route],
    ])
  )

  const edgeSpec = {
    routeMatcher,
    routeMapWithHandlers,
    makeRequest: async (req: Request) =>
      makeRequestAgainstWinterSpec(edgeSpec)(req),
    ...edgeSpecOptions,
  }

  return edgeSpec
}

export const createNodeServerFromRouteMap = async (
  routeMap: Record<string, WinterSpecRouteFn>,
  transformToNodeOptions: TransformToNodeOptions,
  edgeSpecOptions?: Partial<WinterSpecOptions>
) => {
  const edgeSpec = createWinterSpecFromRouteMap(routeMap, edgeSpecOptions)

  const transformToNode = transformToNodeBuilder(transformToNodeOptions)

  const server = createServer(
    transformToNode(makeRequestAgainstWinterSpec(edgeSpec))
  )

  return server
}
