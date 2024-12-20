import { Command } from "commander"
import path, { relative } from "node:path"
import { join } from "node:path/posix"
import fs from "fs/promises"
import { createRoutePathMapFromDirectory } from "../../routes/create-route-map-from-directory.js"
import { BaseCommand } from "../base-command.js"

export class BundleRoutesCommand extends BaseCommand {
  register(): void {
    this.program
      .command("bundle-routes")
      .description("Bundle routes into a single file")
      .requiredOption(
        "-i, --routes-directory <path>",
        "Directory containing the route files"
      )
      .option(
        "-o, --output <path>",
        "Output file path for the bundled routes (usually dist/static-routes.js)"
      )
      .action(async (options) => {
        const config = await this.loadConfig(options)

        if (!options.output) {
          options.output = "dist/static-routes.js"
        }
        const absoluteRoutesDir = path.resolve(
          process.cwd(),
          options.routesDirectory
        )
        const absoluteOutputFile = path.resolve(process.cwd(), options.output)
        const relativeOutputDir = path.dirname(options.output)

        // Generate the route map
        const routeMap =
          await createRoutePathMapFromDirectory(absoluteRoutesDir)

        // Generate the output file content
        const outputContent = `
// import { WinterSpecRouteMap } from "@winterspec/types"

const routeMap = {
  ${Object.entries(routeMap)
    .map(
      ([route, { relativePath }]) =>
        `"${route}": (await import('./${join(
          relativeOutputDir,
          options.routesDirectory,
          relativePath
        )}')).default`
    )
    .join(",\n  ")}
}

export default routeMap
`

        // Write the output file
        await fs.writeFile(absoluteOutputFile, outputContent, "utf-8")

        console.log(`Routes bundled successfully to ${options.output}\n`)
      })
  }
}
