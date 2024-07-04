import { createWithWinterSpec } from "src/create-with-winter-spec.js"
import axios from "axios"
import type { AxiosInstance } from "axios"
import getPort from "@ava/get-port"
import { createNodeServerFromRouteMap } from "src/serve/create-node-server-from-route-map.js"
import { ExecutionContext } from "ava"
import { once } from "events"
import { WinterSpecOptions } from "src/types/winter-spec.js"
import {
  GetAuthMiddlewaresFromGlobalSpec,
  GlobalSpec,
} from "src/types/global-spec.js"
import { WinterSpecRouteFnFromSpecs, RouteSpec } from "src/types/route-spec.js"
import { createWithLogger } from "src/middleware/with-logger.js"

export const getTestRoute = async <
  const GS extends GlobalSpec,
  const RS extends RouteSpec<GetAuthMiddlewaresFromGlobalSpec<GS>>,
>(
  t: ExecutionContext,
  opts: {
    globalSpec: GS
    routeSpec: RS
    routePath: string
    routeFn: WinterSpecRouteFnFromSpecs<GS, RS>
    edgeSpecOptions?: Partial<WinterSpecOptions>
  }
) => {
  const logs = {
    debug: [] as any[][],
    info: [] as any[][],
    warn: [] as any[][],
    error: [] as any[][],
  }

  const withRouteSpec = createWithWinterSpec({
    ...opts.globalSpec,
    beforeAuthMiddleware: [
      ...(opts.globalSpec.beforeAuthMiddleware ?? []),
      // Proxy logger
      createWithLogger({
        debug: (...args: any[]) => {
          console.debug(...args)
          logs.debug.push(args)
        },
        info: (...args: any[]) => {
          console.info(...args)
          logs.info.push(args)
        },
        warn: (...args: any[]) => {
          console.warn(...args)
          logs.warn.push(args)
        },
        error: (...args: any[]) => {
          console.error(...args)
          logs.error.push(args)
        },
      }),
    ],
  })

  const wrappedRouteFn = withRouteSpec(opts.routeSpec)(opts.routeFn as any)

  const port = await getPort()

  const app = await createNodeServerFromRouteMap(
    {
      [opts.routePath]: wrappedRouteFn,
    },
    {
      defaultOrigin: `http://localhost:${port}`,
    },
    opts.edgeSpecOptions
  )

  app.listen(port)
  t.teardown(async () => {
    const closePromise = once(app, "close")
    app.close()
    return closePromise
  })
  const serverUrl = `http://localhost:${port}`

  return {
    serverUrl,
    axios: axios.create({
      baseURL: serverUrl,
    }),
    getLogs: () => logs,
  }
}
