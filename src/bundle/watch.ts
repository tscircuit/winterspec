import Watcher from "watcher"
import * as esbuild from "esbuild"
import fs from "node:fs/promises"
import path from "node:path"
import { constructManifest } from "./construct-manifest"
import { BundleOptions } from "./types"

/**
 * This does not directly provide a way to retrive the contents or path of the bundle. You should provide a plugin in the `esbuild` option to do so.
 */
export const bundleAndWatch = async (options: BundleOptions) => {
  // todo: this should watch all relevant paths from a tsconfig.json, not just the ./api directory
  const watcher = new Watcher(options.directoryPath, {
    recursive: true,
    ignoreInitial: true,
  })

  await fs.mkdir(".edgespec", { recursive: true })
  const manifestPath = path.resolve(".edgespec/dev-manifest.ts")

  const invalidateManifest = async () => {
    await fs.writeFile(manifestPath, await constructManifest(options), "utf-8")
    await ctx?.rebuild()
  }

  const ctx = await esbuild.context({
    entryPoints: [manifestPath],
    bundle: true,
    format: "esm",
    write: false,
    sourcemap: "inline",
    ...options.esbuild,
  })

  await invalidateManifest()

  watcher.on("change", async () => {
    await ctx.rebuild()
  })

  watcher.on("add", async () => {
    await invalidateManifest()
  })

  watcher.on("unlink", async () => {
    await invalidateManifest()
  })

  watcher.on("unlinkDir", async () => {
    await invalidateManifest()
  })

  return {
    stop: async () => {
      watcher.close()
      await ctx.dispose()
    },
  }
}
