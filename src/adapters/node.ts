import http from "node:http"
import { transformToNodeBuilder } from "src/edge-runtime/transform-to-node"
import type { EdgeSpecAdapter } from "src/types/edge-spec"

export interface EdgeSpecNodeAdapterOptions {
  port?: number
}

export const startServer: EdgeSpecAdapter<
  [EdgeSpecNodeAdapterOptions],
  Promise<http.Server>
> = async (edgeSpec, { port }) => {
  const transformToNode = transformToNodeBuilder({
    defaultOrigin: `http://localhost${port ? `:${port}` : ""}`,
  })

  const server = http.createServer(
    transformToNode((req) => edgeSpec.makeRequest(req))
  )

  await new Promise<void>((resolve) => server.listen(port, resolve))

  return server
}
