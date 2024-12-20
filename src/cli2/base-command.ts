import { Command } from "commander"
import { ResolvedWinterSpecConfig, loadConfig } from "src/config/utils.js"

export abstract class BaseCommand {
  constructor(public program: Command) {}

  protected async loadConfig(cmdObj: any): Promise<ResolvedWinterSpecConfig> {
    const overrides = {
      tsconfigPath: cmdObj.tsconfig,
      routesDirectory: cmdObj.routesDirectory,
      rootDirectory: cmdObj.root,
      platform: cmdObj.platform as "node" | "wintercg-minimal",
    }

    return loadConfig(cmdObj.root ?? process.cwd(), overrides)
  }

  abstract register(): void
}
