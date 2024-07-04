import fs from "node:fs/promises"
import { EdgeRuntime } from "edge-runtime"
import type { BirpcReturn } from "birpc"
import { makeRequestAgainstWinterSpec } from "src/types/winter-spec.js"
import { Middleware } from "src/middleware/index.js"
import { loadBundle } from "src/helpers.js"
import type { BundlerRpcFunctions } from "./types.js"

const BUILD_ERROR_MESSAGE =
  "Could not build your app. Check your terminal for more information."

export class RequestHandlerController {
  private cachedWinterCGRuntime?: EdgeRuntime
  private cachedNodeHandler?: ReturnType<typeof makeRequestAgainstWinterSpec>
  private buildLastUpdatedAt = 0

  constructor(
    private bundlerRpc: BirpcReturn<BundlerRpcFunctions, any>,
    private middleware: Middleware[]
  ) {}

  /**
   * You **should not** cache the result of this function. Call it every time you want to use the runtime.
   */
  async getWinterCGRuntime() {
    const { buildUpdatedAtMs, ...build } =
      await this.bundlerRpc.waitForAvailableBuild()

    if (
      this.buildLastUpdatedAt === buildUpdatedAtMs &&
      this.cachedWinterCGRuntime
    ) {
      return this.cachedWinterCGRuntime
    }

    if (build.type === "failure") {
      this.cachedWinterCGRuntime = new EdgeRuntime({
        initialCode: `
          addEventListener("fetch", (event) => {
            event.respondWith(new Response("${BUILD_ERROR_MESSAGE}", { status: 500 }))
          })
        `,
      })
    } else {
      const contents = await fs.readFile(build.bundlePath, "utf-8")
      const { middleware } = this
      this.cachedWinterCGRuntime = new EdgeRuntime({
        initialCode: contents,
        extend(context) {
          context._injectedWinterSpecMiddleware = middleware
          return context
        },
      })
    }

    this.buildLastUpdatedAt = buildUpdatedAtMs
    return this.cachedWinterCGRuntime
  }

  /**
   * You **should not** cache the result of this function. Call it every time you want to use the handler.
   */
  async getNodeHandler(): Promise<
    ReturnType<typeof makeRequestAgainstWinterSpec>
  > {
    const { buildUpdatedAtMs, ...build } =
      await this.bundlerRpc.waitForAvailableBuild()

    if (
      this.buildLastUpdatedAt === buildUpdatedAtMs &&
      this.cachedNodeHandler
    ) {
      return this.cachedNodeHandler
    }

    if (build.type === "failure") {
      this.cachedNodeHandler = async () =>
        new Response(BUILD_ERROR_MESSAGE, { status: 500 })
    } else {
      // We append the timestamp to the path to bust the cache
      const winterSpecModule = await loadBundle(
        `file:${build.bundlePath}#${Date.now()}`
      )

      this.cachedNodeHandler = async (req) =>
        winterSpecModule.makeRequest(req, {
          middleware: this.middleware,
        })
    }

    this.buildLastUpdatedAt = buildUpdatedAtMs
    return this.cachedNodeHandler
  }
}
