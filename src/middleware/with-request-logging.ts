import { Middleware } from "./types.js"
import kleur from "kleur"
import { Logger } from "./with-logger.js"

// ENABLE COLORS ALWAYS
kleur.enabled = true

const colorStatus = (status: number) => {
  if (status >= 500) {
    return kleur.red(status.toString())
  }
  if (status >= 400) {
    return kleur.yellow(status.toString())
  }
  return kleur.green(status.toString())
}

export const withRequestLogging: Middleware<
  {},
  {
    logger: Logger
  }
> = async (req, ctx, next) => {
  if (!ctx.logger) {
    ctx.logger = {
      error: (...args: any[]) => console.error(...args),
      info: (...args: any[]) => console.log(...args),
      warn: (...args: any[]) => console.warn(...args),
      debug: (...args: any[]) => console.log(...args),
    }
  }
  try {
    ctx.logger.info(kleur.blue(`> ${req.method} ${req.url}`))
    const response = await next(req, ctx)
    try {
      const responseBody = await response.clone().text()
      ctx.logger.info(
        `< ${colorStatus(response.status)} ${kleur.gray(
          responseBody.slice(0, 40).replace(/(\r\n|\n|\r)/gm, "")
        )}`
      )
    } catch (e) {
      ctx.logger.info(`< ${colorStatus(response.status)}`)
    }
    return response
  } catch (e: any) {
    ctx.logger.info(kleur.red(`< ERROR ${e.toString().slice(0, 50)}...`))
    throw e
  }
}
