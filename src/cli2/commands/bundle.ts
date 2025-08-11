import { Command } from "commander"
import { bundle } from "src/bundle/bundle.js"
import fs from "node:fs/promises"
import path from "node:path"
import { durationFormatter, sizeFormatter } from "human-readable"
import ora from "ora"
import { BaseCommand } from "../base-command.js"

export class BundleCommand extends BaseCommand {
  register(): void {
    this.program
      .command("bundle")
      .description("Bundle your app for distribution")
      .requiredOption("-o, --output <path>", "The path to output the bundle")
      .option("--root <path>", "Path to your project root")
      .option("--tsconfig <path>", "Path to your tsconfig.json")
      .option("--routes-directory <path>", "Path to your routes directory")
      .option("--platform <platform>", "The platform to bundle for")
      .option(
        "--sourcemap <type>",
        "Source map generation: 'external' for .js.map files, 'inline' for inline sourcemaps, 'none' to disable",
        "inline"
      )
      .action(async (options) => {
        const config = await this.loadConfig(options)

        // Validate sourcemap option
        if (
          options.sourcemap &&
          !["external", "inline", "none"].includes(options.sourcemap)
        ) {
          throw new Error("sourcemap must be one of: external, inline, none")
        }

        const spinner = ora("Bundling...").start()
        const buildStartedAt = performance.now()

        // Determine sourcemap option
        let sourcemapOption: boolean | "inline" | "external" = "inline"
        if (options.sourcemap === "none") {
          sourcemapOption = false
        } else if (options.sourcemap === "external") {
          sourcemapOption = "external"
        } else if (options.sourcemap === "inline") {
          sourcemapOption = "inline"
        }

        const bundleResult = await bundle(config, {
          sourcemap: sourcemapOption,
        })

        await fs.mkdir(path.dirname(options.output), { recursive: true })
        await fs.writeFile(options.output, bundleResult.code)

        // Write source map file if external source map was generated
        if (bundleResult.sourceMap) {
          const sourcemapPath = `${options.output}.map`
          await fs.writeFile(sourcemapPath, bundleResult.sourceMap)
          spinner.stopAndPersist({
            symbol: "☃️",
            text: ` brr... bundled in ${durationFormatter({
              allowMultiples: ["m", "s", "ms"],
            })(performance.now() - buildStartedAt)} (${sizeFormatter()(
              bundleResult.code.length
            )}) with source map`,
          })
        } else {
          spinner.stopAndPersist({
            symbol: "☃️",
            text: ` brr... bundled in ${durationFormatter({
              allowMultiples: ["m", "s", "ms"],
            })(performance.now() - buildStartedAt)} (${sizeFormatter()(
              bundleResult.code.length
            )})`,
          })
        }
      })
  }
}
