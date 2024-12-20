#!/usr/bin/env node
import { runExit } from "clipanion"
import { BundleCommand } from "./commands/bundle.js"
import { DevCommand } from "./commands/dev.js"
import { CodeGenRouteTypes } from "./commands/codegen/route-types.js"
import { CodeGenOpenAPI } from "./commands/codegen/openapi.js"
import { BundleRoutesCommand } from "./commands/bundle-routes.js"
import Debug from "debug"

const debug = Debug("winterspec:cli")

debug("Starting CLI...")
runExit(
  {
    binaryLabel: "WinterSpec",
    binaryName: "winterspec",
  },
  [
    BundleCommand,
    DevCommand,
    CodeGenRouteTypes,
    CodeGenOpenAPI,
    BundleRoutesCommand,
  ]
)
