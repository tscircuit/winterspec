# Bundling and deployment

Run `winterspec bundle -o dist/built.js`. Then, depending on your target:

### Node.js

Create an `entrypoint.mjs` file:

```js
import { startServer } from "winterspec/adapters/node"
import bundle from "./dist/built"

startServer(bundle, { port: 3000 })
```

### WinterCG (Cloudflare Workers/Vercel Edge Functions)

Create an `entrypoint.mjs` file:

```js
import { addFetchListener } from "winterspec/adapters/wintercg-minimal"
import bundle from "./dist/built"
addFetchListener(winterSpec)
```

Because WinterCG doesn't allow `import`s, you'll need to bundle a second time with a tool like [tsup](https://github.com/egoist/tsup): `tsup entrypoint.mjs`.
