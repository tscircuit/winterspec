import { Command, Option } from "clipanion"
import path, { relative } from "node:path/posix"
import fs from "fs/promises"
import { createRoutePathMapFromDirectory } from "../../routes/create-route-map-from-directory.js"
import { WinterSpecRouteMap } from "../../types/winter-spec.js"

export class BundleRoutesCommand extends Command {
  static paths = [["bundle-routes"]]

  static usage = Command.Usage({
    description: "Bundle routes into a single file",
    examples: [
      [
        "Bundle routes",
        "winterspec bundle-routes --routes-directory ./api --output bundle.js",
      ],
    ],
  })

  routesDirectory = Option.String("-i,--routes-directory", {
    required: true,
    description: "Directory containing the route files",
  })

  output = Option.String("-o,--output", {
    required: false,
    description:
      "Output file path for the bundled routes (usually dist/static-routes.js)",
  })

  async execute() {
    if (!this.output) {
      this.output = "dist/static-routes.js"
    }
    const absoluteRoutesDir = path.resolve(process.cwd(), this.routesDirectory)
    const absoluteOutputFile = path.resolve(process.cwd(), this.output)
    const relativeOutputDir = path.dirname(this.output)

    // Generate the route map
    const routeMap = await createRoutePathMapFromDirectory(absoluteRoutesDir)

    // Generate the output file content
    const outputContent = `
// import { WinterSpecRouteMap } from "@winterspec/types"

const routeMap = {
  ${Object.entries(routeMap)
    .map(
      ([route, { relativePath }]) =>
        `"${route}": (await import('./${path.join(
          relativeOutputDir,
          this.routesDirectory,
          relativePath
        )}')).default`
    )
    .join(",\n  ")}
}

export default routeMap
`

    // Write the output file
    await fs.writeFile(absoluteOutputFile, outputContent, "utf-8")

    this.context.stdout.write(`Routes bundled successfully to ${this.output}\n`)
  }
}
