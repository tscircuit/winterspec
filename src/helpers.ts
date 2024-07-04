import { WinterSpecRouteBundle } from "./types/index.js"

/**
 * Loads a file created by `winterspec bundle` and returns the default export.
 * This is a very thin wrapper over `import()` that adds some types.
 */
export const loadBundle = async (
  bundlePath: string
): Promise<WinterSpecRouteBundle> => {
  const bundle = await import(bundlePath)
  // If the file is imported as CJS, the default export is nested.
  // Naming this with .mjs seems to break some on-the-fly transpiling tools downstream.
  return bundle.default.default ?? bundle.default
}
