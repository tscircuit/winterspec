import { Command, Option } from "clipanion"
import { durationFormatter } from "human-readable"
import ora from "ora"
import { startDevServer } from "src/dev/dev-server.js"
import { BaseCommand } from "../base-command.js"
import { ResolvedWinterSpecConfig } from "src/config/utils.js"

export class DevCommand extends BaseCommand {
  static paths = [[`dev`]]

  static usage = Command.Usage({
    description: `Start a development server. It watches your source code and will automatically rebuild upon changes.`,
  })

  port = Option.String("--port,-p", "3000", {
    description: "The port to serve your app on",
  })

  // todo: better syntax for this flag, seems to need --no-emulate-wintercg
  emulateWinterCG = Option.Boolean("--emulate-wintercg", true, {
    description:
      "Emulate the WinterCG runtime. When true, native APIs are unavailable.",
  })

  async run(config: ResolvedWinterSpecConfig) {
    const configWithOverrides = {
      emulateWinterCG: this.emulateWinterCG,
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

    // Prevents the build spinner from displaying before the listening message
    // No spinner collision plz! 🙈
    let resolveOnListeningPromise: () => void
    const listeningPromise = new Promise<void>((resolve) => {
      resolveOnListeningPromise = resolve
    })

    await startDevServer({
      port: parseInt(this.port, 10),
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
  }
}
