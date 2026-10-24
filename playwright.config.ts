import { defineConfig, devices } from "@playwright/test";
process.env.ZENITH_DB_PATH ??= `${process.cwd()}/artifacts/e2e/hub-${Date.now()}.sqlite`;
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  use: { baseURL: "http://localhost:3100", trace: "retain-on-failure", ...devices["Desktop Chrome"] },
  webServer: {
    command: `${process.platform === "win32" ? "npm.cmd" : "npm"} run build && ${process.platform === "win32" ? "npm.cmd" : "npm"} start -- --port 3100`,
    url: "http://localhost:3100",
    reuseExistingServer: false,
    env: { ZENITH_DB_PATH: process.env.ZENITH_DB_PATH },
    timeout: 120000,
  },
});
