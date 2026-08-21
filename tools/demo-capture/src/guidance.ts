import type { Locator, Page } from "@playwright/test";

export type GuidanceEvent = {
  atMs: number;
  kind: "title" | "step" | "focus" | "clear";
  label: string;
};

export type GuidancePersona = "Resident" | "Barangay Admin" | "Public Site";

const PERSONA_LABEL: Record<GuidancePersona, string> = {
  Resident: "Resident",
  "Barangay Admin": "Barangay Team",
  "Public Site": "Visitor",
};

const GUIDANCE_STYLE = `
  html, body { scroll-behavior: auto !important; }
  *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; }
  .reveal { animation: none !important; opacity: 1 !important; transform: none !important; }
  .sagip-capture-guidance { position: fixed; inset: 0; z-index: 2147483000; pointer-events: none; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
  .sagip-capture-guidance__bar { position: absolute; top: 26px; left: 34px; display: flex; align-items: center; gap: 14px; padding: 11px 16px; color: #fff; background: rgba(2, 44, 34, .94); border: 1px solid rgba(167, 243, 208, .45); border-radius: 14px; box-shadow: 0 12px 34px rgba(2, 44, 34, .32); }
  .sagip-capture-guidance__persona { padding: 4px 8px; border-radius: 999px; color: #064e3b; background: #a7f3d0; font-size: 11px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
  .sagip-capture-guidance__label { font-size: 15px; font-weight: 750; letter-spacing: .01em; }
  .sagip-capture-guidance__title { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); padding: 22px 32px; color: #fff; background: rgba(2, 44, 34, .96); border: 1px solid rgba(167, 243, 208, .55); border-radius: 18px; box-shadow: 0 24px 60px rgba(2, 44, 34, .35); font-size: 25px; font-weight: 850; text-align: center; white-space: nowrap; }
  .sagip-capture-guidance__ring { position: absolute; border: 3px solid #fbbf24; border-radius: 12px; box-shadow: 0 0 0 7px rgba(251, 191, 36, .18), 0 0 30px rgba(251, 191, 36, .52); transition: all 180ms ease; }
  .sagip-capture-guidance__cursor { position: absolute; width: 20px; height: 20px; border: 3px solid #fff; border-radius: 50%; background: #f59e0b; box-shadow: 0 0 0 5px rgba(245, 158, 11, .25), 0 2px 8px rgba(0,0,0,.28); transition: all 180ms ease; }
`;

type GuidanceState = { persona: string; label: string };

export class Guidance {
  private readonly startedAt = Date.now();
  private installed = false;
  readonly events: GuidanceEvent[] = [];

  get currentPersona(): GuidancePersona {
    return this.persona;
  }

  constructor(
    private readonly page: Page,
    private persona: GuidancePersona,
  ) {}

  async install(): Promise<void> {
    // Full navigations replace the document, so the transient overlay must be
    // re-mounted even when the same CaptureRun continues across routes.
    if (this.installed && (await this.page.locator(".sagip-capture-guidance").count()) > 0) return;
    await this.page.addStyleTag({ content: GUIDANCE_STYLE });
    await this.page.evaluate((state: GuidanceState) => {
      const root = document.createElement("div");
      root.className = "sagip-capture-guidance";
      root.innerHTML = `
        <div class="sagip-capture-guidance__bar">
          <span class="sagip-capture-guidance__persona"></span>
          <span class="sagip-capture-guidance__label"></span>
        </div>
        <div class="sagip-capture-guidance__title" hidden></div>
        <div class="sagip-capture-guidance__ring" hidden></div>
        <div class="sagip-capture-guidance__cursor" hidden></div>
      `;
      document.body.appendChild(root);
      const persona = root.querySelector<HTMLElement>(".sagip-capture-guidance__persona");
      const label = root.querySelector<HTMLElement>(".sagip-capture-guidance__label");
      if (persona) persona.textContent = state.persona;
      if (label) label.textContent = state.label;
    }, { persona: PERSONA_LABEL[this.persona], label: "Getting things ready…" });
    this.installed = true;
  }

  private mark(kind: GuidanceEvent["kind"], label: string): void {
    this.events.push({ atMs: Date.now() - this.startedAt, kind, label });
  }

  async title(label: string, holdMs = 1200): Promise<void> {
    await this.install();
    this.mark("title", label);
    await this.page.evaluate((text: string) => {
      const title = document.querySelector<HTMLElement>(".sagip-capture-guidance__title");
      if (!title) return;
      title.textContent = text;
      title.hidden = false;
    }, label);
    await this.page.waitForTimeout(holdMs);
    await this.page.evaluate(() => {
      const title = document.querySelector<HTMLElement>(".sagip-capture-guidance__title");
      if (title) title.hidden = true;
    });
  }

  async step(label: string, holdMs = 450): Promise<void> {
    await this.install();
    this.mark("step", label);
    await this.page.evaluate((text: string) => {
      const node = document.querySelector<HTMLElement>(".sagip-capture-guidance__label");
      if (node) node.textContent = text;
    }, label);
    await this.page.waitForTimeout(holdMs);
  }

  async setPersona(persona: GuidancePersona): Promise<void> {
    this.persona = persona;
    await this.install();
    await this.page.evaluate((nextPersona: string) => {
      const node = document.querySelector<HTMLElement>(".sagip-capture-guidance__persona");
      if (node) node.textContent = nextPersona;
    }, PERSONA_LABEL[persona]);
  }

  async focus(locator: Locator, label: string): Promise<void> {
    await this.install();
    let box = await locator.boundingBox();
    const viewport = this.page.viewportSize();
    const visible =
      !!box &&
      !!viewport &&
      box.y >= 0 &&
      box.x >= 0 &&
      box.y + box.height <= viewport.height &&
      box.x + box.width <= viewport.width;
    if (!visible) {
      await locator.scrollIntoViewIfNeeded();
      box = await locator.boundingBox();
    }
    if (!box) throw new Error(`Could not focus capture target: ${label}`);
    this.mark("focus", label);
    await this.page.evaluate((target: { box: { x: number; y: number; width: number; height: number }; label: string }) => {
      const ring = document.querySelector<HTMLElement>(".sagip-capture-guidance__ring");
      const cursor = document.querySelector<HTMLElement>(".sagip-capture-guidance__cursor");
      const text = document.querySelector<HTMLElement>(".sagip-capture-guidance__label");
      if (ring) {
        ring.hidden = false;
        ring.style.left = `${target.box.x - 7}px`;
        ring.style.top = `${target.box.y - 7}px`;
        ring.style.width = `${target.box.width + 14}px`;
        ring.style.height = `${target.box.height + 14}px`;
      }
      if (cursor) {
        cursor.hidden = false;
        cursor.style.left = `${target.box.x + Math.min(target.box.width / 2, 24) - 10}px`;
        cursor.style.top = `${target.box.y + Math.min(target.box.height / 2, 24) - 10}px`;
      }
      if (text) text.textContent = target.label;
    }, { box, label });
    await this.page.waitForTimeout(350);
  }

  async clear(): Promise<void> {
    if (!this.installed) return;
    this.mark("clear", "");
    await this.page.evaluate(() => {
      for (const selector of [".sagip-capture-guidance__ring", ".sagip-capture-guidance__cursor"]) {
        const node = document.querySelector<HTMLElement>(selector);
        if (node) node.hidden = true;
      }
    });
  }

  async pause(milliseconds = 600): Promise<void> {
    await this.page.waitForTimeout(milliseconds);
  }
}
