# Embedding as a module

You can embed an WinterSpec service inside other applications.

For example, say you want to embed an API for ships in Star Wars inside an API for all things Star Wars:

```ts
// api/ships/[...modulePath].ts
import { withWinterSpec } from "../with-winter-spec"
import { z } from "zod"

export default withWinterSpec({
  auth: "none",
  methods: ["GET"],
})((req) => {
  // This is a thin wrapper over `await import()` to enable types, you can use `import * as shipsApi from "@acme/star-wars-ships` directly if you want.
  const shipsApi = await loadBundle("@acme/star-wars-ships")

  // The /ships base path is automatically removed from the request path that the ships API sees.
  return shipsApi.makeRequest(req, {
    // This is optional, you can add middleware if you want that runs before any other middleware in the ships API. This is often useful for dependency injection.
    middleware: [],
  })
})
```
