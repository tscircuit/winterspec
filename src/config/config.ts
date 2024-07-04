import { z } from "zod"

const winterSpecConfigSchema = z
  .object({
    /**
     * Defaults to the current working directory.
     */
    rootDirectory: z.string().optional(),
    /**
     * If this path is relative, it's resolved relative to the `rootDirectory` option.
     */
    tsconfigPath: z.string().optional(),
    /**
     * If this path is relative, it's resolved relative to the `rootDirectory` option.
     */
    routesDirectory: z.string().optional(),
    /**
     * The platform you're targeting.
     *
     * Defaults to `wintercg-minimal`, and you should use this whenever possible for maximal compatibility.
     *
     * Check [the docs](https://github.com/seamapi/winterspec/blob/main/docs/winterspec-config.md) for more information.
     */
    platform: z
      .enum(["node", "wintercg-minimal"])
      .default("wintercg-minimal")
      .optional(),
  })
  .strict()

export type WinterSpecConfig = z.infer<typeof winterSpecConfigSchema>

export const defineConfig = (config: WinterSpecConfig): WinterSpecConfig => {
  const parsedConfig = winterSpecConfigSchema.safeParse(config)

  if (parsedConfig.success) {
    return parsedConfig.data
  }

  throw new Error(`Invalid config: ${parsedConfig.error}`)
}
