# Bun/Node Usage

WinterSpec can be used in Bun/Node relatively easily! In your development environment,
running `winterspec dev` should get things running pretty quick, but you can also
create a server with dynamic imports using the node adapter.

## Bun

```ts
import { createFetchHandlerFromDir } from "winterspec/adapters/node"

const serverFetch = await createFetchHandlerFromDir("./routes")

Bun.serve({
  fetch: (req) => serverFetch(req),
  port: 3021,
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
import path from "node:path/posix"

interface TestFixture {
  url: string
  server: any
  axios: typeof defaultAxios
}

export const getTestFixture = async (): Promise<TestFixture> => {
  const port = 3001 + Math.floor(Math.random() * 999)
  const server = await startServerFromRoutesDir(
    path.join(import.meta.url, "../../../routes"),
    {
      port,
      middleware: [
        (req, ctx, next) => {
          // ctx.res.setHeader("x-test", "true")
          // This is also a good place to fixture a database!
          return next(req, ctx)
        },
      ],
    }
  )
  const url = `http://localhost:${port}`
  const axios = defaultAxios.create({
    baseURL: url,
  })

  afterEach(() => {
    console.log("closing server")
    server.close()
  })

  return {
    url,
    server,
    axios,
  }
}
```
