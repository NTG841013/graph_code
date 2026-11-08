import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": root,
      "server-only": resolve(root, "vitest.server-only.ts"),
    },
  },
  test: {
    clearMocks: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
  },
});
