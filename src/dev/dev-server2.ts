import { loadConfig } from "src/config/utils.js"
import type { StartDevServerOptions } from "./dev-server.js"

// Unlike the original dev server, startDevServer2 takes a much simpler approach, when it
// detects a relevant file system change it rebundles the entire app (see cli2/commands/bundle-routes.ts)
// it does not use a headless dev server bundler
export const startDevServer2 = async (options: StartDevServerOptions) => {
  const config = await loadConfig(
    options.rootDirectory ?? process.cwd(),
    options.config
  )
  // TODO
}
