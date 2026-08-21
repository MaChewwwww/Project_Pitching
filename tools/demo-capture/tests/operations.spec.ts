import { expect, test, type Locator, type Page } from "@playwright/test";

import { withCapture } from "../src/capture-run";
import { clickButton, goto, login, pause, waitForApp, waitForToast } from "../src/browser";
import { captureConfig, captureLabel, requireMutationCapture } from "../src/config";

async function placePin(page: Page, scope: Page | Locator = page): Promise<void> {
  const map = scope.locator(".leaflet-container").first();
  await expect(map).toBeVisible({ timeout: 30000 });
  await map.click({ position: { x: 230, y: 170 } });
  await pause(page, 700);
}

async function findSirenLink(page: Page, name: string): Promise<Locator> {
  for (let pageNumber = 0; pageNumber < 10; pageNumber += 1) {
    const link = page.getByRole("link", { name, exact: true }).first();
    if (await link.isVisible().catch(() => false)) return link;
    const next = page.getByRole("button", { name: /^Next$/i });
    if (!(await next.isEnabled().catch(() => false))) break;
    await next.click();
    await pause(page, 350);
  }
  throw new Error(`The capture-tagged siren was not present in the admin pages: ${name}`);
}

test("admin siren deployment, visual trigger, and public directories", async ({ page }, testInfo) => {
  requireMutationCapture();
  await withCapture(page, testInfo, {
    slug: "11-operations-siren-hotlines",
    title: "Safety Tools · Warning Siren and Hotline Help",
    scenario: "operations",
    persona: "Barangay Admin",
  }, async (capture) => {
    await login(page, captureConfig.adminEmail, captureConfig.adminPassword, /Households|Siren|Emergency/i);
    await goto(page, "/admin/sirens", /Siren Alert Network/i);
    await capture.guidance.step("Barangay Team · place a warning siren");
    await clickButton(page, /Deploy Siren Unit/i);
    const dialog = page.getByRole("dialog");
    const name = captureLabel("Warning Siren at Area 1");
    await dialog.locator("#siren_name").fill(name);
    await placePin(page, dialog);
    const deployResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/v1/admin/sirens") &&
        response.request().method() === "POST",
    );
    await dialog.getByRole("button", { name: /^Deploy Siren Unit$/i }).click();
    const deployResponse = await deployResponsePromise;
    if (!deployResponse.ok()) {
      throw new Error(`Siren deployment failed with ${deployResponse.status()}.`);
    }
    const deployBody = await deployResponse.json() as {
      data?: { id?: string; name?: string };
      id?: string;
    };
    const deployedSirenId = deployBody.data?.id ?? deployBody.id;
    if (!deployedSirenId) throw new Error("The deployed capture siren ID was not returned by the server.");
    await waitForToast(page, /deployed successfully/i);
    // The list query can still be showing its previous page after the dialog
    // closes. Refresh once before walking pagination so the exact new record
    // is visible and can be targeted by name.
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForApp(page, /Siren Alert Network/i);
    const sirenLink = await findSirenLink(page, name);
    await expect(sirenLink).toBeVisible({ timeout: 30000 });
    const href = await sirenLink.getAttribute("href");
    const sirenId = deployedSirenId ?? href?.split("/").pop();
    if (!sirenId) throw new Error("The deployed capture siren ID was not present in its details link.");
    capture.recordCreated("siren", sirenId, name);
    capture.segment("11a-deploy-siren", "Place the Warning Siren", "operations", 0);

    await capture.guidance.step("Barangay Team · sound the warning siren");
    const triggerStart = capture.guidance.events.at(-1)?.atMs ?? 0;
    const row = sirenLink.locator("xpath=ancestor::tr[1]");
    await expect(row).toBeVisible({ timeout: 30000 });
    await row.getByRole("button", { name: /^Trigger$/i }).click();
    await waitForToast(page, /activated|sounding/i);
    await expect(row.getByText(/Sounding/i)).toBeVisible({ timeout: 30000 });
    await capture.guidance.focus(row.getByRole("button", { name: /Silence/i }), "Warning is sounding on the map");
    await pause(page, 1800);
    capture.segment("11b-trigger-siren", "Sound the Warning", "operations", triggerStart);

    await goto(page, "/admin/hotlines", /Emergency Hotlines/i);
    await capture.guidance.step("Barangay Team · review the hotline list");
    const adminHotlinesStart = capture.guidance.events.at(-1)?.atMs ?? triggerStart;
    await capture.guidance.focus(page.getByRole("heading", { name: /Emergency Hotlines/i }), "Barangay hotline list");
    await pause(page, 1200);
    capture.segment("11c-admin-hotlines", "Barangay Hotline List", "operations", adminHotlinesStart);

    await capture.guidance.setPersona("Public Site");
    await goto(page, "/hazard-map", /Hazard Map/i);
    await capture.guidance.step("Visitor view · map with flood and siren warnings");
    const publicMapStart = capture.guidance.events.at(-1)?.atMs ?? triggerStart;
    await expect(page.getByRole("heading", { name: /Flood Hazard Map/i })).toBeVisible({ timeout: 30000 });
    await capture.guidance.focus(page.locator(".leaflet-container").first(), "Community safety map");
    await pause(page, 1800);
    capture.segment("11d-public-siren-map", "Community Safety Map", "operations", publicMapStart);

    await goto(page, "/help", /Help|Emergency Hotlines/i);
    await capture.guidance.step("Visitor view · hotline list and emergency help");
    const hotlineStart = capture.guidance.events.at(-1)?.atMs ?? publicMapStart;
    await expect(page.getByText(/Emergency Hotlines/i).first()).toBeVisible({ timeout: 30000 });
    await capture.guidance.focus(page.getByText(/Emergency Hotlines/i).first(), "Emergency hotline list");
    await pause(page, 1200);
    capture.segment("11e-public-hotlines", "Visitor Hotline List", "operations", hotlineStart);

    await capture.guidance.setPersona("Barangay Admin");
    await goto(page, "/admin/sirens", /Siren Alert Network/i);
    const finalLink = await findSirenLink(page, name);
    const finalRow = finalLink.locator("xpath=ancestor::tr[1]");
    await finalRow.getByRole("button", { name: /Silence/i }).click();
    await waitForToast(page, /silenced/i);
    await capture.guidance.step("Safety tools complete · warning siren is ready again");
    capture.segment(
      "11f-silence-siren",
      "Return the Warning Siren to Ready",
      "operations",
      capture.guidance.events.at(-1)?.atMs ?? hotlineStart,
    );
  });
});
