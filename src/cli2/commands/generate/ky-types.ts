import fs from "node:fs/promises"
import { BaseCommand } from "../../base-command.js"
import { extractRouteSpecsFromAST } from "../../../lib/codegen/extract-route-specs-from-ast.js"
import Debug from "debug"

const debug = Debug("winterspec:CodeGenKyTypes")

export class CodeGenKyTypes extends BaseCommand {
  register(): void {
    debug("Registering generate-ky-types command")
    this.program
      .command("generate-ky-types")
      .description("Generate typed-ky compatible TypeScript interfaces")
      .option("-o, --output <path>", "Path to the output file")
      .option("--root <path>", "Path to your project root")
      .option("--tsconfig <path>", "Path to your tsconfig.json")
      .option("--routes-directory <path>", "Path to your routes directory")
      .action(async (options) => {
        debug("Running with config", options)
        const config = await this.loadConfig(options)
        debug("Config loaded.")

        debug("Extracting route specs from AST...")
        const { project, routes, renderType } = await extractRouteSpecsFromAST({
          tsConfigFilePath: config.tsconfigPath,
          routesDirectory: config.routesDirectory,
        })
        debug("Route specs extracted.")

        // Generate the ky-types interface
        const kyTypesContent2 = `
export interface ApiRoutes {
  ${routes
    .map(
      ({
        route,
        httpMethods,
        jsonResponseZodOutputType,
        jsonBodyZodInputType,
        queryParamsZodInputType,
      }) => {
        const methods = httpMethods.map((method) => {
          let methodDef = `${method}: {\n      `
          const parts = []

          if (jsonBodyZodInputType) {
            parts.push(`requestJson: ${renderType(jsonBodyZodInputType)}`)
          }
          if (queryParamsZodInputType) {
            parts.push(`searchParams: ${renderType(queryParamsZodInputType)}`)
          }
          if (jsonResponseZodOutputType) {
            parts.push(`responseJson: ${renderType(jsonResponseZodOutputType)}`)
          }

          methodDef +=
            parts.length > 0 ? parts.join(",\n      ") + "\n    }" : "{}"
          return methodDef
        })

        return `"${route}": {
    ${methods.join(",\n    ")}
  }`
      }
    )
    .join(",\n  ")}
}
`.trim()

        // Write the generated types to file
        await fs.writeFile(options.output ?? "ky-types.ts", kyTypesContent2)
        debug("Generated ky-types at", options.output ?? "ky-types.ts")
      })
  }
}
