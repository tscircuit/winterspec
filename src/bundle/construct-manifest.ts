import path from "node:path"
import { createRoutePathMapFromDirectory } from "src/routes/create-route-map-from-directory.js"

const alphabet = "zyxwvutsrqponmlkjihgfedcba"

const getRandomId = (length: number): string => {
  let str = ""
  let num = length
  while (num--) str += alphabet[(Math.random() * alphabet.length) | 0]
  return str
}

interface ConstructManifestOptions {
  routesDirectory: string
  bundledAdapter?: "wintercg-minimal"
}

export const constructManifest = async (options: ConstructManifestOptions) => {
  const routeMap = await createRoutePathMapFromDirectory(
    options.routesDirectory
  )

  const routes = Object.entries(routeMap).map(([route, { relativePath }]) => {
    return {
      route,
      relativePath,
      id: getRandomId(16),
    }
  })

  return `
import {getRouteMatcher} from "next-route-matcher"
import { makeRequestAgainstWinterSpec } from "winterspec"

${routes
  .map(
    ({ id, relativePath }) =>
      `import * as ${id} from "${path.resolve(
        path.join(options.routesDirectory, relativePath)
      )}"`
  )
  .join("\n")
  .replace(/\\/g, "/")}

const routeMapWithHandlers = {
  ${routes.map(({ id, route }) => `"${route}": ${id}.default`).join(",")}
}

const winterSpec = {
  routeMatcher: getRouteMatcher(Object.keys(routeMapWithHandlers)),
  routeMapWithHandlers,
  makeRequest: async (req, options) => makeRequestAgainstWinterSpec(winterSpec, options)(req)
}

${
  options.bundledAdapter === "wintercg-minimal"
    ? `
import {addFetchListener} from "winterspec/adapters/wintercg-minimal"
addFetchListener(winterSpec)
`
    : "export default winterSpec"
}
  `.trim()
}
