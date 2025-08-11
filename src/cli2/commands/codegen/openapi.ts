import { Command } from "commander"
import { randomUUID } from "node:crypto"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import {
  OpenApiBuilder,
  OperationObject,
  ParameterObject,
  PathItemObject,
} from "openapi3-ts/oas31"
import { bundle } from "src/bundle/bundle.js"
import { BaseCommand } from "../../base-command.js"
import { loadBundle } from "src/helpers.js"
import { generateSchema } from "@anatine/zod-openapi"
import { ZodObject, ZodTypeAny } from "zod"
import camelcase from "camelcase"
import { pathToFileURL } from "node:url"

const replaceFirstCharToLowercase = (str: string) => {
  if (str.length === 0) {
    return str
  }

  const firstChar = str.charAt(0).toLowerCase()
  return firstChar + str.slice(1)
}

const transformPathToOperationId = (path: string): string => {
  const parts = path
    .replace(/-/g, "_")
    .split("/")
    .filter((part) => part !== "")
  const transformedParts = parts.map((part) => {
    if (part.startsWith("[") && part.endsWith("]")) {
      // Convert [param] to ByParam
      const serviceName = part.slice(1, -1)
      const words = serviceName.split("_")
      const capitalizedWords = words.map(
        (word) => word.charAt(0).toUpperCase() + word.slice(1)
      )
      return `By${capitalizedWords.join("")}`
    } else {
      // Convert api_path to ApiPath
      const words = part.split("_")
      const capitalizedWords = words.map(
        (word) => word.charAt(0).toUpperCase() + word.slice(1)
      )
      return capitalizedWords.join("")
    }
  })

  return replaceFirstCharToLowercase(transformedParts.join(""))
}

const HTTP_METHODS_WITHOUT_BODY = ["get", "head"]

export class CodeGenOpenAPI extends BaseCommand {
  register(): void {
    this.program
      .command("codegen-openapi")
      .description("Generate OpenAPI specification from route definitions")
      .requiredOption("-o, --output <path>", "Path to the output file")
      .option("--root <path>", "Path to your project root")
      .option("--tsconfig <path>", "Path to your tsconfig.json")
      .option("--routes-directory <path>", "Path to your routes directory")
      .option("--platform <platform>", "The platform to bundle for")
      .action(async (options) => {
        const config = await this.loadConfig(options)

        const tempBundlePath = path.join(os.tmpdir(), `${randomUUID()}.mjs`)
        const bundleResult = await bundle(config)
        await fs.writeFile(tempBundlePath, bundleResult.code)
        const runtimeBundle = await loadBundle(
          pathToFileURL(tempBundlePath).href
        )

        const globalRouteSpec = Object.values(
          runtimeBundle.routeMapWithHandlers
        ).find((r) => Boolean(r._globalSpec))?._globalSpec
        if (!globalRouteSpec) {
          throw new Error(
            "You must have at least one route that uses the wrapper provided by createWithWinterSpec()."
          )
        }

        const builder = new OpenApiBuilder({
          openapi: "3.0.0",
          info: {
            title: globalRouteSpec.openapi?.apiName ?? "WinterSpec API",
            version: "1.0.0", // todo
          },
          ...(globalRouteSpec.openapi?.productionServerUrl
            ? {
                servers: [
                  {
                    url: globalRouteSpec.openapi.productionServerUrl,
                  },
                ],
              }
            : {}),
        })

        for (const [path, { _routeSpec }] of Object.entries(
          runtimeBundle.routeMapWithHandlers
        )) {
          if (!_routeSpec) {
            continue
          }

          const pathItemObject: PathItemObject = {}

          for (const method of _routeSpec.methods) {
            let { commonParams } = _routeSpec
            const areCommonParamsRequiredInQuery =
              HTTP_METHODS_WITHOUT_BODY.includes(method.toLowerCase())
            if (!areCommonParamsRequiredInQuery) {
              if (commonParams?._def.typeName === "ZodObject") {
                commonParams = (commonParams as ZodObject<any>).partial()
              } else {
                commonParams = commonParams?.optional()
              }
            }

            let requestJsonBody: ZodTypeAny | null = null
            if (
              _routeSpec.jsonBody &&
              !HTTP_METHODS_WITHOUT_BODY.includes(method.toLowerCase())
            ) {
              requestJsonBody = _routeSpec.jsonBody
            }

            if (commonParams) {
              requestJsonBody = requestJsonBody
                ? requestJsonBody.and(commonParams)
                : commonParams
            }

            let requestQuery: ZodTypeAny | null = null
            if (_routeSpec.queryParams) {
              requestQuery = _routeSpec.queryParams
            }

            if (commonParams) {
              requestQuery = requestQuery
                ? requestQuery.and(commonParams)
                : commonParams
            }

            const operation: OperationObject = {
              summary: path,
              responses: {
                200: {
                  description: "OK",
                },
                400: {
                  description: "Bad Request",
                },
                // todo: omit when auth: "none"
                401: {
                  description: "Unauthorized",
                },
              },
            }

            if (requestJsonBody) {
              operation.requestBody = {
                content: {
                  "application/json": {
                    schema: generateSchema(requestJsonBody),
                  },
                },
              }
            }

            if (requestQuery) {
              const schema = generateSchema(requestQuery)
              if (schema.properties) {
                const parameters: ParameterObject[] = Object.keys(
                  schema.properties
                ).map((name) => ({
                  name,
                  in: "query",
                  schema: schema.properties?.[name],
                  required: schema.required?.includes(name),
                }))

                operation.parameters = parameters
              }
            }

            if (_routeSpec.jsonResponse) {
              // todo: responses other than 200
              operation.responses[200].content = {
                "application/json": {
                  schema: generateSchema(_routeSpec.jsonResponse),
                },
              }
            }

            pathItemObject[method.toLowerCase() as keyof PathItemObject] = {
              ...operation,
              operationId: `${transformPathToOperationId(path)}${camelcase(
                method,
                {
                  pascalCase: true,
                }
              )}`,
            }
          }

          // Handle routes with multiple methods
          builder.addPath(path, pathItemObject)
        }

        await fs.writeFile(options.output, builder.getSpecAsJson(undefined, 2))
      })
  }
}
