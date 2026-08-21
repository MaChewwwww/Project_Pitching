import { expect, test } from "@playwright/test";

import { withCapture } from "../src/capture-run";
import {
  goto,
  freezeLandingHero,
  pause,
  scrollPage,
  waitForApp,
} from "../src/browser";

test.describe("public information site captures", () => {
  test("landing overview and About page", async ({ page }, testInfo) => {
    await withCapture(page, testInfo, {
      slug: "01-public-site-overview",
      title: "Welcome · Home Page and About",
      scenario: "public-site-overview",
      persona: "Public Site",
    }, async (capture) => {
      await goto(page, "/", /From Risk We Learn/i);
      await freezeLandingHero(page);
      await capture.guidance.step("Start at the community home page");
      await capture.guidance.step("See where flooding can happen");
      await scrollPage(page, 16);
      await capture.guidance.step("Explore the information families can use");
      await capture.guidance.pause(800);

      await goto(page, "/about", /About the SAGIP Platform/i);
      await capture.guidance.title("About SAGIP-SJ · Our Purpose and Team");
      await scrollPage(page, 7);
      await expect(page.getByRole("heading", { name: /Interdisciplinary Project Team/i })).toBeVisible();
    });
  });

  test("Flood Hazard Map", async ({ page }, testInfo) => {
    await withCapture(page, testInfo, {
      slug: "02-public-hazard-map",
      title: "Flood Map · See Risk Areas and Safe Places",
      scenario: "public-hazard-map",
      persona: "Public Site",
    }, async (capture) => {
      await goto(page, "/hazard-map", /Flood Hazard Map/i);
      await capture.guidance.step("See which places may flood and how deep");
      await capture.guidance.focus(page.getByRole("heading", { name: /Flood Hazard Map/i }), "Flood risk map");
      await capture.guidance.pause(1200);
      const layerButton = page.getByRole("button", { name: /Layers/i }).first();
      if (await layerButton.isVisible().catch(() => false)) {
        await capture.guidance.focus(layerButton, "Choose what to show");
        await layerButton.click();
        await pause(page, 700);
      }
      await scrollPage(page, 5);
      await expect(page.getByText(/Project NOAH|ODC-ODbL/i).first()).toBeVisible();
    });
  });

  test("Weather, river level, and flood history", async ({ page }, testInfo) => {
    await withCapture(page, testInfo, {
      slug: "03-public-weather-river-history",
      title: "Weather and River Watch · Today to Past Floods",
      scenario: "public-weather-river-history",
      persona: "Public Site",
    }, async (capture) => {
      await goto(page, "/weather", /Weather &/i);
      await capture.guidance.step("See today’s weather, rain, and heat");
      await capture.guidance.focus(page.getByRole("heading", { name: /Weather/i }).first(), "Today’s weather");
      const heatTab = page.getByRole("tab", { name: /Heat Index/i });
      if (await heatTab.isVisible().catch(() => false)) {
        await capture.guidance.focus(heatTab, "See the heat level");
        await heatTab.click();
      }
      const forecast = page.getByRole("combobox").first();
      if (await forecast.isVisible().catch(() => false)) {
        await capture.guidance.focus(forecast, "Choose the forecast days");
        await forecast.click();
        const daily = page.getByRole("option", { name: /Daily/i });
        if (await daily.isVisible().catch(() => false)) await daily.click();
      }
      await capture.guidance.step("Compare the river level with past floods");
      await scrollPage(page, 5);
      await expect(page.getByRole("heading", { name: /Past flood events/i })).toBeVisible();
    });
  });

  test("Barangay Facilities and public hotline directory", async ({ page }, testInfo) => {
    await withCapture(page, testInfo, {
      slug: "04-public-facilities-hotlines",
      title: "Community Facilities · Help, Health, and Emergency Contacts",
      scenario: "public-facilities-hotlines",
      persona: "Public Site",
    }, async (capture) => {
      await goto(page, "/barangay-facilities", /Facilities & Services/i);
      await capture.guidance.step("Find help, health, and evacuation places");
      const selectAll = page.getByRole("button", { name: /Select All/i }).first();
      if (await selectAll.isVisible().catch(() => false)) {
        await capture.guidance.focus(selectAll, "Show every place");
        await selectAll.click();
      }
      const directory = page.getByRole("combobox").first();
      if (await directory.isVisible().catch(() => false)) {
        await capture.guidance.focus(directory, "Choose a place type");
        await directory.click();
        const evac = page.getByRole("option", { name: /Evacuation/i }).first();
        if (await evac.isVisible().catch(() => false)) await evac.click();
      }
      await capture.guidance.step("Find emergency contacts for every area");
      await scrollPage(page, 5);
      await expect(page.getByText(/Emergency Call Lines|Hotline/i).first()).toBeVisible();
    });
  });

  test("Announcements and article detail", async ({ page }, testInfo) => {
    await withCapture(page, testInfo, {
      slug: "05-public-announcements",
      title: "Community Updates · Important Notices",
      scenario: "public-announcements",
      persona: "Public Site",
    }, async (capture) => {
      await goto(page, "/announcements", /Announcements/i);
      await capture.guidance.step("Browse the latest community notices");
      const firstArticle = page.getByRole("link", { name: /Read (announcement|alert)/i }).first();
      await capture.guidance.focus(firstArticle, "Open a community update");
      await firstArticle.click();
      await waitForApp(page, /Habagat|Announcement|Advisory/i);
      await capture.guidance.step("Read the full message and who it helps");
      await scrollPage(page, 4);
    });
  });

  test("Preparedness guides and donation drives", async ({ page }, testInfo) => {
    await withCapture(page, testInfo, {
      slug: "06-public-guides-donations",
      title: "Be Ready · Guides and Ways to Help",
      scenario: "public-guides-donations",
      persona: "Public Site",
    }, async (capture) => {
      await goto(page, "/guides", /Preparedness|Guides/i);
      await capture.guidance.step("Open a simple guide for flood days");
      const guide = page.getByRole("link", { name: /Read Preparedness Guide/i }).first();
      await capture.guidance.focus(guide, "Read the flood guide");
      await guide.click();
      await waitForApp(page, /Flood|Guide/i);
      await scrollPage(page, 4);

      await goto(page, "/donation-drives", /Donation/i);
      await capture.guidance.step("See how the community can share support");
      await capture.guidance.focus(page.getByRole("link", { name: /Donation|Read/i }).first(), "Open a support drive");
      await page.getByRole("link", { name: /Donation|Read/i }).first().click();
      await waitForApp(page, /Donation|Drive/i);
      await scrollPage(page, 4);
    });
  });

  test("Activities and emergency help", async ({ page }, testInfo) => {
    await withCapture(page, testInfo, {
      slug: "07-public-activities-help",
      title: "Community Life · Activities and Emergency Help",
      scenario: "public-activities-help",
      persona: "Public Site",
    }, async (capture) => {
      await goto(page, "/activities", /Activities/i);
      await capture.guidance.step("See community activities and ways to join");
      await scrollPage(page, 4);
      await goto(page, "/help", /Help|Frequently Asked/i);
      await capture.guidance.step("Find answers and emergency help");
      await scrollPage(page, 4);
      await expect(page.getByText(/In an emergency/i).first()).toBeVisible();
    });
  });
});
