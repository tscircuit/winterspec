import test from "ava"
import { bundle } from "../../src/bundle/bundle.js"
import type { ResolvedWinterSpecConfig } from "../../src/config/utils.js"
import path from "node:path"

const createTestConfig = (): ResolvedWinterSpecConfig => ({
  rootDirectory: path.join(process.cwd(), "examples", "hello-world"),
  routesDirectory: path.join(
    process.cwd(),
    "examples",
    "hello-world",
    "routes"
  ),
  tsconfigPath: path.join(process.cwd(), "tsconfig.json"),
  platform: "wintercg-minimal",
})

test("bundle with inline sourcemap (default)", async (t) => {
  const config = createTestConfig()
  const result = await bundle(config)

  t.is(typeof result.code, "string")
  t.true(result.code.length > 0)
  t.is(result.sourceMap, undefined)
  t.true(result.code.includes("sourceMappingURL=data:application/json;base64,"))
})

test("bundle with inline sourcemap (explicit)", async (t) => {
  const config = createTestConfig()
  const result = await bundle(config, { sourcemap: "inline" })

  t.is(typeof result.code, "string")
  t.true(result.code.length > 0)
  t.is(result.sourceMap, undefined)
  t.true(result.code.includes("sourceMappingURL=data:application/json;base64,"))
})

test("bundle with external sourcemap", async (t) => {
  const config = createTestConfig()
  const result = await bundle(config, { sourcemap: "external" })

  t.is(typeof result.code, "string")
  t.is(typeof result.sourceMap, "string")
  t.true(result.code.length > 0)
  t.true((result.sourceMap as string).length > 0)
  t.false(result.code.includes("sourceMappingURL"))

  // Verify source map is valid JSON
  const sourceMapObj = JSON.parse(result.sourceMap as string)
  t.is(sourceMapObj.version, 3)
  t.true(Array.isArray(sourceMapObj.sources))
  t.is(typeof sourceMapObj.mappings, "string")
})

test("bundle without sourcemap", async (t) => {
  const config = createTestConfig()
  const result = await bundle(config, { sourcemap: false })

  t.is(typeof result.code, "string")
  t.true(result.code.length > 0)
  t.is(result.sourceMap, undefined)
  t.false(result.code.includes("sourceMappingURL"))
})

test("external sourcemap contains original source references", async (t) => {
  const config = createTestConfig()
  const result = await bundle(config, { sourcemap: "external" })

  const sourceMapObj = JSON.parse(result.sourceMap as string)
  t.true(
    sourceMapObj.sources.some((source: string) =>
      source.includes("routes/index.ts")
    )
  )
  t.true(
    sourceMapObj.sources.some((source: string) =>
      source.includes("src/with-winter-spec.ts")
    )
  )
})

test("bundle sizes comparison", async (t) => {
  const config = createTestConfig()

  const [noSourceMap, inlineSourceMap, externalResult] = await Promise.all([
    bundle(config, { sourcemap: false }),
    bundle(config, { sourcemap: "inline" }),
    bundle(config, { sourcemap: "external" }),
  ])

  // External sourcemap code should be similar size to no sourcemap
  t.true(Math.abs(noSourceMap.code.length - externalResult.code.length) < 100)

  // Inline sourcemap should be significantly larger
  t.true(inlineSourceMap.code.length > noSourceMap.code.length * 2)

  // External sourcemap file should exist and have reasonable size
  t.true((externalResult.sourceMap as string).length > 1000)
})

test("bundle works with node platform", async (t) => {
  const config: ResolvedWinterSpecConfig = {
    ...createTestConfig(),
    platform: "node",
  }

  const result = await bundle(config, { sourcemap: "external" })

  t.is(typeof result.code, "string")
  t.is(typeof result.sourceMap, "string")
  t.true(result.code.length > 0)
  t.true((result.sourceMap as string).length > 0)
})
