import { expect, test } from "@playwright/test";

import { withCapture } from "../src/capture-run";
import {
  clickButton,
  fill,
  goto,
  login,
  pause,
  waitForApp,
  waitForToast,
} from "../src/browser";
import { captureConfig, captureLabel, requireMutationCapture, residentEmail } from "../src/config";

async function placeMapPin(page: import("@playwright/test").Page): Promise<void> {
  const map = page.locator(".leaflet-container").first();
  await expect(map).toBeVisible({ timeout: 30000 });
  await map.click({ position: { x: 260, y: 180 } });
  await pause(page, 700);
}

async function acceptTerms(page: import("@playwright/test").Page): Promise<void> {
  const checkbox = page.getByRole("checkbox", { name: /Terms|Conditions/i }).first();
  await checkbox.click({ force: true });
  await clickButton(page, /Accept terms/i);
  await expect(page.locator("#registration-terms")).toHaveAttribute("aria-checked", "true");
}

test.describe("household registration captures", () => {
  test("resident self-registration and onboarding", async ({ page }, testInfo) => {
    requireMutationCapture();
    const email = residentEmail("registration");
    await withCapture(page, testInfo, {
      slug: "08-resident-self-registration",
      title: "Resident Sign-Up · Create an Account and Household",
      scenario: "resident-self-registration",
      persona: "Resident",
    }, async (capture) => {
      await goto(page, "/register", /Register your household account/i);
      await capture.guidance.step("Create a resident account in a few steps");
      const residentName = captureLabel("Resident Family");
      await fill(page, /Full Name/i, residentName);
      await fill(page, /Email Address/i, email);
      await fill(page, /^Password$/i, captureConfig.residentPassword);
      await fill(page, /Confirm Password/i, captureConfig.residentPassword);
      await capture.guidance.focus(page.getByRole("button", { name: /Create Account/i }), "Create the resident account");
      await acceptTerms(page);
      const accountResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/v1/auth/me") &&
          response.request().method() === "GET",
      );
      await clickButton(page, /Create Account/i);
      const accountResponse = await accountResponsePromise;
      const accountBody = await accountResponse.json() as { id?: string };
      capture.recordCreated("resident-account", accountBody.id ?? email, residentName);
      await waitForApp(page, /Address and Map Pin|Resident Dashboard|Household/i);
      await page.goto("/portal/onboarding", { waitUntil: "domcontentloaded" });
      await waitForApp(page, /Address and Map Pin/i);

      await capture.guidance.title("Household Details · Pin the Home and Register");
      await capture.guidance.step("Place the home on the community map");
      await placeMapPin(page);
      const area = page.locator("#area_id");
      const autoDetected = page.getByText("Auto-detected", { exact: true });
      if (
        (await area.isVisible().catch(() => false)) &&
        !(await autoDetected.isVisible().catch(() => false))
      ) {
        await area.click();
        await page.getByRole("option", { name: /Area/i }).first().click();
      }
      await fill(page, /House No\. \/ Street \/ Subdivision/i, captureLabel("Resident Home Address"));
      await fill(page, /Contact Number/i, "09171234567");
      await fill(page, /Birthday/i, "1995-04-18");
      const sex = page.locator("#sex");
      await sex.click();
      await page.getByRole("option", { name: /Male|Female/i }).first().click();
      await page.locator('input[name="waterway_proximity"]').first().check();
      await capture.guidance.step("Add the family details and flood safety information");
      await capture.guidance.focus(page.getByRole("button", { name: /Complete Registration/i }), "Finish the household details");
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
          householdBody.household.reference_no ?? captureLabel("Self-Registered Household"),
        );
      }
      await waitForToast(page, /Household registered successfully/i);
      await expect(page).toHaveURL(/\/portal/);
    });
  });

  test("admin-assisted household registration", async ({ page }, testInfo) => {
    requireMutationCapture();
    await withCapture(page, testInfo, {
      slug: "09-admin-assisted-registration",
      title: "Barangay Team · Register a Household",
      scenario: "admin-assisted-registration",
      persona: "Barangay Admin",
    }, async (capture) => {
      await login(page, captureConfig.adminEmail, captureConfig.adminPassword, /Households|Registry/i);
      await goto(page, "/admin/households/new", /Create Household/i);
      await capture.guidance.step("Record the family head and home area");
      await fill(page, /Head of Household/i, captureLabel("Assisted Family Head"));
      await fill(page, /Birthday/i, "1988-09-12");
      const headSex = page.locator("#head_sex");
      await headSex.click();
      await page.getByRole("option", { name: /Male|Female/i }).first().click();
      await fill(page, /Contact Number/i, "09179876543");
      const headArea = page.locator("#area_id");
      await headArea.click();
      await page.getByRole("option", { name: /Area/i }).first().click();

      await capture.guidance.step("Pin the home and note nearby waterways");
      await placeMapPin(page);
      await fill(page, /House No\. \/ Street \/ Subdivision/i, captureLabel("Assisted Home Address"));
      await page.locator('input[name="waterway_proximity"]').first().check();

      await capture.guidance.step("Add another family member");
      const addMember = page.getByRole("button", { name: /Add member/i });
      await expect(addMember).toBeVisible();
      await addMember.click();
      await page.locator('[id="members.0.full_name"]').fill(captureLabel("Family Member"));
      await page.locator('[id="members.0.birth_date"]').fill("2016-06-04");
      const memberSex = page.locator('[id="members.0.sex"]');
      await memberSex.click();
      await page.getByRole("option", { name: /Male|Female/i }).first().click();
      const memberRelationship = page.locator('[id="members.0.relationship_to_head"]');
      await memberRelationship.click();
      await page.getByRole("option", { name: /Child|Daughter|Son/i }).first().click();

      await capture.guidance.focus(page.getByRole("button", { name: /Create household/i }), "Review and save the household");
      await clickButton(page, /Create household/i);
      await expect(page.getByRole("dialog")).toBeVisible();
      await capture.guidance.focus(page.getByRole("button", { name: /Confirm and create/i }), "Confirm the household details");
      const householdResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/v1/admin/households") &&
          response.request().method() === "POST",
      );
      await clickButton(page, /Confirm and create/i);
      const householdResponse = await householdResponsePromise;
      if (!householdResponse.ok()) {
        throw new Error(`Admin household registration failed with ${householdResponse.status()}.`);
      }
      const householdBody = await householdResponse.json() as {
        household?: { id?: string; reference_no?: string };
      };
      if (householdBody.household?.id) {
        capture.recordCreated(
          "household",
          householdBody.household.id,
          householdBody.household.reference_no ?? captureLabel("Assisted Household"),
        );
      }
      await waitForToast(page, /created/i);
      const url = page.url();
      const id = url.match(/\/admin\/households\/([^/?]+)/)?.[1];
      if (id) capture.recordCreated("household", id, captureLabel("Assisted Household"));
    });
  });
});
