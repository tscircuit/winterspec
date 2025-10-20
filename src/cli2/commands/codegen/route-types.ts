import fs from "node:fs/promises"
import { BaseCommand } from "../../base-command.js"
import { extractRouteSpecsFromAST } from "../../../lib/codegen/extract-route-specs-from-ast.js"
import Debug from "debug"

const debug = Debug("winterspec:CodeGenRouteTypes")

export class CodeGenRouteTypes extends BaseCommand {
  register(): void {
    debug("Registering codegen-route-types command")
    this.program
      .command("codegen-route-types")
      .description("Generate TypeScript types from route specifications")
      .requiredOption("-o, --output <path>", "Path to the output file")
      .option("--root <path>", "Path to your project root")
      .option("--tsconfig <path>", "Path to your tsconfig.json")
      .option("--routes-directory <path>", "Path to your routes directory")
      .action(async (options) => {
        debug("Running with config", options)
        const config = await this.loadConfig(options)
        debug("Config loaded.")

        const { routes, renderType } = await extractRouteSpecsFromAST({
          tsConfigFilePath: config.tsconfigPath,
          routesDirectory: config.routesDirectory,
        })

        const routeEntries = routes.map(
          ({
            route,
            httpMethods,
            jsonResponseZodOutputType,
            jsonBodyZodInputType,
            commonParamsZodInputType,
            queryParamsZodInputType,
            urlEncodedFormDataZodInputType,
          }) => {
            const parts = [
              `route: "${route}"`,
              `method: ${httpMethods.map((m) => `"${m}"`).join(" | ")}`,
            ]
            if (jsonResponseZodOutputType) {
              parts.push(
                `jsonResponse: ${renderType(jsonResponseZodOutputType)}`
              )
            }
            if (jsonBodyZodInputType) {
              parts.push(`jsonBody: ${renderType(jsonBodyZodInputType)}`)
            }
            if (commonParamsZodInputType) {
              parts.push(
                `commonParams: ${renderType(commonParamsZodInputType)}`
              )
            }
            if (queryParamsZodInputType) {
              parts.push(`queryParams: ${renderType(queryParamsZodInputType)}`)
            }
            if (urlEncodedFormDataZodInputType) {
              parts.push(
                `urlEncodedFormData: ${renderType(
                  urlEncodedFormDataZodInputType
                )}`
              )
            }

            return `  "${route}": {\n    ${parts.join("\n    ")}\n  }`
          }
        )

        const content =
          `export type Routes = {\n${routeEntries.join("\n")}\n}\n\n` +
          `type ExtractOrUnknown<T, Key extends string> = Key extends keyof T ? T[Key] : unknown\n\n` +
          `export type RouteResponse<Path extends keyof Routes> = ExtractOrUnknown<Routes[Path], "jsonResponse">\n` +
          `export type RouteRequestBody<Path extends keyof Routes> = ExtractOrUnknown<Routes[Path], "jsonBody"> & ExtractOrUnknown<Routes[Path], "commonParams">\n` +
          `export type RouteRequestParams<Path extends keyof Routes> = ExtractOrUnknown<Routes[Path], "queryParams"> & ExtractOrUnknown<Routes[Path], "commonParams">\n`

        await fs.writeFile(options.output, content)
      })
  }
}
