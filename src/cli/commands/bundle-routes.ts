import { Command, Option } from "clipanion"
import path from "path"
import fs from "fs/promises"
import { createRoutePathMapFromDirectory } from "../../routes/create-route-map-from-directory"
import { WinterSpecRouteMap } from "../../types/winter-spec.js"

export class BundleRoutesCommand extends Command {
  static paths = [["bundle-routes"]]

  routesDir = Option.String()
  outputFile = Option.String()

  async execute() {
    const absoluteRoutesDir = path.resolve(process.cwd(), this.routesDir)
    const absoluteOutputFile = path.resolve(process.cwd(), this.outputFile)

    // Generate the route map
    const routeMap = await createRoutePathMapFromDirectory(absoluteRoutesDir)

    // Generate the output file content
    const outputContent = `
import { WinterSpecRouteMap } from "path/to/winter-spec-types"

const routeMap: WinterSpecRouteMap = {
  ${Object.entries(routeMap)
    .map(([route, { relativePath }]) => `"${route}": () => import('${relativePath}')`)
    .join(",\n  ")}
}

export default routeMap
`

    // Write the output file
    await fs.writeFile(absoluteOutputFile, outputContent, "utf-8")

    this.context.stdout.write(`Routes bundled successfully to ${this.outputFile}\n`)
  }
}
