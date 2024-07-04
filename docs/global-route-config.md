# Global route config

Every WinterSpec project has a global wrapper defined in a file often called `with-winter-spec.ts`. This defines things like:

- Authentication methods
- Global middleware
- Metadata for code generation

Here's an example:

```ts
// src/with-winter-spec.ts
import { createWithWinterSpec } from "winterspec"

export const withWinterSpec = createWithWinterSpec({
  beforeAuthMiddleware: [],
  authMiddleware: {},
  afterAuthMiddleware: [],

  // Defaults to true. When true, all JSON responses are validated against the route's response schema.
  shouldValidateResponses: true,
})
```
