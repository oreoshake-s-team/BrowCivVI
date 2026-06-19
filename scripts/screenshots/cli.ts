import { execFileSync } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  prFolderName,
  renderPrIndexHtml,
  renderRootIndexHtml,
  slugify,
  type PrScreenshotMeta,
  type RootGalleryEntry,
} from "./gallery.ts";
import { extensionForFormat, optimizeImage } from "./optimize.ts";

const ASSETS_DIR = path.join("docs", "assets");
const META_FILE = "meta.json";
const INDEX_FILE = "index.html";

interface CliArgs {
  pr: number;
  date: string;
  repo: string;
  files: string[];
  issue?: number;
  title?: string;
}

function fail(message: string): never {
  console.error(`screenshots: ${message}`);
  process.exit(1);
}

function detectRepo(): string {
  try {
    const url = execFileSync("git", ["config", "--get", "remote.origin.url"], {
      encoding: "utf8",
    }).trim();
    const segments = url
      .replace(/\.git$/, "")
      .replace(/\/$/, "")
      .split("/");
    const repo = segments.at(-1);
    const ownerSegment = segments.at(-2);
    const owner = ownerSegment?.includes(":") ? ownerSegment.split(":").at(-1) : ownerSegment;
    if (owner && repo) {
      return `${owner}/${repo}`;
    }
  } catch {
    // fall through to error below
  }
  fail("could not detect repository; pass --repo <owner/name>");
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseArgs(argv: string[]): CliArgs {
  let pr: number | undefined;
  let issue: number | undefined;
  let title: string | undefined;
  let date: string | undefined;
  let repo: string | undefined;
  const files: string[] = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = (): string => {
      const value = argv[i + 1];
      if (value === undefined) {
        fail(`missing value for ${arg ?? "argument"}`);
      }
      i += 1;
      return value;
    };
    switch (arg) {
      case "--pr":
        pr = Number(next());
        break;
      case "--issue":
        issue = Number(next());
        break;
      case "--title":
        title = next();
        break;
      case "--date":
        date = next();
        break;
      case "--repo":
        repo = next();
        break;
      default:
        if (arg !== undefined) {
          files.push(arg);
        }
    }
  }

  if (pr === undefined || !Number.isInteger(pr) || pr <= 0) {
    fail("--pr <number> is required and must be a positive integer");
  }
  if (issue !== undefined && (!Number.isInteger(issue) || issue <= 0)) {
    fail("--issue must be a positive integer");
  }
  if (files.length === 0) {
    fail("provide at least one image file to optimize");
  }

  return {
    pr,
    date: date ?? todayIso(),
    repo: repo ?? detectRepo(),
    files,
    ...(issue !== undefined ? { issue } : {}),
    ...(title ? { title } : {}),
  };
}

async function loadExistingMeta(dir: string): Promise<PrScreenshotMeta | undefined> {
  try {
    const raw = await readFile(path.join(dir, META_FILE), "utf8");
    return JSON.parse(raw) as PrScreenshotMeta;
  } catch {
    return undefined;
  }
}

async function listImages(dir: string): Promise<string[]> {
  const entries = await readdir(dir);
  return entries
    .filter((name) => /\.(png|jpe?g|webp|gif)$/i.test(name))
    .sort((a, b) => a.localeCompare(b));
}

async function writeImages(dir: string, files: string[]): Promise<void> {
  const used = new Set<string>();
  for (const file of files) {
    const input = await readFile(file);
    const result = await optimizeImage(input);
    const ext = extensionForFormat(result.format);
    const base = slugify(path.basename(file, path.extname(file))) || "image";
    let name = `${base}.${ext}`;
    let counter = 2;
    while (used.has(name)) {
      name = `${base}-${String(counter)}.${ext}`;
      counter += 1;
    }
    used.add(name);
    await writeFile(path.join(dir, name), result.data);
    const delta = result.inputBytes - result.outputBytes;
    const note = result.resized ? ` (resized to ${String(result.width)}px wide)` : "";
    console.log(
      `  ${file} -> ${name}: ${String(result.inputBytes)} -> ${String(result.outputBytes)} bytes (-${String(delta)})${note}`,
    );
  }
}

async function rebuildRootIndex(): Promise<void> {
  const entries: RootGalleryEntry[] = [];
  const dirents = await readdir(ASSETS_DIR, { withFileTypes: true });
  for (const dirent of dirents) {
    if (!dirent.isDirectory()) {
      continue;
    }
    const meta = await loadExistingMeta(path.join(ASSETS_DIR, dirent.name));
    if (meta) {
      entries.push({ folder: dirent.name, meta });
    }
  }
  await writeFile(path.join(ASSETS_DIR, INDEX_FILE), renderRootIndexHtml(entries));
}

async function main(argv: string[]): Promise<void> {
  const args = parseArgs(argv);
  const folder = prFolderName({
    date: args.date,
    pr: args.pr,
    ...(args.title ? { title: args.title } : {}),
  });
  const dir = path.join(ASSETS_DIR, folder);
  await mkdir(dir, { recursive: true });

  console.log(`Optimizing ${String(args.files.length)} image(s) into ${dir}`);
  await writeImages(dir, args.files);

  const existing = await loadExistingMeta(dir);
  const images = await listImages(dir);
  const meta: PrScreenshotMeta = {
    pr: args.pr,
    date: args.date,
    repo: args.repo,
    images,
    ...(args.issue !== undefined
      ? { issue: args.issue }
      : existing?.issue !== undefined
        ? { issue: existing.issue }
        : {}),
    ...(args.title ? { title: args.title } : existing?.title ? { title: existing.title } : {}),
  };

  await writeFile(path.join(dir, META_FILE), `${JSON.stringify(meta, null, 2)}\n`);
  await writeFile(path.join(dir, INDEX_FILE), renderPrIndexHtml(meta));
  await rebuildRootIndex();

  console.log(`\nGallery updated: ${path.join(ASSETS_DIR, INDEX_FILE)}`);
  const first = images[0];
  if (first) {
    console.log("Reference in a PR/issue with a raw link on the pushed branch, e.g.:");
    console.log(
      `  ![screenshot](https://raw.githubusercontent.com/${meta.repo}/<branch>/${ASSETS_DIR}/${folder}/${first})`,
    );
  }
}

void main(process.argv.slice(2)).catch((error: unknown) => {
  fail(error instanceof Error ? error.message : String(error));
});
