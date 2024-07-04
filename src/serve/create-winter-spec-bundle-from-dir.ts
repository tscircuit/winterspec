import { createRoutePathMapFromDirectory } from "src/routes/create-route-map-from-directory.js"
import {
  WinterSpecOptions,
  WinterSpecRouteBundle,
} from "src/types/winter-spec.js"
import { createWinterSpecFromRouteMap } from "./create-node-server-from-route-map.js"
import { WinterSpecConfig } from "src/config/config.js"
import { join } from "node:path"

export const createWinterSpecBundleFromDir = async (
  dirPath: string,
  options: WinterSpecConfig = {}
): Promise<WinterSpecRouteBundle> => {
  const routeMapPaths = await createRoutePathMapFromDirectory(dirPath)

  const routeMap = Object.fromEntries(
    await Promise.all(
      Object.entries(routeMapPaths).map(async ([route, { relativePath }]) => {
        return [route, (await import(join(dirPath, relativePath))).default]
      })
    )
  )

  return createWinterSpecFromRouteMap(routeMap, {})
}
