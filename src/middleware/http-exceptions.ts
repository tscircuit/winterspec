import { formatZodError } from "src/lib/format-zod-error.js"
import { z } from "zod"

export interface HttpException {
  status: number
  message?: string

  _isHttpException: true
}

export abstract class WinterSpecMiddlewareError
  extends Error
  implements HttpException
{
  _isHttpException = true as const

  constructor(
    public message: string,
    public status: number = 500
  ) {
    super(message)
    this.name = this.constructor.name
  }
}

export class MethodNotAllowedError extends WinterSpecMiddlewareError {
  constructor(allowedMethods: readonly string[]) {
    super(`only ${allowedMethods.join(",")} accepted`, 405)
  }
}

export class NotFoundError extends WinterSpecMiddlewareError {
  constructor(message: string) {
    super(message, 404)
  }
}

export abstract class BadRequestError extends WinterSpecMiddlewareError {
  constructor(message: string) {
    super(message, 400)
  }
}

export class InvalidQueryParamsError extends BadRequestError {
  constructor(message: string) {
    super(message)
  }
}

export class InvalidContentTypeError extends BadRequestError {
  constructor(message: string) {
    super(message)
  }
}

export class InputParsingError extends BadRequestError {
  constructor(message: string) {
    super(message)
  }
}

export class InputValidationError extends BadRequestError {
  constructor(error: z.ZodError<any>) {
    super(formatZodError(error))
  }
}

export class ResponseValidationError extends WinterSpecMiddlewareError {
  constructor(error: z.ZodError<any>) {
    super(formatZodError(error), 500)
  }
}

export class RouteReturnedPlainObjectError extends WinterSpecMiddlewareError {
  constructor(method: string, path: string) {
    super(
      `Route handler for ${method} ${path} returned a plain object instead of a Response. ` +
        `Use ctx.json({...}) instead of returning an object directly.\n` +
        `Example fix: return ctx.json({ ok: true })`,
      500
    )
  }
}
