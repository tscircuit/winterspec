import path from "node:path"
import fs from "node:fs/promises"
import { bundleRequire } from "bundle-require"
import { WinterSpecConfig } from "src/config/config.js"
import { SetRequired } from "type-fest"
import Debug from "debug"

declare global {
  const Bun: any
}

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
  const debug = Debug("winterspec:validateConfig")
  debug("Validating config...")

  try {
    await fs.stat(config.routesDirectory)
    debug("Routes directory found: %s", config.routesDirectory)
  } catch (error) {
    throw new Error(`Could not find routes directory ${config.routesDirectory}`)
  }

  try {
    await fs.stat(config.tsconfigPath)
    debug("Tsconfig.json found: %s", config.tsconfigPath)
  } catch (error) {
    throw new Error(`Could not find tsconfig.json at ${config.tsconfigPath}`)
  }

  return config
}

export const loadConfig = async (
  rootDirectory: string,
  overrides?: Partial<WinterSpecConfig>
) => {
  const debug = Debug("winterspec:loadConfig")
  let loadedConfig: WinterSpecConfig = {}

  let configInRootExists = false
  const potentialConfigPath = path.join(rootDirectory, "winterspec.config.ts")
  debug("Checking for config in root directory: %s", potentialConfigPath)
  try {
    await fs.stat(potentialConfigPath)
    configInRootExists = true
    debug("Config found in root directory: %s", potentialConfigPath)
  } catch {
    debug("No config found in root directory: %s", potentialConfigPath)
  }

  if (configInRootExists) {
    debug("Loading config from root directory: %s", potentialConfigPath)
    let config: any
    if (typeof Bun !== "undefined") {
      debug("Bun is available, using dynamic import")
      config = await import(potentialConfigPath).catch((e) => {
        debug("failed to dynamically import config", e)
        return null
      })
    } else {
      debug("Calling bundleRequire...")
      const { mod } = await bundleRequire({
        filepath: potentialConfigPath,
      })
      config = mod.default
    }

    if (!config) {
      debug("No config found in root directory: %s", potentialConfigPath)
      throw new Error(
        `Could not find a default export in ${potentialConfigPath}`
      )
    }

    debug("Config loaded from root directory: %s", potentialConfigPath)

    loadedConfig = config
  }

  debug("Validating config...")
  return await validateConfig(
    resolveConfig({
      rootDirectory,
      ...loadedConfig,
      ...cloneObjectAndDeleteUndefinedKeys(overrides ?? {}),
    })
  )
}
