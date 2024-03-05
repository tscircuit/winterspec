import { startDevServer } from "./dev-server.js"
import { startHeadlessDevBundler } from "./headless/start-bundler.js"
import { startHeadlessDevServer } from "./headless/start-server.js"

export const devServer = {
  startDevServer,
  headless: {
    startBundler: startHeadlessDevBundler,
    startServer: startHeadlessDevServer,
  },
}
