import { Option } from "clipanion"
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
import { BaseCommand } from "src/cli/base-command.js"
import { ResolvedEdgeSpecConfig } from "src/config/utils.js"
import { loadBundle } from "src/helpers.js"
import { extractRouteSpecsFromAST } from "src/lib/codegen/extract-route-specs-from-ast.js"
import { ts } from "ts-morph"
import { generateSchema } from "@anatine/zod-openapi"
import { ZodObject, ZodTypeAny } from "zod"
import camelcase from "camelcase"

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
  static paths = [[`codegen`, `openapi`]]

  outputPath = Option.String("--output,-o", {
    description: "Path to the output file",
    required: true,
  })

  async run(config: ResolvedEdgeSpecConfig) {
    const tempBundlePath = path.join(os.tmpdir(), `${randomUUID()}.js`)
    await fs.writeFile(tempBundlePath, await bundle(config))
    const runtimeBundle = await loadBundle(tempBundlePath)

    const { project, globalRouteSpecType } = await extractRouteSpecsFromAST({
      tsConfigFilePath: config.tsconfigPath,
      routesDirectory: config.routesDirectory,
    })

    const openapiProperty = globalRouteSpecType.getProperty("openapi")
    if (!openapiProperty) {
      // todo: shouldn't error
      throw new Error(
        "Your createWithEdgespec() argument is missing the `openapi` parameter."
      )
    }

    const openapiType = project
      .getTypeChecker()
      .getTypeOfSymbolAtLocation(
        openapiProperty,
        openapiProperty?.getValueDeclarationOrThrow()
      )

    const getStringLiteralPropertyFromOpenAPIDef = (propertyName: string) =>
      openapiType
        .getProperty(propertyName)
        ?.getValueDeclarationOrThrow()
        .getDescendantsOfKind(ts.SyntaxKind.StringLiteral)[0]
        .getLiteralText()

    const apiName = getStringLiteralPropertyFromOpenAPIDef("apiName")
    const productionServerUrl = getStringLiteralPropertyFromOpenAPIDef(
      "productionServerUrl"
    )

    const builder = new OpenApiBuilder({
      openapi: "3.0.0",
      info: {
        title: apiName ?? "EdgeSpec API",
        version: "1.0.0", // todo
      },
      ...(productionServerUrl
        ? {
            servers: [
              {
                url: productionServerUrl,
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
          operationId: `${transformPathToOperationId(path)}${camelcase(method, {
            pascalCase: true,
          })}`,
        }
      }

      // Handle routes with multiple methods
      builder.addPath(path, pathItemObject)
    }

    await fs.writeFile(this.outputPath, builder.getSpecAsJson(undefined, 2))
  }
}
