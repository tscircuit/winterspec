export default () => {
  return {
    files: ["**/*.test.ts"],
    watchMode: {
      ignoreChanges: [
        ".next",
        ".nsm",
        "**/bundled*.*s",
        "**/api/**",
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
