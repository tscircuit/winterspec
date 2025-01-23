import { ExecutionContext } from "ava"
import { execa } from "execa"
import { Writable } from "node:stream"

export const getTestCLI = async (t: ExecutionContext, cliVersion?: number) => {
  return {
    executeCommand: (args: string[]) => {
      t.log(`Executing CLI command: winterspec ${args.join(" ")}`)

      const logStream = new Writable({
        write(chunk, _, done) {
          for (const line of chunk.toString().split("\n")) {
            t.log("[CLI output] " + line)
          }
          done()
        },
      })

      const command = execa(
        "node",
        ["--import=tsx", `src/cli${cliVersion ?? ""}/cli.ts`, ...args],
        {
          reject: false,
        }
      ).pipeStderr!(logStream).pipeStdout!(logStream)

      t.teardown(() => {
        command.kill()
      })

      return {
        async kill() {
          command.kill()
          return await command
        },
        async waitUntilExit() {
          return await command
        },
      }
    },
  }
}
