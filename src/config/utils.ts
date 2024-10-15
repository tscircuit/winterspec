import path from "node:path/posix"
import fs from "node:fs/promises"
import { bundleRequire } from "bundle-require"
import { WinterSpecConfig } from "src/config/config.js"
import { SetRequired } from "type-fest"

const cloneObjectAndDeleteUndefinedKeys = <T extends Record<string, any>>(
  obj: T
) => {
  const clone = { ...obj }
  Object.keys(clone).forEach((key) => {
    if (clone[key] === undefined) {
      delete clone[key]
    }
  })
  return clone
}

const resolvePossibleRelativePath = (
  possibleRelativePath: string,
  configDirectory: string
) => {
  if (path.isAbsolute(possibleRelativePath)) {
    return possibleRelativePath
  }

  return path.resolve(configDirectory, possibleRelativePath)
}

export interface ResolvedWinterSpecConfig extends WinterSpecConfig {
  rootDirectory: string
  tsconfigPath: string
  routesDirectory: string
}

/**
 * Resolves relative paths and sets defaults for any missing values.
 */
export const resolveConfig = (
  config: SetRequired<WinterSpecConfig, "rootDirectory">
): ResolvedWinterSpecConfig => {
  const { rootDirectory, tsconfigPath, routesDirectory, ...rest } =
    cloneObjectAndDeleteUndefinedKeys(config)

  const resolvedRootDirectory = path.resolve(config.rootDirectory)

  return {
    rootDirectory: resolvedRootDirectory,
    tsconfigPath: resolvePossibleRelativePath(
      tsconfigPath ?? "tsconfig.json",
      resolvedRootDirectory
    ),
    routesDirectory: resolvePossibleRelativePath(
      routesDirectory ?? "api",
      resolvedRootDirectory
    ),
    platform: "wintercg-minimal",
    ...rest,
  }
}

const validateConfig = async (config: ResolvedWinterSpecConfig) => {
  try {
    await fs.stat(config.routesDirectory)
  } catch (error) {
    throw new Error(`Could not find routes directory ${config.routesDirectory}`)
  }

  try {
    await fs.stat(config.tsconfigPath)
  } catch (error) {
    throw new Error(`Could not find tsconfig.json at ${config.tsconfigPath}`)
  }

  return config
}

export const loadConfig = async (
  rootDirectory: string,
  overrides?: Partial<WinterSpecConfig>
) => {
  let loadedConfig: WinterSpecConfig = {}

  let configInRootExists = false
  const potentialConfigPath = path.join(rootDirectory, "winterspec.config.ts")
  try {
    await fs.stat(potentialConfigPath)
    configInRootExists = true
  } catch {}

  if (configInRootExists) {
    const {
      mod: { default: config },
    } = await bundleRequire({
      filepath: potentialConfigPath,
    })

    if (!config) {
      throw new Error(
        `Could not find a default export in ${potentialConfigPath}`
      )
    }

    loadedConfig = config
  }

  return await validateConfig(
    resolveConfig({
      rootDirectory,
      ...loadedConfig,
      ...cloneObjectAndDeleteUndefinedKeys(overrides ?? {}),
    })
  )
}
