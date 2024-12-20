import { Option } from "clipanion"
import fs from "node:fs/promises"
import { BaseCommand } from "src/cli/base-command.js"
import { ResolvedWinterSpecConfig } from "src/config/utils.js"
import { extractRouteSpecsFromAST } from "src/lib/codegen/extract-route-specs-from-ast.js"
import Debug from "debug"

const debug = Debug("winterspec:CodeGenRouteTypes")

export class CodeGenRouteTypes extends BaseCommand {
  static paths = [[`codegen`, `route-types`]]

  outputPath = Option.String("--output,-o", {
    description: "Path to the output file",
    required: true,
  })

  async run(config: ResolvedWinterSpecConfig) {
    debug("Running with config", config)
    const { project, routes, renderType } = await extractRouteSpecsFromAST({
      tsConfigFilePath: config.tsconfigPath,
      routesDirectory: config.routesDirectory,
    })

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
        ? `urlEncodedFormData: ${renderType(urlEncodedFormDataZodInputType)}`
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
      this.outputPath,
      result.getFiles().find((f) => f.filePath.includes("/manifest.d.ts"))!.text
    )
  }
}
