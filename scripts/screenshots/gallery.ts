export interface PrScreenshotMeta {
  pr: number;
  date: string;
  repo: string;
  images: string[];
  issue?: number;
  title?: string;
}

export interface RootGalleryEntry {
  folder: string;
  meta: PrScreenshotMeta;
}

const SLUG_MAX_LENGTH = 48;

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/g, "");
}

export function prFolderName(input: { date: string; pr: number; title?: string }): string {
  const base = `${input.date}-pr-${String(input.pr).padStart(4, "0")}`;
  const slug = input.title ? slugify(input.title) : "";
  return slug ? `${base}-${slug}` : base;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function prUrl(repo: string, pr: number): string {
  return `https://github.com/${repo}/pull/${String(pr)}`;
}

function issueUrl(repo: string, issue: number): string {
  return `https://github.com/${repo}/issues/${String(issue)}`;
}

function headingFor(meta: PrScreenshotMeta): string {
  return meta.title ? escapeHtml(meta.title) : `PR #${String(meta.pr)}`;
}

const PAGE_STYLE = [
  "body{font-family:system-ui,sans-serif;margin:0;padding:2rem;background:#0d1117;color:#e6edf3}",
  "a{color:#58a6ff}",
  "h1{font-size:1.4rem;margin:0 0 .25rem}",
  ".meta{color:#8b949e;font-size:.9rem;margin:0 0 1.5rem}",
  ".meta a{margin-right:1rem}",
  ".grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1.25rem}",
  "figure{margin:0;background:#161b22;border:1px solid #30363d;border-radius:8px;overflow:hidden}",
  ".thumb{display:block;cursor:zoom-in}",
  "figure img{display:block;width:100%;height:auto}",
  "figcaption{padding:.5rem .75rem;font-size:.85rem;color:#8b949e;word-break:break-all}",
  ".lightbox{display:none}",
  ".lightbox:target{display:flex;position:fixed;inset:0;z-index:10;align-items:center;justify-content:center;padding:1.5rem;background:rgba(1,4,9,.92);cursor:zoom-out}",
  ".lightbox img{max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;box-shadow:0 0 0 1px #30363d}",
  ".card{display:block;text-decoration:none;color:inherit;background:#161b22;border:1px solid #30363d;border-radius:8px;overflow:hidden}",
  ".card img{display:block;width:100%;height:auto;border-bottom:1px solid #30363d}",
  ".card .body{padding:.75rem}",
  ".card .body strong{display:block;color:#e6edf3}",
  ".card .body span{color:#8b949e;font-size:.85rem}",
].join("");

function page(title: string, body: string): string {
  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    `<title>${escapeHtml(title)}</title>`,
    `<style>${PAGE_STYLE}</style>`,
    "</head>",
    "<body>",
    body,
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

function metaLinks(meta: PrScreenshotMeta): string {
  const links = [`<a href="${prUrl(meta.repo, meta.pr)}">Pull request #${String(meta.pr)}</a>`];
  if (meta.issue !== undefined) {
    links.push(`<a href="${issueUrl(meta.repo, meta.issue)}">Issue #${String(meta.issue)}</a>`);
  }
  return links.join("");
}

function lightboxId(index: number): string {
  return `shot-${String(index + 1)}`;
}

export function renderPrIndexHtml(meta: PrScreenshotMeta): string {
  const figures = meta.images
    .map((image, index) => {
      const src = `./${encodeURI(image)}`;
      const alt = escapeHtml(image);
      return `<figure><a class="thumb" href="#${lightboxId(index)}"><img src="${src}" alt="${alt}"></a><figcaption>${alt}</figcaption></figure>`;
    })
    .join("");
  const lightboxes = meta.images
    .map((image, index) => {
      const src = `./${encodeURI(image)}`;
      const alt = escapeHtml(image);
      return `<a class="lightbox" id="${lightboxId(index)}" href="#"><img src="${src}" alt="${alt}"></a>`;
    })
    .join("");
  const body = [
    `<h1>${headingFor(meta)}</h1>`,
    `<p class="meta">${escapeHtml(meta.date)}${metaLinks(meta)}</p>`,
    `<div class="grid">${figures}</div>`,
    lightboxes,
  ].join("\n");
  return page(`${headingFor(meta)} screenshots`, body);
}

export function renderRootIndexHtml(entries: RootGalleryEntry[]): string {
  const sorted = [...entries].sort((a, b) => {
    if (a.meta.date !== b.meta.date) {
      return a.meta.date < b.meta.date ? 1 : -1;
    }
    return b.meta.pr - a.meta.pr;
  });

  const cards = sorted
    .map((entry) => {
      const cover = entry.meta.images[0];
      const thumb = cover
        ? `<img src="./${encodeURI(entry.folder)}/${encodeURI(cover)}" alt="${headingFor(entry.meta)}">`
        : "";
      const issue =
        entry.meta.issue !== undefined ? ` &middot; issue #${String(entry.meta.issue)}` : "";
      return [
        `<a class="card" href="./${encodeURI(entry.folder)}/index.html">`,
        thumb,
        '<div class="body">',
        `<strong>${headingFor(entry.meta)}</strong>`,
        `<span>${escapeHtml(entry.meta.date)} &middot; PR #${String(entry.meta.pr)}${issue}</span>`,
        "</div>",
        "</a>",
      ].join("");
    })
    .join("");

  const body = [
    "<h1>Screenshot gallery</h1>",
    '<p class="meta">Images attached to pull requests, newest first.</p>',
    `<div class="grid">${cards}</div>`,
  ].join("\n");
  return page("Screenshot gallery", body);
}
