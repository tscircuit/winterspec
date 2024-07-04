# Config

This file is not required, but if you want to globally override a CLI default you can create a file called `winterspec.config.ts` or `winterspec.config.js` at your project root.

Here's an example:

```ts
import { defineConfig } from "winterspec"

// All parameters are optional
export default defineConfig({
  // This an example, adjust as needed
  routesDirectory: "./src/api",
  platform: "wintercg-minimal",
})
```

## Platforms

When using WinterSpec, you can choose to target two different types of platforms by setting the `platform` field in your `winterspec.config.ts`. It defaults to `wintercg-minimal`, and you should use this whenever possible for maximal compatibility.

However, the `wintercg-minimal` platform does not allow you to use native APIs in Node.js, Bun, or Deno—so if you need to import from `node:*` or use native dependencies, set this flag to `node`.

If the `platform` flag is unset or set to `wintercg-minimal`:

- route handlers will be run in an isolated environment when using the dev server to simulate edge environments
- `winterspec bundle` will produce a single file with no dependencies

If the `platform` flag is set to `node`:

- route handlers will be run in the same environment as the main process when using the dev server
- `winterspec bundle` will allow use of native APIs (including imports from `node:*`)
- `winterspec bundle` **will not** bundle dependencies listed in `package.json`
