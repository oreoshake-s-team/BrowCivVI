import { slugify } from "./gallery.ts";

export const DEFAULT_SCREENSHOT_DIR = ".screenshots";

export function screenshotFileName(name: string): string {
  return `${slugify(name) || "screenshot"}.png`;
}
