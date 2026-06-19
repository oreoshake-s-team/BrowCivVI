import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { optimizeImage } from "./optimize.ts";

const NO_BUDGET = Number.MAX_SAFE_INTEGER;

async function makePng(width: number, height: number, noisy: boolean): Promise<Buffer> {
  const channels = 3;
  const raw = Buffer.alloc(width * height * channels);
  if (noisy) {
    for (let i = 0; i < raw.length; i += 1) {
      raw[i] = (i * 2654435761) % 256;
    }
  }
  return sharp(raw, { raw: { width, height, channels } }).png().toBuffer();
}

describe("optimizeImage", () => {
  it("downscales images wider than the cap to the max width", async () => {
    const result = await optimizeImage(await makePng(1000, 400, true), {
      maxWidth: 800,
      maxBytes: NO_BUDGET,
    });
    expect(result.width).toBe(800);
  });

  it("keeps images at or under the cap at their original width", async () => {
    const result = await optimizeImage(await makePng(400, 200, true), {
      maxWidth: 800,
      maxBytes: NO_BUDGET,
    });
    expect(result.width).toBe(400);
  });

  it("leaves an already-small image in its source format", async () => {
    const result = await optimizeImage(await makePng(120, 120, false));
    expect(result.format).toBe("png");
  });

  it("never returns more bytes than the input for an already-small image", async () => {
    const input = await makePng(120, 120, false);
    const result = await optimizeImage(input);
    expect(result.outputBytes).toBeLessThanOrEqual(input.length);
  });

  it("compresses an over-budget image to within the byte budget", async () => {
    const result = await optimizeImage(await makePng(1000, 400, true), { maxBytes: 40_000 });
    expect(result.outputBytes).toBeLessThanOrEqual(40_000);
  });

  it("re-encodes to webp when the budget forces lossy compression", async () => {
    const result = await optimizeImage(await makePng(1000, 400, true), { maxBytes: 40_000 });
    expect(result.format).toBe("webp");
  });

  it("downscales below the width cap when quality reduction is not enough", async () => {
    const result = await optimizeImage(await makePng(1000, 400, true), { maxBytes: 20_000 });
    expect(result.width).toBeLessThan(800);
  });

  it("flags an image that cannot reach the budget even at the floor width", async () => {
    const result = await optimizeImage(await makePng(1000, 400, true), { maxBytes: 5_000 });
    expect(result.overBudget).toBe(true);
  });

  it("rejects input that is not a valid image", async () => {
    await expect(optimizeImage(Buffer.from("definitely not an image"))).rejects.toThrow();
  });
});
