import { getMatchingFilePaths } from "make-vfs"

export const createRoutePathMapFromDirectory = async (
  directoryPath: string
): Promise<Record<string, { relativePath: string }>> => {
  const filePaths = await getMatchingFilePaths({
    dirPath: directoryPath,
    extensions: ["ts", "tsx"],
  })

  const routes: Record<string, { relativePath: string }> = {}
  for (let path of filePaths) {
    let routeWithSlash = path
    if (!path.startsWith("/")) {
      routeWithSlash = `/${path}`
    }

    if (path.endsWith("index.ts") || path.endsWith("index.tsx")) {
      routes[`${routeWithSlash.replace(/\/index\.tsx*$/g, "")}`] = {
        relativePath: path,
      }
    } else {
      routes[`${routeWithSlash.replace(/\.tsx*$/g, "")}`] = {
        relativePath: path,
      }
    }
  }

  // Fix root route
  if (routes[""]) {
    routes["/"] = routes[""]
    delete routes[""]
  }

  return routes
}
