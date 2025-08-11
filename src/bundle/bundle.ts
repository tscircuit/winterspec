import esbuild from "esbuild"
import { constructManifest } from "./construct-manifest.js"
import { ResolvedWinterSpecConfig } from "src/config/utils.js"
import os from "node:os"
import path from "node:path"

export interface BundleResult {
  code: string
  sourceMap?: string
}

export const bundle = async (
  config: ResolvedWinterSpecConfig,
  options: { sourcemap?: boolean | "inline" | "external" } = {}
): Promise<BundleResult> => {
  let platformBundleOptions: Partial<esbuild.BuildOptions> = {}

  if (config.platform === "node") {
    platformBundleOptions = {
      platform: "node",
      packages: "external",
    }
  }

  // esbuild does not support external source maps without writing to a temp file
  // so we need to write to a temp file
  const tempPath = path.join(os.tmpdir(), `bundle-${Date.now()}.js`)

  const sourcemap = options.sourcemap ?? "inline"

  const result = await esbuild.build({
    stdin: {
      contents: await constructManifest(config),
      resolveDir: config.routesDirectory,
      loader: "ts",
    },
    bundle: true,
    write: false,
    format: "esm",
    sourcemap,
    outfile: tempPath,
    ...platformBundleOptions,
  })

  const code =
    result.outputFiles?.find((file) => file.path.endsWith(".js"))?.text || ""
  const sourceMapFile = result.outputFiles?.find((file) =>
    file.path.endsWith(".map")
  )

  return {
    code,
    sourceMap: sourcemap === "external" ? sourceMapFile?.text : undefined,
  }
}
