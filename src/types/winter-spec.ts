import type { Middleware } from "src/middleware/types.js"
import {
  createWinterSpecRequest,
  type SerializableToResponse,
  type WinterSpecRouteFn,
  type WinterSpecRouteParams,
  WinterSpecRequest,
} from "./web-handler.js"
import { z } from "zod"

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

export interface MakeRequestOptions {
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
> = (winterSpec: WinterSpecRouteBundle, ...options: Options) => ReturnValue

type Foo = WinterSpecAdapter<[], Promise<Server>>
type a = ReturnType<Foo>

export function makeRequestAgainstWinterSpec(
  winterSpec: WinterSpecRouteBundle,
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
    } = winterSpec

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

    const winterSpecRequest = createWinterSpecRequest(request, {
      winterSpec,
      routeParams: routeParams ?? {},
    })

    if (!routeFn) {
      const response = await handle404(winterSpecRequest, getDefaultContext())
      return serializeAdapterMiddlewareResponse(response)
    }

    const response = await wrapMiddlewares(
      options.middleware ?? [],
      routeFn,
      winterSpecRequest,
      getDefaultContext()
    )

    return serializeAdapterMiddlewareResponse(response)
  }
}

function canSerializeToResponse(
  response: unknown
): response is SerializableToResponse {
  return (
    response !== null &&
    typeof response === "object" &&
    "serializeToResponse" in response &&
    typeof response.serializeToResponse === "function"
  )
}

function serializeAdapterMiddlewareResponse(response: unknown): Response {
  if (response instanceof Response) {
    return response
  }

  // Adapter-level middleware runs outside route-specific serializers.
  if (canSerializeToResponse(response)) {
    return response.serializeToResponse(z.any())
  }

  if (typeof response === "object") {
    throw new Error(
      "Use ctx.json({...}) instead of returning an object directly."
    )
  }

  throw new Error(
    "WinterSpec handlers must return a Response or ctx.json(...)."
  )
}
