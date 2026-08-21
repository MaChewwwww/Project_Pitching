import { expect, test, type Page } from "@playwright/test";

import { withCapture } from "../src/capture-run";
import {
  clickButton,
  fill,
  goto,
  login,
  logout,
  pause,
  selectFirstOption,
  waitForApp,
  waitForToast,
} from "../src/browser";
import {
  captureConfig,
  captureLabel,
  requireMutationCapture,
  residentEmail,
} from "../src/config";

async function placePin(page: Page): Promise<void> {
  const map = page.locator(".leaflet-container").first();
  await expect(map).toBeVisible({ timeout: 30000 });
  await map.click({ position: { x: 260, y: 180 } });
  await pause(page, 700);
}

async function selectEventInDialog(page: Page, eventName: string): Promise<void> {
  const dialog = page.getByRole("dialog");
  const selector = dialog.getByRole("combobox").first();
  if (!(await selector.isVisible().catch(() => false))) return;
  await selector.click();
  await page.getByRole("option", { name: eventName }).click();
}

async function declareCaptureEvent(page: Page, capture: import("../src/capture-run").CaptureRun): Promise<string> {
  await goto(page, "/admin/emergency-events", /Emergency Events/i);
  await capture.guidance.step("Barangay Team · announce a flood emergency");
  await clickButton(page, /Declare Event/i);
  const name = captureLabel("Riverside Flood Event");
  const dialog = page.getByRole("dialog");
  await dialog.locator('input[placeholder*="Typhoon"]').fill(name);
  await capture.guidance.focus(dialog.getByRole("button", { name: /Declare & Activate Event/i }), "Announce the flood emergency");
  await dialog.getByRole("button", { name: /Declare & Activate Event/i }).click();
  await waitForToast(page, /declared successfully/i);
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible({ timeout: 30000 });
  const eventId = new URL(page.url()).searchParams.get("event");
  if (!eventId) throw new Error("The declared capture event ID was not present in the admin URL.");
  capture.recordCreated("emergency_event", eventId, name);
  return eventId;
}

async function registerSafetyResident(
  page: Page,
  capture: import("../src/capture-run").CaptureRun,
): Promise<void> {
  const email = residentEmail("safety");
  const residentName = captureLabel("Flood Response Family");
  await goto(page, "/register", /Register your household account/i);
  await fill(page, /Full Name/i, residentName);
  await fill(page, /Email Address/i, email);
  await fill(page, /^Password$/i, captureConfig.residentPassword);
  await fill(page, /Confirm Password/i, captureConfig.residentPassword);
  const terms = page.getByRole("checkbox", { name: /Terms|Conditions/i }).first();
  await terms.click({ force: true });
  await clickButton(page, /Accept terms/i);
  await expect(page.locator("#registration-terms")).toHaveAttribute("aria-checked", "true");
  const accountResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/auth/me") &&
      response.request().method() === "GET",
  );
  await clickButton(page, /Create Account/i);
  const accountResponse = await accountResponsePromise;
  const accountBody = await accountResponse.json() as { id?: string };
  capture.recordCreated("resident-account", accountBody.id ?? email, residentName);
  await waitForApp(page, /Household|Address and Map Pin|Resident Dashboard/i);
  await page.goto("/portal/onboarding", { waitUntil: "domcontentloaded" });
  await waitForApp(page, /Address and Map Pin/i);
  await placePin(page);
  const area = page.locator("#area_id");
  const autoDetected = page.getByText("Auto-detected", { exact: true });
  if (
    (await area.isVisible().catch(() => false)) &&
    !(await autoDetected.isVisible().catch(() => false))
  ) {
    await selectFirstOption(page, /Area \/ Purok/i, /Area/i);
  }
  await fill(page, /House No\. \/ Street \/ Subdivision/i, captureLabel("Flood Response Home Address"));
  await fill(page, /Contact Number/i, "09172345678");
  await fill(page, /Birthday/i, "1992-02-16");
  await selectFirstOption(page, /Kasarian \(Sex\)/i, /Male|Female/i);
  await page.locator('input[name="waterway_proximity"]').first().check();
  const householdResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/me/household") &&
      response.request().method() === "POST",
  );
  await clickButton(page, /Complete Registration/i);
  const householdResponse = await householdResponsePromise;
  if (!householdResponse.ok()) {
    throw new Error(`Household onboarding failed with ${householdResponse.status()}.`);
  }
  const householdBody = await householdResponse.json() as {
    household?: { id?: string; reference_no?: string };
  };
  if (householdBody.household?.id) {
    capture.recordCreated(
      "household",
      householdBody.household.id,
      householdBody.household.reference_no ?? captureLabel("Flood Response Household"),
    );
  }
  await waitForToast(page, /Household registered successfully/i);
}

