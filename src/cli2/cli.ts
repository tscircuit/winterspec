#!/usr/bin/env node
import { Command } from "commander"
import { BundleCommand } from "./commands/bundle.js"
import { DevCommand } from "./commands/dev.js"
import { CodeGenRouteTypes } from "./commands/codegen/route-types.js"
import { CodeGenOpenAPI } from "./commands/codegen/openapi.js"
import { BundleRoutesCommand } from "./commands/bundle-routes.js"
import Debug from "debug"

const debug = Debug("winterspec:cli")
debug("Starting CLI...")

const program = new Command()
  .name("winterspec")
  .description("WinterSpec CLI")
  .version("1.0.0")

// Register all commands
const commands = [
  new BundleCommand(program),
  new DevCommand(program),
  new CodeGenRouteTypes(program),
  new CodeGenOpenAPI(program),
  new BundleRoutesCommand(program),
]

commands.forEach((cmd) => cmd.register())

program.parse(process.argv)
