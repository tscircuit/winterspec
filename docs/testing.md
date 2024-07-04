# Testing

WinterSpec aims to support all common test runners. If you don't see your test runner here, please open an issue.

WinterSpec test fixtures run a local dev server, so it supports your test runner's watch mode out of the box.

For the examples below, assume that there is a single `/health` endpoint that returns `OK`.

## AVA

Add this to your AVA config (in `package.json`, `ava.config.js`, or `ava.config.mjs`):

```js
{
  // your AVA config...
  watchMode: {
		ignoreChanges: [".winterspec"],
	}
}
```

You'll also need to install an optional peer dependency: `npm add @ava/get-port -D`.

Then, you can import a helper to start a dev server:

```typescript
import test from "ava"
import axios from "axios"
import { getTestServer } from "winterspec/testing/ava"

test("GET /health", async (t) => {
  const { port } = getTestServer(t)

  const healthResponse = await fetch(`http://localhost:${port}/health`)
  t.is(healthResponse.status, 200)
  t.is(await healthResponse.text(), "OK")
})
```

This helper is well-optimized. Under the hood it uses a singleton dev bundler, so your tests are speedy and concurrent runs aren't an issue.
