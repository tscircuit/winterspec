import type { FetchEvent } from "@edge-runtime/primitives"
import { WinterSpecRouteBundle } from "./winter-spec.js"
import { Primitive } from "type-fest"
import { z } from "zod"
import { ResponseTypeToContext } from "./context.js"
import type { RouteSpec } from "./route-spec.js"
import type { GlobalSpec } from "./global-spec.js"

export type HTTPMethods =
  | "GET"
  | "POST"
  | "DELETE"
  | "PUT"
  | "PATCH"
  | "HEAD"
  | "OPTIONS"

export type WinterSpecRouteParams = {
  [routeParam: string]: string | string[]
}

export type HeadersDescriptor = Headers | HeadersInit

export interface WinterSpecRequestOptions {
  routeParams: WinterSpecRouteParams
  winterSpec: WinterSpecRouteBundle
}

export type WinterSpecRequest<T = {}> = WinterSpecRequestOptions & Request & T

export interface SerializableToResponse {
  /**
   *  Serialize the response to a Response object
   *
   * @throws z.ZodError if the response does not match the schema
   * @param schema - the schema to validate the response against
   */
  serializeToResponse(schema: z.ZodTypeAny): Response

  statusCode(): number
}

export type ValidFormDataValue = Primitive | Blob

export abstract class WinterSpecResponse implements SerializableToResponse {
  abstract serializeToResponse(schema: z.ZodTypeAny): Response

  statusCode(): number {
    return this.options.status ?? 200
  }

  status(status: number): this {
    this.options.status = status
    return this
  }

  header(key: string, value: string): this {
    this.options.headers = mergeHeaders(this.options.headers, {
      [key]: value,
    })

    return this
  }

  headers(headers: HeadersInit): this {
    this.options.headers = mergeHeaders(this.options.headers, headers)
    return this
  }

  statusText(statusText: string): this {
    this.options.statusText = statusText
    return this
  }

  constructor(protected options: ResponseInit = {}) {}

  static json<T>(
    ...args: ConstructorParameters<typeof WinterSpecJsonResponse<T>>
  ) {
    return new WinterSpecJsonResponse<T>(...args)
  }

  static multipartFormData<T extends Record<string, ValidFormDataValue>>(
    ...args: ConstructorParameters<
      typeof WinterSpecMultiPartFormDataResponse<T>
    >
  ) {
    return new WinterSpecMultiPartFormDataResponse<T>(...args)
  }

  static custom<T, const C extends string>(
    ...args: ConstructorParameters<typeof WinterSpecCustomResponse<T, C>>
  ) {
    return new WinterSpecCustomResponse<T, C>(...args)
  }
}

export class WinterSpecJsonResponse<T> extends WinterSpecResponse {
  constructor(
    public data: T,
    options: ResponseInit = {}
  ) {
    super(options)
    this.options.headers = mergeHeaders(this.options.headers, {
      "Content-Type": "application/json",
    })
  }

  override serializeToResponse(schema: z.ZodTypeAny) {
    return new Response(JSON.stringify(schema.parse(this.data)), this.options)
  }
}

export class WinterSpecCustomResponse<
  T,
  const C extends string,
> extends WinterSpecResponse {
  constructor(
    public data: T,
    public contentType: C,
    options: ResponseInit = {}
  ) {
    super(options)
    this.options.headers = mergeHeaders(this.options.headers, {
      "Content-Type": contentType,
    })
  }

  serializeToResponse(schema: z.ZodTypeAny) {
    return new Response(schema.parse(this.data), this.options)
  }
}

export class MiddlewareResponseData extends WinterSpecResponse {
  constructor(options: ResponseInit = {}) {
    super(options)
  }

  serializeToResponse() {
    return new Response(undefined, this.options)
  }
}

export class WinterSpecMultiPartFormDataResponse<
  T extends Record<string, ValidFormDataValue>,
> extends WinterSpecResponse {
  constructor(
    public data: T,
    options: ResponseInit = {}
  ) {
    super(options)
    this.options.headers = mergeHeaders(this.options.headers, {
      "Content-Type": "multipart/form-data",
    })
  }

  serializeToResponse(schema: z.ZodTypeAny) {
    const formData = new FormData()

    for (const [key, value] of Object.entries(schema.parse(this.data))) {
      // TODO: nested objects?
      formData.append(key, value instanceof Blob ? value : String(value))
    }

    return new Response(formData, this.options)
  }
}

export type WinterSpecRouteFn<
  RequestOptions = WinterSpecRequestOptions,
  ResponseType extends SerializableToResponse | Response = Response,
  Context = ResponseTypeToContext<ResponseType>,
> = ((
  req: WinterSpecRequest<RequestOptions>,
  ctx: Context
) => ResponseType | Promise<ResponseType>) & {
  _globalSpec?: GlobalSpec
  _routeSpec?: RouteSpec<any>
}

export type WinterSpecFetchEvent = FetchEvent & {
  request: WinterSpecRequest
}

export function createWinterSpecRequest(
  request: Request,
  options: WinterSpecRequestOptions
): WinterSpecRequest {
  return Object.assign(request, options)
}

export function mergeHeaders(
  h1: HeadersDescriptor | undefined | null,
  h2: HeadersDescriptor | undefined | null
) {
  return new Headers(
    Object.fromEntries([
      ...(h1 instanceof Headers
        ? h1
        : new Headers(h1 ?? undefined).entries() ?? []),
      ...(h2 instanceof Headers
        ? h2
        : new Headers(h2 ?? undefined).entries() ?? []),
    ])
  )
}
