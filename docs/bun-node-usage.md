# Bun/Node Usage

WinterSpec can be used in Bun/Node relatively easily! In your development environment,
running `winterspec dev` should get things running pretty quick, but you can also
create a server with dynamic imports using the node adapter.

## Bun

```ts
import { createFetchHandlerFromRoutes } from "winterspec/adapters/node"

Bun.serve({
  port: 3000,
  fetch: createFetchHandlerFromRoutes("./routes"),
})
```

## Node

```ts
import { startServerFromRoutesDir } from "winterspec/adapters/node"

const server = startServerFromRoutesDir("./routes", {
  port: 3000,
})
```

## Test Fixtures

It's always a good idea to have an easy way to test your code by running a full
server. Here's an example of how you might do that in bun:

```ts
import { startServerFromRoutesDir } from "winterspec/adapters/node"
import { afterEach, beforeEach } from "bun:test"
import defaultAxios from "redaxios"

beforeEach(async () => {
  const server = await startServerFromRoutesDir("./routes", {
    port: 3001 + Math.floor(Math.random() * 999),
    middleware: [
      (req, ctx, next) => {
        ctx.res.setHeader("x-test", "true")
        // This is also a good place to fixture a database!
        return next()
      },
    ],
  })
  const url = `http://localhost:${server.port}`
  const axios = defaultAxios.create({
    baseURL: url,
  })
  global.fixture = {
    url,
    server,
    axios,
  }
})

afterEach(() => {
  global.fixture.server.stop()
})
```
