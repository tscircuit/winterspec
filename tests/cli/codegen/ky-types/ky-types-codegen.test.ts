import test from "ava"
import { getTestCLI } from "tests/fixtures/get-test-cli.js"
import os from "node:os"
import path from "node:path"
import { randomUUID } from "node:crypto"
import { fileURLToPath } from "node:url"
import fs from "node:fs/promises"
import { Project } from "ts-morph"

test("CLI codegen ky-types command produces the expected ky types", async (t) => {
  const cli = await getTestCLI(t)

  const testFileDirectory = path.dirname(fileURLToPath(import.meta.url))

  const tempPath = path.join(os.tmpdir(), `${randomUUID()}.d.ts`)
  const appDirectoryPath = path.join(testFileDirectory, "api")
  const tsconfigPath = path.join(testFileDirectory, "tsconfig.json")
  const execution = cli.executeCommand([
    "generate-ky-types",
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
  //t.log("Generated file:")
  //t.log(routesDTs)

  const project = new Project({
    compilerOptions: { strict: true },
  })

  const routesSourceFile = project.createSourceFile("routes.ts", routesDTs)
  const testsSourceFile = project.createSourceFile(
    "tests.ts",
    `
import { expectTypeOf } from "expect-type";
import { ApiRoutes } from "./routes";

interface ExpectedApiRoutes {
  "/foo": {
    GET: {
      requestJson: { foo_id: string };
      responseJson: { foo: { id: string; name: string } };
    };
    POST: {
      requestJson: { foo_id: string };
      responseJson: { foo: { id: string; name: string } };
    };
  };
  "/importer": {
    PUT: {
      responseJson: { foo: { id: string; name: string } };
    };
  };
  "/many-params": {
    GET: {
      requestJson: {
        params: string;
        and: {
          params: string;
          many: string;
          this_has: string;
          to: string;
          make: string;
          sure: string;
          type_is: string;
          fully: string;
          expanded: string;
        };
        many: string;
        this_has: string;
        to: string;
        make: string;
        sure: string;
        type_is: string;
        fully: string;
        expanded: string;
      };
      responseJson: { foo: { id: string; name: string } };
    };
    POST: {
      requestJson: {
        params: string;
        and: {
          params: string;
          many: string;
          this_has: string;
          to: string;
          make: string;
          sure: string;
          type_is: string;
          fully: string;
          expanded: string;
        };
        many: string;
        this_has: string;
        to: string;
        make: string;
        sure: string;
        type_is: string;
        fully: string;
        expanded: string;
      };
      responseJson: { foo: { id: string; name: string } };
    };
  };
  "/param-transform": {
    GET: {
      requestJson: { foo_id: string };
      responseJson: { ok: boolean };
    };
    POST: {
      requestJson: { foo_id: string };
      responseJson: { ok: boolean };
    };
  };
  "/query-params": {
    GET: {
      searchParams: { foo_id: string };
    };
  };
  "/union": {
    GET: {
      requestJson: { foo_id: string };
      responseJson: { foo_id: string } | boolean[];
    };
    POST: {
      requestJson: { foo_id: string };
      responseJson: { foo_id: string } | boolean[];
    };
  };
}
expectTypeOf<ApiRoutes>().toEqualTypeOf<ExpectedApiRoutes>();

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
