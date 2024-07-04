# Adding WinterSpec to an existing project

1. `npm add winterspec -D`
2. Add `.winterspec` to your `.gitignore`.
3. Create `winterspec.config.ts` at your project root:

```typescript
import { defineConfig } from "winterspec"

export default defineConfig({
  // This an example, adjust as needed
  routesDirectory: "./src/api",
})
```

4. Create `with-winter-spec.ts`:

```typescript
import { createWithWinterSpec } from "winterspec"

export const withRouteSpec = createWithWinterSpec({
  apiName: "An Example API",
  productionServerUrl: "https://example.com",
  beforeAuthMiddleware: [],
  authMiddleware: {},
})
```

5. Create a test API route in the directory you defined in `winterspec.config.ts`:

```typescript
// src/api/hello-world.ts
import { withRouteSpec } from "../with-winter-spec"

export default withRouteSpec({
  methods: ["GET"],
})(() => {
  return new Response("Hello, world!")
})
```

6. Add a script to your `package.json`:

```json
{
  "scripts": {
    "dev": "winterspec dev"
  }
}
```

7. Run `npm run dev` and visit `http://localhost:3000/hello-world` to see your API route!
