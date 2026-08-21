import { expect, test } from "@playwright/test";

import { withCapture } from "../src/capture-run";
import { captureConfig } from "../src/config";
import { goto, pause } from "../src/browser";

const PUBLIC_ROUTES = [
  "/",
  "/about",
  "/hazard-map",
  "/weather",
  "/barangay-facilities",
  "/announcements",
  "/guides",
  "/donation-drives",
  "/help",
];

test("community website quick check", async ({ page }, testInfo) => {
  await withCapture(page, testInfo, {
    slug: "00-preflight-public-smoke",
    title: "Website Check · Public Pages Are Ready",
    scenario: "preflight",
    persona: "Public Site",
  }, async (capture) => {
    const health = await page.request.get("/api/v1/health");
    expect(health.ok(), `API health returned ${health.status()}`).toBeTruthy();
    const healthBody = await health.json() as { status?: string };
    expect(healthBody.status ?? "ok").toMatch(/ok|healthy|ready/i);
    await capture.guidance.step("Quick check · make sure the public pages are ready");

    for (const route of PUBLIC_ROUTES) {
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(response?.status() ?? 0, `${route} did not return a response`).toBeLessThan(400);
      const label = route === "/" ? "home" : route.slice(1).replaceAll("-", " ");
      await capture.guidance.step(`Visit the ${label} page`);
      await pause(page, 180);
    }

    await goto(page, "/", /From Risk We Learn/i);
    await capture.guidance.title("Ready to Show", 900);
    await pause(page, 900);
    capture.segment("00a-public-smoke", "Website Check", "preflight", 0);
    await expect(page).toHaveURL(new RegExp(`${captureConfig.allowedHost.replace(/\./g, "\\.")}/?$`));
  });
});
