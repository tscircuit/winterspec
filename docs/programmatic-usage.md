# Programmatic Usage

Everything you can do through the CLI, you can do programmatically (and more!).

## Starting a dev server

```typescript
import { devServer } from "winterspec/dev"

// All properties are optional
devServer.startDevServer({
  configPath: "./winterspec.config.ts",
  config: {
    // Override something from your config file
  },
  port: 3000,
  onListening: (port) => {
    console.log(`Listening on port ${port}`)
  },
  onBuildStart: () => {
    console.log("Building...")
  },
  onBuildEnd: () => {
    console.log("Build complete")
  },
})
```

## [Soon] codegen

## [Soon] bundling

## Advanced

When using a test runner, the default dev server has a major downside: all tests must share the same instance of the dev server, which prevents you from sharing context between tests and your application (assuming you want to run tests in parallel).

To fix this, you can use a "headless" dev server, which splits the bundling and serving into two separate functions, coupled by an event bus. This allows you to run the bundler once and share the bundle between multiple servers (usually, one server per test).

It's unlikely you'll need to use this API directly—check out the built-in fixtures for [supported test runners](./testing.md).

```typescript
import { EventEmitter } from "node:events"
import { MessageChannel } from "node:worker_threads"
import { loadConfig } from "winterspec/config"
import { devServer, HeadlessBuildEvents } from "winterspec/dev"
import type { ChannelOptions } from "birpc"

const config = await loadConfig({ configPath: "./winterspec.config.ts" })

const messageChannel = new MessageChannel()

// Under the hood, WinterSpec uses https://www.npmjs.com/package/birpc.
// A MessageChannel is one of the simplest possible transports, but you can use any transport you want.
const bundlerRpcChannel: ChannelOptions = {
  post: (data) => messageChannel.port1.postMessage(data),
  on: (data) => messageChannel.port1.on("message", data),
}

const httpServerRpcChannel: ChannelOptions = {
  post: (data) => messageChannel.port2.postMessage(data),
  on: (data) => messageChannel.port2.on("message", data),
}

const bundler = devServer.headless.startBundler({
  config,
})

/* Can be run cheaply many times */

// Register the HTTP server message channel with the bundler
bundler.birpc.updateChannels((channels) => channels.push(bundlerRpcChannel))

// Start the HTTP server
const server = await devServer.headless.startServer({
  port: 3000,
  config,
  rpcChannel: httpServerRpcChannel,
})
```
