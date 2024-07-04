export default () => {
  return {
    files: [
      "tests/testing/ava/recovers-from-initial-build-error/test-to-spawn.ts",
    ],
    watchMode: {
      ignoreChanges: [
        "**/.winterspec/**",
        // Temporary file created by bundle-require
        "**/winterspec.config.bundled*",
      ],
    },
    nodeArguments: ["--import=tsx"],
    extensions: {
      ts: "commonjs",
    },
    environmentVariables: {
      IS_TESTING_EDGESPEC: "true",
    },
  }
}
