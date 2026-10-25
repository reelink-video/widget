# Reelink widget

A widget that shows short vertical videos on e-shop product pages. It is added with a single line of code:

```html
<script async src="https://cdn.reelink.cz/widget.js" data-shop="YOUR-ID"></script>
```

The source is public so that anyone can check what runs on their site. More at
[reelink.cz/bezpecnost](https://reelink.cz/bezpecnost).

## What the widget does

- reads the product name, price, photo and selected variant from the page,
- shows videos under the price and, on click, presses the shop's own "Add to cart" button,
- sends aggregate events (impression, play, click) without any visitor ID,
- stores no cookies or anything else in the browser, and never reads forms or customer data.

It has no runtime dependencies: only the code in `src/` is shipped to the browser.

## Checks for every version

Before a version is released it has to pass (`.github/workflows/checks.yml`):

- **CodeQL** with the `security-extended` suite,
- **Semgrep** with the JavaScript and TypeScript rule sets,
- a check that `package.json` has no runtime dependencies,
- type checking.

Each released file is signed by GitHub Actions (build provenance via Sigstore). The list of versions with their
hashes is at [cdn.reelink.cz/versions.json](https://cdn.reelink.cz/versions.json).

## Verifying a file

The signature proves the file was built from this repository and has not changed since:

```sh
curl -sO https://cdn.reelink.cz/widget@1.0.0.js
gh attestation verify widget@1.0.0.js --repo reelink-video/widget
```

The hash, to compare with `versions.json` or the GitHub release:

```sh
echo "sha384-$(openssl dgst -sha384 -binary widget@1.0.0.js | openssl base64 -A)"
```

The build is reproducible, so rebuilding a tag should give the same hash:

```sh
git checkout v1.0.0 && npm ci && npm run build
```

## Pinned version with integrity

Shops that don't want automatic updates can embed a specific version with its hash. The browser refuses to run the
file if even a single byte changes:

```html
<script async src="https://cdn.reelink.cz/widget@1.0.0.js"
  integrity="sha384-…" crossorigin="anonymous" data-shop="YOUR-ID"></script>
```

The exact line with the hash is in every release.

## How it works

1. The script finds out what kind of page it is on. On Shoptet it recognises the product page itself; on any other
   site it looks for `<div data-reelink></div>` placed by the shop.
2. It loads two static JSON files from the CDN: the videos for this product (the key is a hash of the page URL) and
   the shop's settings. No videos for the product means the widget doesn't appear at all.
3. It picks a spot on the page (the one chosen in the admin, or below the add-to-cart block), renders the videos
   inside Shadow DOM and adopts the shop's font and button colors.
4. A click opens a fullscreen player. Its button presses the shop's own "Add to cart" button, or scrolls to the
   variant picker when a size or color has to be chosen first.

## Code

```
src/
  index.ts           entry point: script attributes, start-up, window.reelink for the admin preview
  data.ts            loading the product's videos and the shop's settings
  product-key.ts     product key from the page URL
  placement.ts       where the widget goes, and keeping it there while the page settles
  layout.ts          geometry helpers (what sits beside what, lines between blocks)
  theme.ts           font and colors taken from the shop
  events.ts          aggregate statistics events
  format.ts          Czech plurals, durations, titles
  dom.ts             tiny element helpers
  types.ts           data shapes and the platform adapter interface
  adapters/
    shoptet.ts       Shoptet product pages
    generic.ts       any site with <div data-reelink>
  widget/            the block on the product page and its styles
  player/            the fullscreen player and its styles
```

## Development

```sh
npm ci
npm run check   # types
npm run build   # dist/widget.js
```

## Releasing a new version

Releases are published only by CI (`.github/workflows/release.yml`). There is no manual upload, so every file on
the CDN is checked and signed.

1. Make sure `main` is green in Actions and your working tree is clean.
2. Bump the version, commit and tag in one step:

   ```sh
   npm version patch   # bug fix: 1.0.0 → 1.0.1
   npm version minor   # new feature, compatible: 1.0.1 → 1.1.0
   npm version major   # breaking change for shops: 1.1.0 → 2.0.0
   ```

3. Push the commit and the tag:

   ```sh
   git push --follow-tags
   ```

4. Watch the run: `gh run watch` (or the Actions tab). It runs the checks, builds, signs, creates the GitHub
   release and uploads to the CDN:
   - `widget@X.Y.Z.js`, immutable, for shops pinned with `integrity`,
   - `widget.js`, the auto-updating file most shops use (cached for 5 minutes),
   - `versions.json`, which feeds [reelink.cz/bezpecnost](https://reelink.cz/bezpecnost#verze).

5. Verify the published file:

   ```sh
   curl -sO https://cdn.reelink.cz/widget@X.Y.Z.js
   gh attestation verify widget@X.Y.Z.js --repo reelink-video/widget
   ```

**If the run fails** before the "Upload to CDN" step, nothing reached shops. Fix the problem on `main`, delete the tag
(`git tag -d vX.Y.Z && git push origin :refs/tags/vX.Y.Z`, plus `gh release delete vX.Y.Z` if the release was
created) and tag again. Once `widget@X.Y.Z.js` is on the CDN, that version number is used up: release the fix as the
next patch version.

Secrets used by the workflow: `CLOUDFLARE_API_TOKEN` (Workers R2 Storage: Edit) and `CLOUDFLARE_ACCOUNT_ID`.

## Reporting a security issue

See [SECURITY.md](SECURITY.md).
