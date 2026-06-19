# Screenshots & images in issues / PRs

GitHub has **no public API** for attaching images to issues or pull requests. The drag-and-drop
upload in the web UI hits a private, cookie-authenticated endpoint that personal access tokens and
the GitHub MCP server cannot use, and base64 data URIs are stripped by GitHub's markdown renderer.

So when an image needs to appear in an issue or PR from automation (or just reproducibly), we
**commit it to the repository** and hotlink it. This doc describes the convention and the helper
that maintains it.

## Layout

Images live under `docs/assets/`, one folder per pull request:

```text
docs/assets/
  index.html                                  # gallery of every PR folder, newest first
  2026-06-19-pr-0042-royal-road-redeploy/
    index.html                                # renders this PR's images, links to PR + issue
    meta.json                                 # pr / issue / title / date / repo / images
    before.png
    after.png
```

- Folder names are `<YYYY-MM-DD>-pr-<NNNN>[-slug]`. The ISO date prefix makes folders sort
  chronologically; the zero-padded PR number tags the folder to its pull request.
- Each folder carries an `index.html` (a self-contained page rendering its images with links to the
  pull request and the issue) and a `meta.json` describing it.
- The root `docs/assets/index.html` is a gallery linking into every PR folder, newest first.

These are review/documentation artifacts, so unlike source code (which must never reference issue
numbers) they are deliberately tagged with their PR and issue.

## Adding images

```bash
yarn screenshots --pr 42 --issue 17 --title "Royal Road redeploy" before.png after.png
```

Flags:

- `--pr <number>` — required; the pull request the images belong to.
- `--issue <number>` — optional; linked from the generated pages.
- `--title "<text>"` — optional; used for the folder slug and page heading.
- `--date <YYYY-MM-DD>` — optional; defaults to today.
- `--repo <owner/name>` — optional; inferred from the `origin` remote otherwise.

The command optimizes each image, writes it into the PR folder, and regenerates both the folder's
`index.html` / `meta.json` and the root gallery. Re-running for the same PR merges new images into
the existing folder.

## Optimization

Each image is processed with [`sharp`](https://sharp.pixelplumbing.com/):

- **Lossless, same format** — PNG/JPEG/WebP/GIF are re-encoded at maximum compression with metadata
  stripped. Pixels are unchanged.
- **Downscaled to 800px wide** — anything wider is resized down (smaller images are left alone).
- A re-encoded image is never written larger than the original unless it had to be downscaled.

## Referencing an image

Link the committed file with a raw URL on the branch you pushed:

```markdown
![Royal Road redeploy](https://raw.githubusercontent.com/oreoshake-s-team/BrowCivVI/<branch>/docs/assets/2026-06-19-pr-0042-royal-road-redeploy/after.png)
```

After the PR merges, the same image is reachable on the default branch, so the link keeps working.
