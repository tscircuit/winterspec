import test from "ava"
import { getTestCLI } from "tests/fixtures/get-test-cli.js"
import os from "node:os"
import path from "node:path/posix"
import { randomUUID } from "node:crypto"
import { fileURLToPath } from "node:url"
import fs from "node:fs/promises"
import { Project } from "ts-morph"

test("CLI codegen route-types command produces the expected route types", async (t) => {
  const cli = await getTestCLI(t)

  const testFileDirectory = path.dirname(fileURLToPath(import.meta.url))

  const tempPath = path.join(os.tmpdir(), `${randomUUID()}.d.ts`)
  const appDirectoryPath = path.join(testFileDirectory, "api")
  const tsconfigPath = path.join(testFileDirectory, "tsconfig.json")
  const execution = cli.executeCommand([
    "codegen",
    "route-types",
    "-o",
    tempPath,
    "--routes-directory",
    appDirectoryPath,
    "--tsconfig",
    tsconfigPath,
  ])
  const cliResult = await execution.waitUntilExit()
  t.is(cliResult.exitCode, 0)

  // Test created file
  const routesDTs = await fs.readFile(tempPath, "utf-8")
  t.log("Generated file:")
  t.log(routesDTs)

  const project = new Project({
    compilerOptions: { strict: true },
  })

  project.createSourceFile("routes.ts", routesDTs)
  project.createSourceFile(
    "tests.ts",
    `
    import { expectTypeOf } from "expect-type"
    import {Routes, RouteResponse, RouteRequestBody, RouteRequestParams} from "./routes"

    type ExpectedRoutes = {
      // Basic smoke test
      "/foo": {
        route: "/foo"
        method: "GET" | "POST"
        jsonResponse: {
          foo: {
            id: string
            name: string
          }
        }
        jsonBody: {
          foo_id: string
        }
      }
      // A route that imports part of its spec from /foo
      "/importer": {
        route: "/importer"
        method: "PUT"
        jsonResponse: {
          foo: {
            id: string
            name: string
          }
        }
      }
      // Route that uses z.union
      "/union": {
        route: "/union"
        method: "GET" | "POST"
        jsonResponse: {
          foo_id: string
        } | boolean[]
        jsonBody: {
          foo_id: string
        }
      }
      // Route with many parameters to make sure they're not truncated
      "/many-params": {
        route: "/many-params"
        method: "GET" | "POST"
        jsonResponse: {
          foo: {
            id: string
            name: string
          }
        }
        jsonBody: {
          this_has: string
          many: string
          params: string
          to: string
          make: string
          sure: string
          type_is: string
          fully: string
          expanded: string
          and: {
            this_has: string
            many: string
            params: string
            to: string
            make: string
            sure: string
            type_is: string
            fully: string
            expanded: string
          }
        }
      }
      // Route that uses .transform()
      "/param-transform": {
        route: "/param-transform"
        method: "GET" | "POST"
        jsonResponse: {
          ok: boolean
        }
        jsonBody: {
          foo_id: string
        }
      }
      // Query params
      "/query-params": {
        route: "/query-params"
        method: "GET"
        queryParams: {
          foo_id: string
        }
      }
    }

    expectTypeOf<Routes>().toEqualTypeOf<ExpectedRoutes>()

    expectTypeOf<RouteResponse<"/param-transform">>().toEqualTypeOf<{ok: boolean}>()
    expectTypeOf<RouteRequestBody<"/param-transform">>().toEqualTypeOf<{foo_id: string}>()
    expectTypeOf<RouteRequestParams<"/query-params">>().toEqualTypeOf<{foo_id: string}>()
  `
  )

  const diagnostics = project.getPreEmitDiagnostics()

  if (diagnostics.length > 0) {
    t.log(project.formatDiagnosticsWithColorAndContext(diagnostics))

    t.fail(
      "Test TypeScript project using generated routes threw compile errors"
    )
  }

  t.pass()
})
