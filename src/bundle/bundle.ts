import esbuild from "esbuild"
import { constructManifest } from "./construct-manifest.js"
import { ResolvedWinterSpecConfig } from "src/config/utils.js"
import os from "node:os"
import path from "node:path"
import fs from "node:fs"

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

  const sourcemap = options.sourcemap ?? "inline"

  const buildOptions: esbuild.BuildOptions = {
    stdin: {
      contents: await constructManifest(config),
      resolveDir: config.routesDirectory,
      loader: "ts",
    },
    bundle: true,
    format: "esm",
    sourcemap: sourcemap !== false,
    ...platformBundleOptions,
  }

  // For external source maps, use temp file approach
  if (sourcemap === "external") {
    const tempPath = path.join(os.tmpdir(), `bundle-${Date.now()}.js`)

    await esbuild.build({
      ...buildOptions,
      outfile: tempPath,
      sourcemap: "external",
    })

    const code = fs.readFileSync(tempPath, "utf8")
    const sourceMap = fs.readFileSync(`${tempPath}.map`, "utf8")

    // Clean up temp files
    fs.unlinkSync(tempPath)
    fs.unlinkSync(`${tempPath}.map`)

    return { code, sourceMap }
  } else {
    // For inline/disabled source maps, use write: false
    const result = await esbuild.build({
      ...buildOptions,
      write: false,
    })

    return {
      code: result.outputFiles?.[0]?.text || "",
    }
  }
}
