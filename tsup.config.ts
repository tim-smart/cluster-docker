import { defineConfig } from "tsup"

export default defineConfig({
  entry: [
    "src/runner.ts",
    "src/shardManager.ts",
    "src/effect-days/runner.ts",
    "src/effect-days/shooter.ts",
    "src/effect-days/slow-shooter.ts",
    "src/effect-days/speed-shooter.ts",
  ],
  clean: true,
  publicDir: true,
  treeshake: "smallest",
})
