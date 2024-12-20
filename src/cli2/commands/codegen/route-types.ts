import { Command } from "commander"
import fs from "node:fs/promises"
import { BaseCommand } from "../../base-command.js"
import { ResolvedWinterSpecConfig } from "src/config/utils.js"
import { extractRouteSpecsFromAST } from "src/lib/codegen/extract-route-specs-from-ast.js"
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
      .option("--platform <platform>", "The platform to bundle for")
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

        project.createSourceFile(
          "manifest.ts",
          `
          import {z} from "zod"

          export type Routes = {
    ${routes
      .map(
        ({
          route,
          httpMethods,
          jsonResponseZodOutputType,
          jsonBodyZodInputType,
          commonParamsZodInputType,
          queryParamsZodInputType,
          urlEncodedFormDataZodInputType,
        }) => {
          return `  "${route}": {
        route: "${route}"
        method: ${httpMethods.map((m) => `"${m}"`).join(" | ")}
        ${
          jsonResponseZodOutputType
            ? `jsonResponse: ${renderType(jsonResponseZodOutputType)}`
            : ""
        }
        ${
          jsonBodyZodInputType
            ? `jsonBody: ${renderType(jsonBodyZodInputType)}`
            : ""
        }
        ${
          commonParamsZodInputType
            ? `commonParams: ${renderType(commonParamsZodInputType)}`
            : ""
        }
        ${
          queryParamsZodInputType
            ? `queryParams: ${renderType(queryParamsZodInputType)}`
            : ""
        }
        ${
          urlEncodedFormDataZodInputType
            ? `urlEncodedFormData: ${renderType(
                urlEncodedFormDataZodInputType
              )}`
            : ""
        }
      }`
        }
      )
      .join("\n")}
      }

      type ExtractOrUnknown<T, Key extends string> = Key extends keyof T ? T[Key] : unknown;

      export type RouteResponse<Path extends keyof Routes> = ExtractOrUnknown<Routes[Path], "jsonResponse">
      export type RouteRequestBody<Path extends keyof Routes> = ExtractOrUnknown<Routes[Path], "jsonBody"> & ExtractOrUnknown<Routes[Path], "commonParams">
      export type RouteRequestParams<Path extends keyof Routes> = ExtractOrUnknown<Routes[Path], "queryParams"> & ExtractOrUnknown<Routes[Path], "commonParams">
      `
        )

        const result = project.emitToMemory({ emitOnlyDtsFiles: true })
        await fs.writeFile(
          options.output,
          result.getFiles().find((f) => f.filePath.includes("/manifest.d.ts"))!
            .text
        )
      })
  }
}
