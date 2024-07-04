# Middleware

Middleware in WinterSpec follows a similar pattern to other libraries like Express/Fastify/Koa. Middleware receives three parameters: the incoming `req` object, the `ctx` context object, and the `next` function. It is expected to always call `next`.

Here's a few example use cases:

### Adding context to the request object

Mutate the passed `req` object. For example:

```typescript
import type { Middleware } from "winterspec"

export const exampleMiddleware: Middleware = (req, ctx, next) => {
  req.foo = "bar"
  return next(req, ctx)
}

// Later, in a route...
withWinterSpec({
  // ...
  middleware: [exampleMiddleware],
})(async (req) => {
  console.log(req.foo) // "bar"
})
```

### Modifying the base HTTP response

Wait for a Response to be returned from the `next` callback, then modify it directly. For example:

```typescript
import type { Middleware } from "winterspec"

export const exampleMiddleware: Middleware = (req, ctx, next) => {
  const response = await next(req, ctx)
  response.headers.set("X-Example", "Hello, world!")
  return response
}
```

### Returning a response early [Soon]

## Advanced typing

The `Middleware` type accepts two type parameters: the first is the additional context required on the incoming `Request` object, and the second is the output context that the middleware will return. Both are optional, but specifying the input context is very helpful when you have middlewares that depend on each other. For example:

```typescript
import type { Middleware } from "winterspec"

export const databaseMiddleware: Middleware<
  {},
  {
    db: DatabaseClient
  }
> = async (req, ctx, next) => {
  const db = await connectToDatabase()
  req.db = db
  return next(req, ctx)
}

export const bearerAuthMiddleware: Middleware<
  // Required request options (Middleware "input"). Assumes that the database middleware has already been called, maybe as part of `beforeAuthMiddleware[]` in `createWithWinterSpec`.
  {
    db: DatabaseClient
  },
  // Result request options (Middleware "output")
  {
    is_authenticated: boolean
  }
> = (req, ctx, next) => {
  const authToken = req.headers.get("authorization")?.split("Bearer ")?.[1]
  if (!authToken) {
    // WinterSpec will attach returned properties to the Request object
    return {
      is_authenticated: false,
    }
  }

  const [user] = await req.db.query("SELECT * FROM users WHERE token=?", [
    authToken,
  ])

  req.is_authenticated = Boolean(user)

  return next(req, ctx)
}
```

## Authentication Middleware

Authentication middleware is just like any other middleware, except by passing it to `authMiddleware` in `createWithWinterSpec`, you can specify it as a valid `auth` option on a route. Using the `auth` option is usually simpler and will also affect code generation.

For example:

```ts
// src/use-winter-spec.ts
import { createWithWinterSpec } from "winterspec"
import { withApiKey, withBrowserSession } from "src/middlewares"

export const withWinterSpec = createWithWinterSpec({
  apiName: "hello-world",

  authMiddleware: {
    apiKey: withApiKey,
    browserSession: withBrowserSession,
  },
  beforeAuthMiddleware: [],

  productionServerUrl: "https://example.com",
})
```

```ts
// routes/resource/list.ts
import { withWinterSpec } from "src/with-winter-spec"

export default withWinterSpec({
  auth: "apiKey",

  // you can also specify an array of methods, e.g. ["apiKey", "browserSession"]
  // auth: ["apiKey", "browserSession"],
})(async (req) => {
  // Recommendation: Have your auth middleware add req.auth to your request,
  // the type will carry over!
  const { userId } = req.auth

  // ...
})
```
