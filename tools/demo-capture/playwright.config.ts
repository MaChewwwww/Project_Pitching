import path from "node:path";

import { defineConfig } from "@playwright/test";

import { captureConfig, SCREEN_SIZE } from "./src/config";

export default defineConfig({
  testDir: path.join(__dirname, "tests"),
  outputDir: captureConfig.testResultsDir,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  // High-resolution 1920×1080 encoding and map tile loading can take longer
  // than a normal functional test; leave enough room for a complete guided clip.
  timeout: 300_000,
  expect: { timeout: 20_000 },
  reporter: [["list"], ["json", { outputFile: path.join(captureConfig.outputDir, "playwright-report.json") }]],
  globalTeardown: path.join(__dirname, "src", "global-teardown.ts"),
  use: {
    baseURL: captureConfig.baseUrl,
    browserName: "chromium",
    viewport: SCREEN_SIZE,
    video: { mode: "on", size: SCREEN_SIZE },
    contextOptions: { reducedMotion: "reduce" },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    actionTimeout: 20_000,
    navigationTimeout: 40_000,
  },
});
