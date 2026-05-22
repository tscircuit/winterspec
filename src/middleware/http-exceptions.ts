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
  constructor(error: unknown) {
    const isZodLikeError =
      typeof error === "object" &&
      error !== null &&
      "issues" in error &&
      Array.isArray((error as any).issues)

    super(
      isZodLikeError
        ? formatZodError(error as z.ZodError<any>)
        : error instanceof Error
          ? error.message
          : String(error),
      500
    )
  }
}
