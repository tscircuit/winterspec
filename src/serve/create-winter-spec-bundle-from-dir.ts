import { createRoutePathMapFromDirectory } from "src/routes/create-route-map-from-directory.js"
import {
  WinterSpecOptions,
  WinterSpecRouteBundle,
} from "src/types/winter-spec.js"
import { createWinterSpecFromRouteMap } from "./create-node-server-from-route-map.js"
import { getRandomId } from "src/util/get-random-id.js"
import { WinterSpecConfig } from "src/config/config.js"

export const createWinterSpecBundleFromDir = async (
  dirPath: string,
  options: WinterSpecConfig = {}
): Promise<WinterSpecRouteBundle> => {
  const routeMapPaths = await createRoutePathMapFromDirectory(dirPath)

  const routeMap = Object.fromEntries(
    await Promise.all(
      Object.entries(routeMapPaths).map(async ([route, { relativePath }]) => {
        return [route, await import(relativePath)]
      })
    )
  )

  return createWinterSpecFromRouteMap(routeMap, {})
}
