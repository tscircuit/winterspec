import type { WinterSpecAdapter } from "src/types/winter-spec.js"
import type { WinterSpecFetchEvent } from "src/types/web-handler.js"

export const addFetchListener: WinterSpecAdapter = (edgeSpec) => {
  addEventListener("fetch", async (event) => {
    // TODO: find a better way to cast this
    const fetchEvent = event as unknown as WinterSpecFetchEvent

    fetchEvent.respondWith(await edgeSpec.makeRequest(fetchEvent.request))
  })
}
