import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const ALLOWED_HOST = "57-155-90-155.sslip.io";
const DEFAULT_BASE_URL = `https://${ALLOWED_HOST}`;

function readLocalCaptureEnv(): void {
  const envPath = path.join(REPO_ROOT, ".env.capture");
  if (!fs.existsSync(envPath)) return;

  for (const rawLine of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

readLocalCaptureEnv();

function makeRunId(): string {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z")
    .toLowerCase();
  return `run-${stamp}`;
}

function parseBoolean(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  return normalized === "1" || normalized === "true";
}

function parseMilliseconds(key: string, fallback: number): number {
  const parsed = Number.parseInt(envValue(key) ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function envValue(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value || undefined;
}

const configuredBaseUrl = envValue("CAPTURE_BASE_URL") ?? DEFAULT_BASE_URL;
const parsedBaseUrl = new URL(configuredBaseUrl);

if (parsedBaseUrl.hostname !== ALLOWED_HOST) {
  throw new Error(
    `CAPTURE_BASE_URL must target ${ALLOWED_HOST}; refusing to run against ${parsedBaseUrl.hostname}.`,
  );
}

// Playwright may load this module in more than one worker process. Pin a
// generated ID into the inherited environment so a full run shares one
// artifact directory and one manifest even when CAPTURE_RUN_ID is omitted.
const resolvedRunId = envValue("CAPTURE_RUN_ID") ?? makeRunId();
if (!envValue("CAPTURE_RUN_ID")) process.env.CAPTURE_RUN_ID = resolvedRunId;

export const captureConfig = {
  baseUrl: parsedBaseUrl.toString().replace(/\/$/, ""),
  allowedHost: ALLOWED_HOST,
  runId: resolvedRunId,
  mutationsEnabled: parseBoolean(process.env.CAPTURE_MUTATIONS),
  adminEmail: envValue("CAPTURE_ADMIN_EMAIL") ?? "",
  adminPassword: envValue("CAPTURE_ADMIN_PASSWORD") ?? "",
  residentPassword: envValue("CAPTURE_RESIDENT_PASSWORD") ?? `PitchCapture-${Date.now()}!`,
  settleMs: parseMilliseconds("CAPTURE_SETTLE_MS", 550),
  scrollPauseMs: parseMilliseconds("CAPTURE_SCROLL_PAUSE_MS", 280),
  loaderTimeoutMs: parseMilliseconds("CAPTURE_LOADER_TIMEOUT_MS", 8000),
  loaderSettleMs: parseMilliseconds("CAPTURE_LOADER_SETTLE_MS", 300),
  outputDir: path.join(REPO_ROOT, "artifacts", "demo-captures", resolvedRunId),
  testResultsDir: "",
};

// Keep the output directory name stable after the generated run id is known.
captureConfig.outputDir = path.join(
  REPO_ROOT,
  "artifacts",
  "demo-captures",
  captureConfig.runId,
);
captureConfig.testResultsDir = path.join(captureConfig.outputDir, "test-results");

export const SCREEN_SIZE = { width: 1920, height: 1080 };

export function requireMutationCapture(): void {
  if (!captureConfig.mutationsEnabled) {
    throw new Error(
      "Mutating captures are disabled. Set CAPTURE_MUTATIONS=true only when you intend to create tagged records on staging.",
    );
  }
  if (!captureConfig.adminEmail || !captureConfig.adminPassword) {
    throw new Error(
      "CAPTURE_ADMIN_EMAIL and CAPTURE_ADMIN_PASSWORD are required for admin/resident lifecycle captures.",
    );
  }
}

export function captureLabel(label: string): string {
  return `SAGIP-SJ Demo · ${label} · ${captureConfig.runId}`;
}

export function residentEmail(suffix = "resident"): string {
  return `capture-${suffix}-${captureConfig.runId.replace(/[^a-z0-9]/gi, "")}@sanjose.gov.ph`;
}
