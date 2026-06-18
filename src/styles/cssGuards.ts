const HEX_COLOR = /#(?:[0-9a-fA-F]{3,4}){1,2}\b/g;
const FUNCTIONAL_COLOR = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/g;
const RAW_BORDER_RADIUS = /border-radius:\s*[^;]*\b\d*\.?\d+(?:px|rem|em)\b/g;

export function findRawColorLiterals(css: string): string[] {
  return [...css.matchAll(HEX_COLOR), ...css.matchAll(FUNCTIONAL_COLOR)].map((match) => match[0]);
}

export function findRawBorderRadii(css: string): string[] {
  return [...css.matchAll(RAW_BORDER_RADIUS)].map((match) => match[0].trim());
}
