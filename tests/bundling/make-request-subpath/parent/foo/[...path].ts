import { WinterSpecRequest, loadBundle } from "src/index.js"

export default async (req: WinterSpecRequest) => {
  const bundle = await loadBundle("./built-child.js")
  return bundle.makeRequest(req)
}
