import { Command, Option } from "clipanion"
import path from "path"
import fs from "fs/promises"
import { createRoutePathMapFromDirectory } from "../../routes/create-route-map-from-directory"
import { WinterSpecRouteMap } from "../../types/winter-spec.js"

export class BundleRoutesCommand extends Command {
  static paths = [["bundle-routes"]]

  static usage = Command.Usage({
    description: "Bundle routes into a single file",
    examples: [["Bundle routes", "winterspec bundle-routes --routes-directory ./api --output bundle.js"]],
  })

  routesDirectory = Option.String("--routes-directory", {
    required: true,
    description: "Directory containing the route files",
  })

  output = Option.String("-o,--output", {
    required: true,
    description: "Output file path for the bundled routes",
  })

  async execute() {
    const absoluteRoutesDir = path.resolve(process.cwd(), this.routesDirectory)
    const absoluteOutputFile = path.resolve(process.cwd(), this.output)

    // Generate the route map
    const routeMap = await createRoutePathMapFromDirectory(absoluteRoutesDir)

    // Generate the output file content
    const outputContent = `
import { WinterSpecRouteMap } from "@winterspec/types"

const routeMap: WinterSpecRouteMap = {
  ${Object.entries(routeMap)
    .map(([route, { relativePath }]) => `"${route}": () => import('${relativePath}')`)
    .join(",\n  ")}
}

export default routeMap
`

    // Write the output file
    await fs.writeFile(absoluteOutputFile, outputContent, "utf-8")

    this.context.stdout.write(`Routes bundled successfully to ${this.output}\n`)
  }
}
