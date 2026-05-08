import { defineConfig } from "@playwright/test";

export default defineConfig({
  testMatch: "*.spec.ts",
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: "http://localhost:8088",
    headless: true,
  },
});
