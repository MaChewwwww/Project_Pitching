import fs from "node:fs/promises";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";

import ffmpegPath from "ffmpeg-static";

import { captureConfig } from "./config";
import type { CaptureMetadata, ClipSegment } from "./capture-run";

type ManifestClip = CaptureMetadata & {
  sourceWebm: string;
  mp4: string;
  duration: number;
  durationMs: number;
  status: "ready" | "failed";
};

async function filesUnder(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true }).catch(() => []);
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await filesUnder(fullPath)));
    else files.push(fullPath);
  }
  return files;
}

function runFfmpeg(args: string[]): Promise<string> {
  const binary = ffmpegPath;
  if (!binary) throw new Error("ffmpeg-static did not provide a binary for this platform.");
  return new Promise((resolve, reject) => {
    const child: ChildProcess = spawn(binary, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr?.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });
    child.on("error", reject);
    child.on("close", (code: number | null) => {
      if (code === 0) resolve(stderr);
      else reject(new Error(`ffmpeg failed (${code}): ${stderr.slice(-1200)}`));
    });
  });
}

type VideoInfo = { durationMs: number; width: number; height: number };

async function inspectVideo(file: string): Promise<VideoInfo> {
  const output = await runFfmpeg(["-hide_banner", "-i", file, "-f", "null", "-"]);
  const duration = output.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/i);
  const stream = output.match(/Stream #[^:]+:\d+[^\n]*?(\d{3,5})x(\d{3,5})/i);
  if (!duration || !stream) throw new Error(`Could not inspect encoded video ${file}.`);
  const durationMs =
    (Number(duration[1]) * 3600 + Number(duration[2]) * 60 + Number(duration[3])) * 1000;
  const width = Number(stream[1]);
  const height = Number(stream[2]);
  if (width !== 1920 || height !== 1080) {
    throw new Error(`Encoded video ${file} is ${width}x${height}; expected 1920x1080.`);
  }
  return { durationMs, width, height };
}

async function convert(source: string, destination: string, segment?: ClipSegment): Promise<void> {
  await fs.mkdir(path.dirname(destination), { recursive: true });
  const args = ["-y"];
  if (segment?.startMs !== undefined) args.push("-ss", `${segment.startMs / 1000}`);
  args.push("-i", source);
  if (segment?.endMs !== undefined) {
    const duration = Math.max(0.2, (segment.endMs - (segment.startMs ?? 0)) / 1000);
    args.push("-t", `${duration}`);
  }
  args.push(
    "-an",
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-crf", "20",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    destination,
  );
  await runFfmpeg(args);
  await inspectVideo(destination);
}

function artifactRelative(file: string): string {
  return path.relative(captureConfig.outputDir, file).split(path.sep).join("/");
}

export default async function globalTeardown(): Promise<void> {
  await fs.mkdir(captureConfig.outputDir, { recursive: true });
  const metadataFiles = (await filesUnder(captureConfig.testResultsDir)).filter((file) => file.endsWith("capture-meta.json"));
  const clips: ManifestClip[] = [];

  for (const metadataFile of metadataFiles) {
    const metadata = JSON.parse(await fs.readFile(metadataFile, "utf8")) as CaptureMetadata;
    const directory = path.dirname(metadataFile);
    const source = (await filesUnder(directory)).find((file) => file.endsWith(".webm"));
    const outputDirectory = path.join(captureConfig.outputDir, "mp4");
    const destination = path.join(outputDirectory, `${metadata.slug}.mp4`);
    if (!source) {
      clips.push({
        ...metadata,
        sourceWebm: "",
        mp4: artifactRelative(destination),
        duration: 0,
        durationMs: 0,
        status: "failed",
      });
      continue;
    }
    try {
      await convert(source, destination);
      const fullVideo = await inspectVideo(destination);
      clips.push({
        ...metadata,
        sourceWebm: artifactRelative(source),
        mp4: artifactRelative(destination),
        duration: fullVideo.durationMs / 1000,
        durationMs: fullVideo.durationMs,
        status: "ready",
      });
      for (const segment of metadata.segments ?? []) {
        const segmentPath = path.join(outputDirectory, `${segment.slug}.mp4`);
        await convert(source, segmentPath, segment);
        const segmentVideo = await inspectVideo(segmentPath);
        clips.push({
          ...metadata,
          ...segment,
          sourceWebm: artifactRelative(source),
          mp4: artifactRelative(segmentPath),
          duration: segmentVideo.durationMs / 1000,
          durationMs: segmentVideo.durationMs,
          status: "ready",
        });
      }
    } catch (error) {
      clips.push({
        ...metadata,
        sourceWebm: artifactRelative(source),
        mp4: artifactRelative(destination),
        duration: 0,
        durationMs: 0,
        status: "failed",
      });
      throw error;
    }
  }

  const manifest = {
    runId: captureConfig.runId,
    baseUrl: captureConfig.baseUrl,
    screen: { width: 1920, height: 1080 },
    generatedAt: new Date().toISOString(),
    clips,
  };
  await fs.writeFile(
    path.join(captureConfig.outputDir, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
}
