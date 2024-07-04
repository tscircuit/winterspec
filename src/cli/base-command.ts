import { Command, Option } from "clipanion"
import * as t from "typanion"
import { ResolvedWinterSpecConfig, loadConfig } from "src/config/utils.js"

export abstract class BaseCommand extends Command {
  rootDirectory = Option.String("--root", {
    description: "Path to your project root",
  })

  tsconfigPath = Option.String("--tsconfig", {
    description: "Path to your tsconfig.json",
  })

  routesDirectory = Option.String("--routes-directory", {
    description: "Path to your routes directory",
  })

  platform = Option.String("--platform", {
    description: "The platform to bundle for",
    validator: t.isEnum(["node", "wintercg-minimal"]),
  })

  async execute() {
    const overrides = {
      tsconfigPath: this.tsconfigPath,
      routesDirectory: this.routesDirectory,
      rootDirectory: this.rootDirectory,
      platform: this.platform as "node" | "wintercg-minimal",
    }

    return this.run(
      await loadConfig(this.rootDirectory ?? process.cwd(), overrides)
    )
  }

  abstract run(config: ResolvedWinterSpecConfig): Promise<number | void>
}
