import { expect, type Locator, type Page } from "@playwright/test";

import { captureConfig } from "./config";

/**
 * Wait for the app's shared full-page splash to finish before an interaction.
 * The product publishes its ready state on <html>; the text filter keeps this
 * recorder-side wait scoped to the real SAGIP splash rather than arbitrary
 * aria-hidden icons or dialogs.
 */
export async function waitForPageLoader(page: Page): Promise<void> {
  const splash = page
    .locator('div[aria-hidden="true"]')
    .filter({ hasText: /SAGIP\s+San Jose/i })
    .first();
  const hasSplash = await splash.isVisible({ timeout: 1000 }).catch(() => false);
  if (!hasSplash) return;

  try {
    await page.waitForFunction(
      () => document.documentElement.dataset.splashReady === "true",
      undefined,
      { timeout: captureConfig.loaderTimeoutMs },
    );
  } catch (error) {
    if (page.isClosed()) throw error;
  }
  await page.waitForTimeout(captureConfig.loaderSettleMs);
}

export async function waitForApp(page: Page, marker?: string | RegExp): Promise<void> {
  await waitForPageLoader(page);
  await page.waitForTimeout(captureConfig.settleMs);
  if (marker) await expect(page.getByText(marker).first()).toBeVisible({ timeout: 20000 });
}

export async function goto(page: Page, route: string, marker?: string | RegExp): Promise<void> {
  // The staging pages can keep DOMContentLoaded pending while large client
  // bundles hydrate. Commit is enough to start the app; waitForApp below uses
  // the visible route marker and shared splash as the readiness contract.
  await page.goto(route, { waitUntil: "commit" });
  await waitForApp(page, marker);
}

export async function clickText(page: Page, text: string | RegExp): Promise<void> {
  await waitForPageLoader(page);
  const target = page.getByText(text).first();
  await expect(target).toBeVisible({ timeout: 20000 });
  await target.click();
}

export async function clickButton(page: Page, name: string | RegExp): Promise<Locator> {
  await waitForPageLoader(page);
  const target = page.getByRole("button", { name }).first();
  await expect(target).toBeVisible({ timeout: 20000 });
  await target.click();
  return target;
}

export async function clickLink(page: Page, name: string | RegExp): Promise<Locator> {
  await waitForPageLoader(page);
  const target = page.getByRole("link", { name }).first();
  await expect(target).toBeVisible({ timeout: 20000 });
  await target.click();
  return target;
}

export async function fill(page: Page, label: string | RegExp, value: string): Promise<Locator> {
  await waitForPageLoader(page);
  const target = page.getByLabel(label).first();
  await expect(target).toBeVisible({ timeout: 20000 });
  await target.fill(value);
  return target;
}

export async function login(page: Page, email: string, password: string, marker: string | RegExp): Promise<void> {
  await goto(page, "/login", /Sign in to your account/i);
  await fill(page, /Email Address/i, email);
  await fill(page, /^Password$/i, password);
  await clickButton(page, /Sign in to Dashboard/i);
  await waitForApp(page, marker);
}

export async function logout(page: Page): Promise<void> {
  const target = page.getByText(/Sign out/i).first();
  if (await target.isVisible().catch(() => false)) await target.click();
  else await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
}

