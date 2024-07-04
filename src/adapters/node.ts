import { NodeHandler } from "@edge-runtime/node-utils"
import http from "node:http"
import { transformToNodeBuilder } from "src/edge/transform-to-node.js"
import type { Middleware } from "src/middleware/index.js"
import type { WinterSpecAdapter } from "src/types/winter-spec.js"

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
