import sharp from "sharp";

export interface OptimizeOptions {
  maxWidth?: number;
}

export interface OptimizeResult {
  data: Buffer;
  format: "png" | "jpeg" | "webp" | "gif";
  width: number;
  height: number;
  inputBytes: number;
  outputBytes: number;
  resized: boolean;
}

const DEFAULT_MAX_WIDTH = 800;

const EXTENSION_BY_FORMAT: Record<OptimizeResult["format"], string> = {
  png: "png",
  jpeg: "jpg",
  webp: "webp",
  gif: "gif",
};

export function extensionForFormat(format: OptimizeResult["format"]): string {
  return EXTENSION_BY_FORMAT[format];
}

export async function optimizeImage(
  input: Buffer,
  options: OptimizeOptions = {},
): Promise<OptimizeResult> {
  const maxWidth = options.maxWidth ?? DEFAULT_MAX_WIDTH;
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
  const resized = sourceWidth > maxWidth;

  let pipeline = sharp(input);
  if (resized) {
    pipeline = pipeline.resize({ width: maxWidth, withoutEnlargement: true });
  }

  switch (sourceFormat) {
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

  if (!resized && data.length >= input.length) {
    return {
      data: input,
      format: sourceFormat,
      width: sourceWidth,
      height: sourceHeight,
      inputBytes: input.length,
      outputBytes: input.length,
      resized: false,
    };
  }

  return {
    data,
    format: sourceFormat,
    width: info.width,
    height: info.height,
    inputBytes: input.length,
    outputBytes: data.length,
    resized,
  };
}
