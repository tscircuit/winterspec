import type { Middleware } from "src/middleware/types.js"
import {
  createWinterSpecRequest,
  type WinterSpecRouteFn,
  type WinterSpecRouteParams,
  WinterSpecRequest,
} from "./web-handler.js"

import type { ReadonlyDeep } from "type-fest"
import { wrapMiddlewares } from "src/create-with-winter-spec.js"
import { getDefaultContext } from "./context.js"
import { Server } from "node:http"

export type WinterSpecRouteMatcher = (pathname: string) =>
  | {
      matchedRoute: string
      routeParams: WinterSpecRouteParams
    }
  | undefined
  | null

export type WinterSpecRouteMap = Record<string, WinterSpecRouteFn>

export interface WinterSpecOptions {
  handle404?: WinterSpecRouteFn
}

interface MakeRequestOptions {
  /**
   * Defaults to true. When true, we will attempt to automatically remove any pathname prefix from the request. This is useful when you're hosting an WinterSpec service on a subpath of your application.
   *
   * For example, if you're hosting an WinterSpec service "Foo" at /foo/[...path], then this option will automatically remove the /foo prefix from the request so that the Foo service only sees /[...path].
   *
   * This currently only works if your parent application is also an WinterSpec service and it's hosting the child service on a wildcard route (/foo/[...path]).
   */
  automaticallyRemovePathnamePrefix?: boolean

  /**
   * If you want to manually remove a pathname prefix, you can specify it here. `automaticallyRemovePathnamePrefix` must be false when specifying this option.
   */
  removePathnamePrefix?: string

  middleware?: Middleware[]
}

// make this deeply immutable to force usage through helper functions
export type WinterSpecRouteBundle = ReadonlyDeep<
  WinterSpecOptions & {
    routeMatcher: WinterSpecRouteMatcher
    routeMapWithHandlers: WinterSpecRouteMap
    makeRequest: (
      request: Request,
      options?: MakeRequestOptions
    ) => Promise<Response>
  }
>

export type WinterSpecAdapter<
  Options extends Array<unknown> = [],
  ReturnValue = void,
> = (edgeSpec: WinterSpecRouteBundle, ...options: Options) => ReturnValue

type Foo = WinterSpecAdapter<[], Promise<Server>>
type a = ReturnType<Foo>

export function makeRequestAgainstWinterSpec(
  edgeSpec: WinterSpecRouteBundle,
  options: MakeRequestOptions = {}
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    const {
      routeMatcher,
      routeMapWithHandlers,
      handle404 = () =>
        new Response("Not found", {
          status: 404,
        }),
    } = edgeSpec

    const { removePathnamePrefix, automaticallyRemovePathnamePrefix = true } =
      options

    let pathname = new URL(request.url).pathname
    if (removePathnamePrefix) {
      if (automaticallyRemovePathnamePrefix) {
        throw new Error(
          "automaticallyRemovePathnamePrefix and removePathnamePrefix cannot both be specified"
        )
      }

      pathname = pathname.replace(removePathnamePrefix, "")
    } else {
      if ((request as any).routeParams) {
        // These are the route params of the parent route hosting the WinterSpec service
        const routeParams = (request as unknown as WinterSpecRequest)
          .routeParams

        // If the child service is hosted at /foo/[...path], we want to find the [...path] parameter
        const wildcardRouteParameters = Object.values(routeParams).filter((p) =>
          Array.isArray(p)
        )
        if (wildcardRouteParameters.length === 0) {
          throw new Error("No wildcard route parameters found")
        }

        if (wildcardRouteParameters.length > 1) {
          throw new Error("Only one wildcard route parameter is supported")
        }

        const wildcardRouteParameter = wildcardRouteParameters[0]

        pathname = `/${(wildcardRouteParameter as string[]).join("/")}`
      }
    }

    const { matchedRoute, routeParams } = routeMatcher(pathname) ?? {}

    let routeFn = matchedRoute && routeMapWithHandlers[matchedRoute]

    const edgeSpecRequest = createWinterSpecRequest(request, {
      edgeSpec,
      routeParams: routeParams ?? {},
    })

    if (!routeFn) {
      return await handle404(edgeSpecRequest, getDefaultContext())
    }

    return wrapMiddlewares(
      options.middleware ?? [],
      routeFn,
      edgeSpecRequest,
      getDefaultContext()
    )
  }
}
