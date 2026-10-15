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

## Development

```sh
npm ci
npm run dev     # http://localhost:4400
npm run check
npm run build   # dist/widget.js
```

Release: bump `version` in `package.json`, then `git tag v1.2.3 && git push --tags`.

## Reporting a security issue

See [SECURITY.md](SECURITY.md).
