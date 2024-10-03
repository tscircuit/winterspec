import { ExecutionContext } from "ava"
import path from "node:path"
import defaultAxios from "axios"
import { fileURLToPath } from "node:url"
import getPort from "@ava/get-port"
import { startDevServer } from "src/dev/dev-server.js"
import type { Middleware } from "src/middleware/index.js"

/**
 * Starts a dev server using the same function that's exported to consumers & used in the CLI.
 * Expects there to be an `api` directory that's a sibling of the test file.
 *
 * `testFileUrl` should be `import.meta.url` from the test file.
 */
export const getTestServer = async (
  t: ExecutionContext,
  testFileUrl: string,
  options?: {
    middleware?: Middleware[]
  }
) => {
  const rootDirectory = path.join(path.dirname(fileURLToPath(testFileUrl)))

  const { stop, port } = await startDevServer({
    rootDirectory,
    port: await getPort(),
    middleware: options?.middleware,
    onBuildEnd(build) {
      if (build.type === "failure") {
        // console.error is used here over t.log because t.log doesn't seem to run in time
        console.error(
          "Build failed in getTestServer() fixture:",
          build.errorMessage
        )
      }
    },
  })

  t.teardown(async () => {
    await stop()
  })

  return {
    axios: defaultAxios.create({
      baseURL: `http://localhost:${port}`,
    }),
  }
}