async function flagNeedsRescue(page: Page, eventName: string): Promise<void> {
  await goto(page, "/portal/safety", /Safety|Household Status/i);
  const needsRescue = page.getByRole("button", { name: /Needs Rescue/i }).first();
  await expect(needsRescue).toBeVisible({ timeout: 30000 });
  await needsRescue.click();
  await selectEventInDialog(page, eventName);
  await clickButton(page, /Confirm Rescue Flag/i);
  await waitForToast(page, /updated successfully/i);
  await expect(page.getByText(/Needs Rescue/i).first()).toBeVisible({ timeout: 30000 });
}

async function submitResidentRescue(
  page: Page,
  residentName: string,
  capture: import("../src/capture-run").CaptureRun,
): Promise<string> {
  await goto(page, "/portal/rescue", /Emergency Rescue|Request Urgent/i);
  // The authenticated endpoint intentionally rejects ambiguous concurrent
  // events. Keep the resident portal UI on screen, but use the public rescue
  // write path for this visual capture so the existing exercise and every
  // prior capture event remain untouched.
  await page.route("**/api/v1/me/rescue-requests", async (route) => {
    const targetUrl = route.request().url().replace("/api/v1/me/rescue-requests", "/api/v1/public/rescue-requests");
    await route.continue({ url: targetUrl });
  });
  await fill(page, /Your Name/i, residentName);
  await fill(page, /People Needing Rescue/i, "2");
  const rescueMarker = captureLabel("Flood Rescue Request");
  await fill(page, /What.s Happening/i, `${rescueMarker}: rising floodwater near the Riverside block; one child needs assisted evacuation.`);
  await fill(page, /Landmark \/ Specific Location Notes/i, captureLabel("Flood Rescue Location"));
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/public/rescue-requests") &&
      response.request().method() === "POST",
  );
  await clickButton(page, /Send Emergency Rescue Request/i);
  const response = await responsePromise;
  if (!response.ok()) throw new Error(`Rescue request failed with ${response.status()}.`);
  const body = await response.json() as { id?: string };
  if (body.id) capture.recordCreated("rescue-request", body.id, `${residentName} rescue request`);
  await expect(page.getByText(/Rescue Request Received/i)).toBeVisible({ timeout: 30000 });
  return rescueMarker;
}

async function triageThroughLifecycle(page: Page, residentName: string, rescueMarker: string): Promise<void> {
  await goto(page, "/admin/rescue-requests", /Rescue|Triage/i);
  const search = page.getByRole("textbox", { name: /Search requester/i });
  await search.fill(residentName);
  await pause(page, 500);
  const requestCard = page.getByRole("row").filter({ hasText: rescueMarker }).first();
  await expect(requestCard).toBeVisible({ timeout: 30000 });
  await requestCard.getByRole("button", { name: /Triage & Review/i }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: /Verify Request/i }).click();
  await waitForToast(page, /Lifecycle status updated successfully/i);
  await expect(dialog.getByText(/Verified/i)).toBeVisible({ timeout: 30000 });

  await dialog.getByRole("button", { name: /Dispatch Team/i }).click();
  await waitForToast(page, /Lifecycle status updated successfully/i);
  await expect(dialog.getByText(/Dispatched/i)).toBeVisible({ timeout: 30000 });

  await dialog.getByRole("button", { name: /Mark Resolved/i }).click();
  const resolutionDialog = page.getByRole("dialog").last();
  await resolutionDialog.locator("textarea").fill(`${captureLabel("Help Completed")}: family reached and brought to safety.`);
  await resolutionDialog.getByRole("button", { name: /Confirm Resolution/i }).click();
  await waitForToast(page, /Lifecycle status updated successfully/i);
  await expect(dialog.getByText(/Resolved/i)).toBeVisible({ timeout: 30000 });
  const closePanel = page
    .getByRole("button", { name: /Close (dialog|drawer)/i })
    .last();
  if (await closePanel.isVisible().catch(() => false)) await closePanel.click();
}

