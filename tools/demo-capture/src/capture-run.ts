import fs from "node:fs/promises";
import path from "node:path";
import type { Page, TestInfo } from "@playwright/test";

import { captureConfig } from "./config";
import { Guidance, type GuidanceEvent, type GuidancePersona } from "./guidance";

export type CreatedRecord = {
  kind: string;
  id: string;
  label: string;
};

export type ClipSegment = {
  slug: string;
  title: string;
  scenario: string;
  persona?: GuidancePersona;
  startMs: number;
  endMs?: number;
};

export type CaptureMetadata = {
  slug: string;
  title: string;
  scenario: string;
  persona: "Resident" | "Barangay Admin" | "Public Site";
  runId: string;
  startedAt: string;
  screen: { width: number; height: number };
  segments?: ClipSegment[];
  createdRecords?: CreatedRecord[];
  timeline?: GuidanceEvent[];
};

export class CaptureRun {
  readonly guidance: Guidance;
  private readonly createdRecords: CreatedRecord[] = [];
  private readonly segments: ClipSegment[] = [];

  constructor(
    private readonly page: Page,
    private readonly testInfo: TestInfo,
    private readonly metadata: CaptureMetadata,
  ) {
    this.guidance = new Guidance(page, metadata.persona);
  }

  async start(): Promise<void> {
    await this.guidance.install();
    await this.guidance.title(this.metadata.title);
  }

  recordCreated(kind: string, id: string, label: string): void {
    this.createdRecords.push({ kind, id, label });
  }

  segment(slug: string, title: string, scenario: string, startMs: number, endMs?: number): void {
    this.segments.push({
      slug,
      title,
      scenario,
      persona: this.guidance.currentPersona,
      startMs,
      endMs,
    });
  }

  async finish(): Promise<void> {
    const payload: CaptureMetadata = {
      ...this.metadata,
      segments: this.segments.length ? this.segments : undefined,
      createdRecords: this.createdRecords.length ? this.createdRecords : undefined,
      timeline: this.guidance.events,
    };
    const destination = this.testInfo.outputPath("capture-meta.json");
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  }
}

export async function withCapture<T>(
  page: Page,
  testInfo: TestInfo,
  metadata: Omit<CaptureMetadata, "runId" | "startedAt" | "screen">,
  work: (capture: CaptureRun) => Promise<T>,
): Promise<T> {
  const capture = new CaptureRun(page, testInfo, {
    ...metadata,
    runId: captureConfig.runId,
    startedAt: new Date().toISOString(),
    screen: { width: 1920, height: 1080 },
  });
  await capture.start();
  try {
    return await work(capture);
  } finally {
    await capture.finish();
  }
}
