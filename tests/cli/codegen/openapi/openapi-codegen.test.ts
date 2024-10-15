import test, { ExecutionContext } from "ava"
import { getTestCLI } from "tests/fixtures/get-test-cli.js"
import os from "node:os"
import path from "node:path/posix"
import { randomUUID } from "node:crypto"
import { fileURLToPath } from "node:url"
import fs from "node:fs/promises"
import { Validator } from "@seriousme/openapi-schema-validator"
import {
  OpenAPIObject,
  ParameterObject,
  RequestBodyObject,
  SchemaObject,
} from "openapi3-ts/oas31"

const generateOpenAPI = async (t: ExecutionContext): Promise<OpenAPIObject> => {
  const cli = await getTestCLI(t)

  const testFileDirectory = path.dirname(fileURLToPath(import.meta.url))

  const tempPath = path.join(os.tmpdir(), `${randomUUID()}.json`)
  const execution = cli.executeCommand([
    "codegen",
    "openapi",
    "-o",
    tempPath,
    "--root",
    testFileDirectory,
  ])
  const cliResult = await execution.waitUntilExit()
  t.is(cliResult.exitCode, 0)

  // Test created file
  const openAPIJson = await fs.readFile(tempPath, "utf-8")
  t.log("Generated file:")
  t.log(openAPIJson)

  return JSON.parse(openAPIJson)
}

test("CLI codegen openapi produces a compliant OpenAPI spec", async (t) => {
  const openapi = await generateOpenAPI(t)

  const validator = new Validator()
  const result = await validator.validate(openapi)
  if (!result.valid) {
    t.log(result.errors)
    t.fail("Generated OpenAPI spec was not valid")
  }
})

test("commonParams is handled correctly when paired with jsonBody", async (t) => {
  const openapi = await generateOpenAPI(t)
  const route = openapi.paths?.["/common-and-json-params"]
  if (!route) {
    return t.fail("Missing expected route")
  }

  const { get, post } = route
  // parameter in commonParams is required in the query for GET...
  t.true(
    (
      get?.parameters?.find(
        (p) => (p as ParameterObject).name === "user_id"
      ) as ParameterObject
    ).required
  )
  // ...but not required in the query for POST...
  t.falsy(
    (
      post?.parameters?.find(
        (p) => (p as ParameterObject).name === "user_id"
      ) as ParameterObject
    ).required
  )
  // ...and it should be optional in the POST body
  const postBody = post?.requestBody as RequestBodyObject
  const postBodySchema = postBody.content["application/json"]
    .schema as SchemaObject
  t.true(
    postBodySchema.allOf?.some(
      (props) =>
        !(props as SchemaObject).required &&
        (props as SchemaObject).properties?.user_id
    )
  )
})
