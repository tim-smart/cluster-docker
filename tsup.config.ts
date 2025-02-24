import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["src/pod.ts", "src/shardManager.ts"],
  clean: true,
  publicDir: true,
  treeshake: "smallest",
})
