# ☃️ winterspec

> [!NOTE]
> This project is a fork of the awesome work of the
> Seam team in the original [edgespec](https://github.com/seamapi/edgespec)
> module. Please check them out and use the [Seam API](https://seam.co)!

WinterSpec is an opinionated HTTP framework for TypeScript. Out of the box, it:

- Uses filepath-based routing
- [Soon] generates ergonomic SDKs across multiple languages
- [Soon] generates OpenAPI documentation
- Provides end-to-end type safety for your middleware and endpoints
- Can be built into a zero-dependency module and embedded into other applications

WinterSpec primarily targets the [common minimum API described by WinterCG](https://github.com/wintercg/proposal-common-minimum-api), but it can also target Node.js, Bun, and Deno. Currently, the two main "edge"/WinterCG-compatible platforms targeted are Cloudflare Workers and Vercel Edge Functions.

Regardless of your target, WinterSpec provides a consistent API and encourages emulation of the WinterCG runtime when developing.

## Getting Started

To start a new project:

```bash
npm create winterspec@latest # [soon]

npm run dev
```

If you want to add WinterSpec to an existing project, check out [this recipe](./recipes/adding-winterspec-to-existing-project.md)

## Usage

- [Routes](./docs/routes.md) ⭐
- [Middleware](./docs/middleware.md)
- [Global route config](./docs/global-route-config.md)
- [Code generation (typings & OpenAPI)](./docs/code-generation.md)
- [WinterSpec config](./docs/winterspec-config.md)
- [Bundling & deployment](./docs/bundling-and-deployment.md) 🚀
- [Embedding as a module](./docs/embedding.md)
- [Programmatic usage](./docs/programmatic-usage.md)

## Alternatives

WinterSpec may not be the right choice for your project. This list is not exhaustive, but here are some alternatives:

- If your backend and frontend are tightly coupled:
  - [Next.js](https://nextjs.org/) with React Server Components
  - [Remix](https://remix.run/)
  - [Express](http://expressjs.com/) or [Fastify](https://fastify.dev/) with [tRPC](https://trpc.io/)
- If you dislike filepath-based routing and need to run within a WinterCG-compatible environment:
  - [Hono](https://hono.dev/) (with or without [tRPC](https://trpc.io/))
- If you enjoy dependency injection:
  - [NestJS](https://nestjs.com/)
- If your project is mainly frontend with a few API routes:
  - [Next.js](https://nextjs.org/)

## Acknowledges

- [originally a fork of winterspec from Seam](https://github.com/seamapi/winterspec)
