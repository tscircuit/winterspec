import { Command, Option } from "clipanion"
import { bundle } from "src/bundle/bundle.js"
import fs, { readFile } from "node:fs/promises"
import path from "node:path"
import { durationFormatter, sizeFormatter } from "human-readable"
import ora from "ora"
import { BaseCommand } from "../base-command.js"
import { ResolvedWinterSpecConfig } from "src/config/utils.js"

import { BundleOptions } from "src/bundle/types.js"
import { join as joinPath } from "node:path"

export class BundleCommand extends BaseCommand {
  static paths = [[`bundle`]]

  static usage = Command.Usage({
    description: "Bundle your app for distribution",
    details: `
      This command bundles your app for distribution. It outputs a zero-dependency file that can be run in a variety of environments.
    `,
    examples: [
      [`Bundle your app`, `$0 bundle --output bundled.js`],
      [
        `Bundle with external source map`,
        `$0 bundle --output bundled.js --sourcemap external`,
      ],
      [
        `Bundle with inline source map`,
        `$0 bundle --output bundled.js --sourcemap inline`,
      ],
      [
        `Bundle without source map`,
        `$0 bundle --output bundled.js --sourcemap none`,
      ],
    ],
  })

  outputPath = Option.String("--output,-o", {
    description: "The path to output the bundle",
    required: true,
  })

  sourcemap = Option.String("--sourcemap", {
    description:
      "Source map generation: 'external' for .js.map files, 'inline' for inline sourcemaps, 'none' to disable",
  })

  async run(config: ResolvedWinterSpecConfig) {
    // Validate sourcemap option
    if (
      this.sourcemap &&
      !["external", "inline", "none"].includes(this.sourcemap)
    ) {
      throw new Error("sourcemap must be one of: external, inline, none")
    }

    const spinner = ora("Bundling...").start()
    const buildStartedAt = performance.now()

    // Determine sourcemap option
    let sourcemapOption: boolean | "inline" | "external" = "inline"
    if (this.sourcemap === "none") {
      sourcemapOption = false
    } else if (this.sourcemap === "external") {
      sourcemapOption = "external"
    } else if (this.sourcemap === "inline") {
      sourcemapOption = "inline"
    }

    const result = await bundle(config, { sourcemap: sourcemapOption })

    await fs.mkdir(path.dirname(this.outputPath), { recursive: true })
    await fs.writeFile(this.outputPath, result.code)

    // Write source map file if external source map was generated
    if (result.sourceMap) {
      const sourcemapPath = `${this.outputPath}.map`
      await fs.writeFile(sourcemapPath, result.sourceMap)
      spinner.stopAndPersist({
        symbol: "☃️",
        text: ` brr... bundled in ${durationFormatter({
          allowMultiples: ["m", "s", "ms"],
        })(performance.now() - buildStartedAt)} (${sizeFormatter()(
          result.code.length
        )}) with source map`,
      })
    } else {
      spinner.stopAndPersist({
        symbol: "☃️",
        text: ` brr... bundled in ${durationFormatter({
          allowMultiples: ["m", "s", "ms"],
        })(performance.now() - buildStartedAt)} (${sizeFormatter()(
          result.code.length
        )})`,
      })
    }
  }
}
