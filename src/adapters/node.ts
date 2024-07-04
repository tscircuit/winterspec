import { NodeHandler } from "@edge-runtime/node-utils"
import http from "node:http"
import { transformToNodeBuilder } from "src/edge/transform-to-node.js"
import type { Middleware } from "src/middleware/index.js"
import type {
  WinterSpecAdapter,
  MakeRequestOptions,
} from "src/types/winter-spec.js"
import { createRoutePathMapFromDirectory } from "../routes/create-route-map-from-directory.js"
import { getDefaultContext } from "../types/context.js"
import { createWinterSpecBundleFromDir } from "src/serve/create-winter-spec-bundle-from-dir.js"
import { createWinterSpecFromRouteMap } from "src/serve/create-winter-spec-from-route-map.js"

export interface WinterSpecNodeAdapterOptions {
  middleware?: Middleware[]
  port?: number
}

export const getNodeHandler: WinterSpecAdapter<
  [WinterSpecNodeAdapterOptions],
  NodeHandler
> = (winterSpec, { port, middleware = [] }) => {
  const transformToNode = transformToNodeBuilder({
    defaultOrigin: `http://localhost${port ? `:${port}` : ""}`,
  })

  return transformToNode((req) =>
    winterSpec.makeRequest(req, {
      middleware,
    })
  )
}

export const startServer: WinterSpecAdapter<
  [WinterSpecNodeAdapterOptions],
  Promise<http.Server>
> = async (winterSpec, opts) => {
  const server = http.createServer(getNodeHandler(winterSpec, opts))

  const { port } = opts

  await new Promise<void>((resolve) => server.listen(port, resolve))

  return server
}

export const startServerFromRoutesDir = async (
  routesDirPath: string,
  opts: WinterSpecNodeAdapterOptions
) => {
  const winterSpec = await createWinterSpecBundleFromDir(routesDirPath, {})
  return startServer(winterSpec, opts)
}

export const createMakeRequestFromDir = async (dirPath: string) => {
  const winterSpec = await createWinterSpecBundleFromDir(dirPath, {})

  return winterSpec.makeRequest
}

export const createFetchHandlerFromDir = async (dirPath: string) => {
  const makeRequest = await createMakeRequestFromDir(dirPath)
  const fetchFn: typeof fetch = (url, init) => {
    return makeRequest(new Request(url, init))
  }
  return fetchFn
}

export {
  createRoutePathMapFromDirectory,
  getDefaultContext,
  createWinterSpecFromRouteMap,
  createWinterSpecBundleFromDir,
}