async function markHouseholdSafe(page: Page, eventName: string): Promise<void> {
  await goto(page, "/portal/safety", /Safety|Household Status/i);
  const safe = page.getByRole("button", { name: /Mark Safe \/ Rescued/i }).first();
  await expect(safe).toBeVisible({ timeout: 30000 });
  await safe.click();
  await selectEventInDialog(page, eventName);
  await clickButton(page, /Confirm Safe Check-In/i);
  await waitForToast(page, /updated successfully/i);
  await expect(page.getByText(/Accounted Safe|Safe Check-In/i).first()).toBeVisible({ timeout: 30000 });
}

test("full flood response from help request to safe check-in", async ({ page }, testInfo) => {
  requireMutationCapture();
  const residentName = captureLabel("Flood Response Family");
  await withCapture(page, testInfo, {
    slug: "10-safety-lifecycle-master",
    title: "Flood Response · Ask for Help, Respond, and Mark Safe",
    scenario: "safety-lifecycle",
    persona: "Barangay Admin",
  }, async (capture) => {
    await login(page, captureConfig.adminEmail, captureConfig.adminPassword, /Households|Emergency Events/i);
    const eventName = captureLabel("Riverside Flood Event");
    const eventId = await declareCaptureEvent(page, capture);
    const eventStart = capture.guidance.events.at(-1)?.atMs ?? 0;
    capture.segment("10a-declare-event", "Announce the Flood Emergency", "safety-lifecycle", 0, eventStart + 3200);

    await logout(page);
    await capture.guidance.setPersona("Resident");
    await capture.guidance.step("Resident · register a household during the flood");
    await registerSafetyResident(page, capture);
    await flagNeedsRescue(page, eventName);
    await capture.guidance.step("Resident · ask for help and share the location");
    const rescueMarker = await submitResidentRescue(page, residentName, capture);
    await capture.guidance.step("Resident · request received by the barangay team");
    await pause(page, 1000);

    await logout(page);
    await capture.guidance.setPersona("Barangay Admin");
    await login(page, captureConfig.adminEmail, captureConfig.adminPassword, /Households|Emergency Events/i);
    await capture.guidance.step("Barangay Team · check the request, send help, and close it");
    await triageThroughLifecycle(page, residentName, rescueMarker);
    const triageAt = capture.guidance.events.at(-1)?.atMs ?? eventStart;
    capture.segment("10b-admin-triage", "Rescue Request · Check and Send Help", "safety-lifecycle", eventStart + 2800, triageAt + 2500);

    await logout(page);
    await capture.guidance.setPersona("Resident");
    await login(page, residentEmail("safety"), captureConfig.residentPassword, /Households|Resident|Portal/i);
    await capture.guidance.step("Resident · mark the household safe");
    await markHouseholdSafe(page, eventName);
    const safeAt = capture.guidance.events.at(-1)?.atMs ?? triageAt;
    capture.segment("10c-resident-mark-safe", "Resident Marks the Household Safe", "safety-lifecycle", triageAt, safeAt + 2200);

    await logout(page);
    await capture.guidance.setPersona("Barangay Admin");
    await login(page, captureConfig.adminEmail, captureConfig.adminPassword, /Households|Emergency Events/i);
    await capture.guidance.step("Barangay Team · see who is safe on the response map");
    await goto(page, `/admin/emergency-events?event=${eventId}&tab=accounted-for`, /Accounted For|Accounted/i);
    await expect(page.getByText(/Accounted|Safe/i).first()).toBeVisible({ timeout: 30000 });
    await capture.guidance.pause(1400);
    capture.segment("10d-admin-accounted-for", "Safe Families on the Map", "safety-lifecycle", safeAt, undefined);
  });
});
