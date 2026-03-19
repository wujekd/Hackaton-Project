import { defineConfig } from "vitest/config";
import baseConfig from "./vite.config";

export default defineConfig({
  plugins: baseConfig.plugins,
  resolve: baseConfig.resolve,
  server: baseConfig.server,
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.integration.test.{ts,tsx}"],
    hookTimeout: 20000,
    testTimeout: 20000,
    sequence: {
      concurrent: false,
    },
  },
});
