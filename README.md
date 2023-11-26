# edgespec

Edgespec is a way of writing [WinterCG-compatible](https://wintercg.org/) APIs
that work with different HTTP frameworks.

Using edgespec:

- Endpoints always look familiar and standard across http frameworks
- Endpoints that work anywhere (Cloudflare Workers, Hono, Vercel, NextJS)
- Generate ergonomic multi-language SDKs
- Automatically generate OpenAPI documentation and validate request/response payloads
- Automatically validate requests and responses
- Easily create short-lived test servers for testing
- Typesafe Middleware

## Getting Started

```
npm install edgespec

npx edgespec serve
```

## Middleware System

Use or release edgespec-compatible middleware with a proper type-pipeline:

```typescript
import type { Middleware } from "edgespec"
export const someMiddleware: Middleware<{
  deps: {
    db: DatabaseClient
  },
  outputs: {
    is_authenticated: boolean
  }
> = next => (req) => {

  const authToken = req.headers.get("authorization")?.split("Bearer ")?.[1]
  if (!authToken) {
    req.is_authenticated = false
    return next(req)
  }

  const [user] = req.db.query("SELECT * FROM users WHERE token=?", [authToken])

  if (!user) {
    req.is_authenticated = false
    return next(req)
  }

  req.is_authenticated = true
  return next(req)
}
```

## Using as a module

> Having a service compiled as a module is called the "Module Service" pattern

If you use `edgespec build module`, you can compile your
edgespec app into an easy-to-use importable module. This
allows you to use your application as if it's a library
without ever starting a server.

```ts
// Create module.ts using "edgespec build module"
import * as ModuleService from "./module.ts"

const myModuleService = ModuleService.create()

const res = await myModuleServer.fetch("/health").then((r) => r.json())

console.log(res)
// { "ok": true }
```

## Building for Deployment

You can build configurations for different frameworks so that your edgespec app
is portable. For example:

- `edgespec build next` - Creates appropriate `app` or `pages/api` directory OR modifies `next.config.js`
- `edgespec build hono` - Creates a `hono-app.ts` file that contains all the routes
- `edgespec build bun` - Creates a `bun-app.ts` file that contains all the routes
- `edgespec build deno` - Creates a `deno-app.ts` file that contains all the routes
- `edgespec build module` - Creates a `module.ts` file that contains all the routes and can be used programmatically

## File-Routing

By default, `edgespec` searches inside your `./api` directory for endpoints
using the NextJS `pages/api` file routing standard. It looks a bit like this:

- `/api/health.ts`
- `/api/resource/[id].ts`
- `/api/resource/[id]/actions/[...action].ts`

## Linting

You can use `edgespec lint` to check that all your endpoints are well-formed
and follow a configurable naming convention (e.g. `snake_case` or `kebab-case`)

## Development

The types are separated from the source javascript files in this project,
eliminating the need for a transpiler. This was done because the types present
a significant amount of complexity, so we intentionally separated the
implementation from the types.

You can run the tests with ava, to run a specific test file use:

```bash
npx ava ./tests/endpoints/basic.test.ts
```

To run the entire test suite use `npm run test`
