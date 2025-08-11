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

  let result: esbuild.BuildResult

  if (sourcemap === "external") {
    // For external source maps, we need to build with write: true first
    const tempDir = os.tmpdir()
    const tempPath = path.join(tempDir, `bundle-${Date.now()}.js`)

    await esbuild.build({
      stdin: {
        contents: await constructManifest(config),
        resolveDir: config.routesDirectory,
        loader: "ts",
      },
      bundle: true,
      format: "esm",
      outfile: tempPath,
      sourcemap: "external",
      ...platformBundleOptions,
    })

    // Read the generated files
    const bundleResult: BundleResult = {
      code: fs.readFileSync(tempPath, "utf8"),
      sourceMap: fs.readFileSync(`${tempPath}.map`, "utf8"),
    }

    // Clean up temp files
    fs.unlinkSync(tempPath)
    fs.unlinkSync(`${tempPath}.map`)

    return bundleResult
  } else {
    result = await esbuild.build({
      stdin: {
        contents: await constructManifest(config),
        resolveDir: config.routesDirectory,
        loader: "ts",
      },
      bundle: true,
      format: "esm",
      write: false,
      sourcemap,
      ...platformBundleOptions,
    })

    return {
      code: result.outputFiles?.[0]?.text || "",
    }
  }
}
