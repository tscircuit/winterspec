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
      .action(async (options) => {
        const config = await this.loadConfig(options)

        const spinner = ora("Bundling...").start()
        const buildStartedAt = performance.now()

        const bundleResult = await bundle(config)

        await fs.mkdir(path.dirname(options.output), { recursive: true })
        await fs.writeFile(options.output, bundleResult.code)

        spinner.stopAndPersist({
          symbol: "☃️",
          text: ` brr... bundled in ${durationFormatter({
            allowMultiples: ["m", "s", "ms"],
          })(performance.now() - buildStartedAt)} (${sizeFormatter()(
            bundleResult.code.length
          )})`,
        })
      })
  }
}
