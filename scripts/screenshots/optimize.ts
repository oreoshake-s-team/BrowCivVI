import sharp from "sharp";

export type ImageFormat = "png" | "jpeg" | "webp" | "gif";

export interface OptimizeOptions {
  maxWidth?: number;
  maxBytes?: number;
}

export interface OptimizeResult {
  data: Buffer;
  format: ImageFormat;
  width: number;
  height: number;
  inputBytes: number;
  outputBytes: number;
  resized: boolean;
  lossy: boolean;
  overBudget: boolean;
}

const DEFAULT_MAX_WIDTH = 800;
const DEFAULT_MAX_BYTES = 40_000;
const BUDGET_FLOOR_WIDTH = 480;
const WIDTH_STEP = 80;
const QUALITY_STEPS = [90, 80, 70, 60, 50, 40];

const EXTENSION_BY_FORMAT: Record<ImageFormat, string> = {
  png: "png",
  jpeg: "jpg",
  webp: "webp",
  gif: "gif",
};

export function extensionForFormat(format: ImageFormat): string {
  return EXTENSION_BY_FORMAT[format];
}

function widthCandidates(startWidth: number): number[] {
  if (startWidth <= BUDGET_FLOOR_WIDTH) {
    return [startWidth];
  }
  const widths: number[] = [];
  for (let width = startWidth; width > BUDGET_FLOOR_WIDTH; width -= WIDTH_STEP) {
    widths.push(width);
  }
  widths.push(BUDGET_FLOOR_WIDTH);
  return widths;
}

async function encodeLossless(
  input: Buffer,
  format: ImageFormat,
  width: number,
  resize: boolean,
): Promise<{ data: Buffer; width: number; height: number }> {
  let pipeline = sharp(input);
  if (resize) {
    pipeline = pipeline.resize({ width, withoutEnlargement: true });
  }
  switch (format) {
    case "png":
      pipeline = pipeline.png({ compressionLevel: 9, effort: 10, palette: false });
      break;
    case "jpeg":
      pipeline = pipeline.jpeg({ quality: 90, mozjpeg: true });
      break;
    case "webp":
      pipeline = pipeline.webp({ lossless: true, effort: 6 });
      break;
    case "gif":
      pipeline = pipeline.gif();
      break;
  }
  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

async function encodeWebp(
  input: Buffer,
  width: number,
  resize: boolean,
  quality: number,
): Promise<{ data: Buffer; width: number; height: number }> {
  let pipeline = sharp(input);
  if (resize) {
    pipeline = pipeline.resize({ width, withoutEnlargement: true });
  }
  const { data, info } = await pipeline
    .webp({ quality, effort: 6 })
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

export async function optimizeImage(
  input: Buffer,
  options: OptimizeOptions = {},
): Promise<OptimizeResult> {
  const maxWidth = options.maxWidth ?? DEFAULT_MAX_WIDTH;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const metadata = await sharp(input).metadata();
  const sourceFormat = metadata.format;

  if (
    sourceFormat !== "png" &&
    sourceFormat !== "jpeg" &&
    sourceFormat !== "webp" &&
    sourceFormat !== "gif"
  ) {
    throw new Error(`Unsupported image format: ${sourceFormat}`);
  }

  const sourceWidth = metadata.width;
  const sourceHeight = metadata.height;
  const startWidth = Math.min(sourceWidth, maxWidth);
  const startResized = startWidth < sourceWidth;

  const lossless = await encodeLossless(input, sourceFormat, startWidth, startResized);
  let baseData = lossless.data;
  let baseWidth = lossless.width;
  let baseHeight = lossless.height;
  if (!startResized && baseData.length >= input.length) {
    baseData = input;
    baseWidth = sourceWidth;
    baseHeight = sourceHeight;
  }

  if (baseData.length <= maxBytes || sourceFormat === "gif") {
    return {
      data: baseData,
      format: sourceFormat,
      width: baseWidth,
      height: baseHeight,
      inputBytes: input.length,
      outputBytes: baseData.length,
      resized: startResized,
      lossy: false,
      overBudget: baseData.length > maxBytes,
    };
  }

  let smallest: { data: Buffer; width: number; height: number } | undefined;
  for (const width of widthCandidates(startWidth)) {
    const resize = width < sourceWidth;
    for (const quality of QUALITY_STEPS) {
      const candidate = await encodeWebp(input, width, resize, quality);
      if (!smallest || candidate.data.length < smallest.data.length) {
        smallest = candidate;
      }
      if (candidate.data.length <= maxBytes) {
        return {
          data: candidate.data,
          format: "webp",
          width: candidate.width,
          height: candidate.height,
          inputBytes: input.length,
          outputBytes: candidate.data.length,
          resized: resize,
          lossy: true,
          overBudget: false,
        };
      }
    }
  }

  const fallback = smallest ?? { data: baseData, width: baseWidth, height: baseHeight };
  return {
    data: fallback.data,
    format: smallest ? "webp" : sourceFormat,
    width: fallback.width,
    height: fallback.height,
    inputBytes: input.length,
    outputBytes: fallback.data.length,
    resized: fallback.width < sourceWidth,
    lossy: smallest !== undefined,
    overBudget: true,
  };
}
