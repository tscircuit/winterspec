import { Command } from "commander"
import { durationFormatter } from "human-readable"
import ora from "ora"
import { startDevServer } from "src/dev/dev-server.js"
import { BaseCommand } from "../base-command.js"
import { ResolvedWinterSpecConfig } from "src/config/utils.js"

export class DevCommand extends BaseCommand {
  register(): void {
    this.program
      .command("dev")
      .description(
        "Start a development server. It watches your source code and will automatically rebuild upon changes."
      )
      .option("-p, --port <port>", "The port to serve your app on", "3000")
      .option("--no-emulate-wintercg", "Disable WinterCG runtime emulation")
      .option("--root <path>", "Path to your project root")
      .option("--tsconfig <path>", "Path to your tsconfig.json")
      .option("--routes-directory <path>", "Path to your routes directory")
      .option("--platform <platform>", "The platform to bundle for")
      .action(async (options) => {
        const config = await this.loadConfig(options)

        const configWithOverrides = {
          emulateWinterCG: options.emulateWintercg ?? true,
          ...config,
        }

        const listenSpinner = ora({
          text: "Starting server...",
          hideCursor: false,
          discardStdin: false,
        }).start()

        let buildStartedAt: number
        const spinner = ora({
          hideCursor: false,
          discardStdin: false,
          text: "Building...",
        }).start()

        const timeFormatter = durationFormatter({
          allowMultiples: ["m", "s", "ms"],
        })

        let resolveOnListeningPromise: () => void
        const listeningPromise = new Promise<void>((resolve) => {
          resolveOnListeningPromise = resolve
        })

        await startDevServer({
          port: parseInt(options.port, 10),
          config: configWithOverrides,
          onListening(port) {
            listenSpinner.stopAndPersist({
              symbol: "☃️",
              text: ` listening on port ${port}: http://localhost:${port}\n`,
            })

            resolveOnListeningPromise()
          },
          async onBuildStart() {
            buildStartedAt = performance.now()
            await listeningPromise
            spinner.start("Building...")
          },
          async onBuildEnd(build) {
            const durationMs = performance.now() - buildStartedAt
            await listeningPromise

            if (build.type === "success") {
              spinner.succeed(`Built in ${timeFormatter(durationMs)}`)
            } else {
              spinner.fail(`Build failed.\n${build.errorMessage}`)
            }
          },
        })
      })
  }
}