export async function scrollPage(page: Page, steps = 12): Promise<void> {
  await page.evaluate(() => {
    document.documentElement.style.setProperty("scroll-behavior", "auto", "important");
    document.body.style.setProperty("scroll-behavior", "auto", "important");
  });
  const publicSurface = await page.evaluate(() => {
    const main = document.querySelector<HTMLElement>("main#main");
    if (!main || !main.querySelector("canvas")) return null;
    main.style.setProperty("will-change", "transform");
    const height = Math.max(main.scrollHeight, main.getBoundingClientRect().height);
    return { height, viewport: window.innerHeight };
  });
  const max = publicSurface
    ? Math.max(0, publicSurface.height - publicSurface.viewport)
    : await page.evaluate(() => Math.max(0, document.documentElement.scrollHeight - window.innerHeight));
  const increment = Math.max(1, max / Math.max(1, steps));
  for (let index = 0; index <= steps; index += 1) {
    if (index > 0) {
      const top = Math.min(max, increment * index);
      if (publicSurface) {
        await page.evaluate((offset) => {
          const main = document.querySelector<HTMLElement>("main#main");
          if (main) main.style.transform = `translate3d(0, -${offset}px, 0)`;
        }, top);
      } else {
        await page.evaluate((nextTop) => {
          const scroller = document.scrollingElement;
          if (scroller) scroller.scrollTop = nextTop;
        }, top);
      }
    }
    await page.waitForTimeout(captureConfig.scrollPauseMs);
  }
  await page.evaluate((isPublic) => {
    if (isPublic) {
      const main = document.querySelector<HTMLElement>("main#main");
      if (main) {
        main.style.removeProperty("transform");
        main.style.removeProperty("will-change");
      }
      return;
    }
    const scroller = document.scrollingElement;
    if (scroller) scroller.scrollTop = 0;
  }, !!publicSurface);
  await page.waitForTimeout(Math.min(350, captureConfig.scrollPauseMs));
}

/**
 * Preserve the landing hero's first rendered 3D frame while the recorder
 * scrolls. The public scene uses an always-running WebGL loop; replacing its
 * canvas with a same-size image is capture-only and leaves product runtime
 * behaviour untouched.
 */
export async function freezeLandingHero(page: Page): Promise<void> {
  const ready = await page
    .waitForFunction(
      () => {
        const canvas = document.querySelector<HTMLCanvasElement>("main#main canvas");
        return Boolean(canvas && canvas.width > 0 && canvas.height > 0);
      },
      undefined,
      { timeout: 10_000 },
    )
    .then(() => true)
    .catch(() => false);
  if (!ready) return;

  await page.waitForTimeout(350);
  await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>("main#main canvas");
    if (!canvas || canvas.dataset.sagipCaptureFrozen === "true") return;

    try {
      const image = document.createElement("img");
      image.src = canvas.toDataURL("image/png");
      image.alt = "";
      image.setAttribute("aria-hidden", "true");
      image.dataset.sagipCaptureFrozen = "true";
      image.style.cssText =
        "position:absolute;inset:0;width:100%;height:100%;object-fit:fill;pointer-events:none;";
      canvas.dataset.sagipCaptureFrozen = "true";
      canvas.parentElement?.appendChild(image);
      canvas.style.display = "none";
      const context = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
      context?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      // If a context is already lost, hiding the broken canvas is preferable
      // to keeping a high-cost render loop alive for the rest of the clip.
      canvas.style.display = "none";
      canvas.dataset.sagipCaptureFrozen = "true";
    }
  });
}

export async function selectOption(page: Page, label: string | RegExp, option: string | RegExp): Promise<void> {
  await waitForPageLoader(page);
  const select = page.getByRole("combobox", { name: label }).first();
  await expect(select).toBeVisible({ timeout: 20000 });
  await select.click();
  await page.getByRole("option", { name: option }).first().click();
}

export async function selectFirstOption(page: Page, label: string | RegExp, option?: string | RegExp): Promise<void> {
  await waitForPageLoader(page);
  const select = page.getByRole("combobox", { name: label }).first();
  await expect(select).toBeVisible({ timeout: 20000 });
  await select.click();
  const candidate = option
    ? page.getByRole("option", { name: option }).first()
    : page.getByRole("option").first();
  await expect(candidate).toBeVisible({ timeout: 20000 });
  await candidate.click();
}

export async function waitForToast(page: Page, text: string | RegExp): Promise<void> {
  await expect(page.getByText(text).last()).toBeVisible({ timeout: 20000 });
}

export async function pause(page: Page, milliseconds = 600): Promise<void> {
  await page.waitForTimeout(milliseconds);
}
