import test from "ava"
import { fileURLToPath } from "node:url"
import path from "node:path"
import { execa } from "execa"
import { PassThrough, Writable } from "node:stream"
import fs from "node:fs/promises"

test("if build is initially broken, it recovers (when in watch mode)", async (t) => {
  const rootDirectory = path.dirname(fileURLToPath(import.meta.url))
  const apiRoutePath = path.join(rootDirectory, "api", "health.ts")

  // Intentional incorrect syntax
  await fs.writeFile(apiRoutePath, `exports unknown`)
  t.teardown(async () => {
    await fs.unlink(apiRoutePath)
  })

  const avaConfigPath = path.join(rootDirectory, "ava.config.js")

  const outputStream = new PassThrough()
  const logStream = new Writable({
    write(chunk, _, done) {
      for (const line of chunk.toString().split("\n")) {
        t.log("[Child AVA output] " + line)
      }
      done()
    },
  })
  outputStream.pipe(logStream)

  const captureOutputUntilMessage = async (
    message: string
  ): Promise<string> => {
    let outputUntilMessage = ""
    // Need to clone the stream, otherwise the original outputStream will be aborted once this resolves
    const stream = new PassThrough()
    outputStream.pipe(stream)
    for await (const chunk of stream) {
      outputUntilMessage += chunk.toString()

      if (outputUntilMessage.includes(message)) {
        return outputUntilMessage
      }
    }

    throw new Error("Message not found")
  }

  const child = execa("ava", ["--config", avaConfigPath, "-w"], {
    env: {
      // AVA refuses to use watch mode in CI
      CI: "false",
    },
  }).pipeStderr!(outputStream).pipeStdout!(outputStream)

  t.teardown(async () => {
    outputStream.end()

    // In Windows process.kill() doesn't automatically destroy it's streams
    child.stderr?.destroy()
    child.stdout?.destroy()
    child.stdin?.destroy()
    child.kill()
    // Throws because we kill above
    await child.catch(() => {})
  })

  {
    const outputUntilTestFailure = await captureOutputUntilMessage(
      "Type `r` and press enter to rerun tests"
    )

    t.true(outputUntilTestFailure.includes(`Expected ";" but found "unknown"`))
    t.true(outputUntilTestFailure.includes("1 test failed"))
    t.log("Test correctly logged build error, fixing the build issue")
  }

  await fs.writeFile(apiRoutePath, `export default () => new Response("OK")`)
  t.log("Updated route handler")

  {
    const outputUntilTestSuccess = await captureOutputUntilMessage(
      "Type `r` and press enter to rerun tests"
    )

    t.true(outputUntilTestSuccess.includes("1 test passed"))
  }
})
