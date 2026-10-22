// Downloads a product page from public e-shops and prepares a local copy with the widget for testing:
//   node scripts/snapshot.mjs olivie.cz brainmarket.cz ...
// Copies go to dev/_real/<domain>/ (in .gitignore), overview of all at http://localhost:4400/_real/
// For adapter development only, never published.

import { mkdir, writeFile, readdir } from "node:fs/promises";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36";
const OUT = new URL("../dev/_real/", import.meta.url);
const DATA = "http://localhost:4400/s/demo/p/3d394289.json";

async function get(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "cs,en;q=0.8" }, redirect: "follow", signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return { html: await res.text(), url: res.url };
}

// first product from the homepage listing (Shoptet: <a href="..." class="image">)
function firstProduct(html, base) {
  const links = [...html.matchAll(/<a href="([^"]+)" class="image"/g)].map((m) => m[1]);
  const href = links.find((h) => !h.startsWith("#"));
  return href ? new URL(href, base).href : null;
}

function prepare(html, origin) {
  const head = `<base href="${origin}/"><script async src="http://localhost:4400/widget.js" data-shop="demo" data-src="${DATA}"></script>`;
  return html.replace(/<head([^>]*)>/i, `<head$1>${head}`);
}

async function snapshot(domain) {
  const home = await get(`https://${domain.replace(/^https?:\/\//, "")}`);
  const origin = new URL(home.url).origin;
  if (!home.html.includes("cdn.myshoptet.com")) return { domain, error: "not Shoptet" };
  const productUrl = firstProduct(home.html, home.url);
  if (!productUrl) return { domain, error: "no product on the homepage" };
  const page = await get(productUrl);
  const template = /template-(\d+)/.exec(page.html)?.[1] ?? "?";
  const dir = new URL(`${domain}/`, OUT);
  await mkdir(dir, { recursive: true });
  await writeFile(new URL("index.html", dir), prepare(page.html, origin));
  await writeFile(new URL("meta.json", dir), JSON.stringify({ domain, url: page.url, template, at: new Date().toISOString() }, null, 2));
  return { domain, template, url: page.url };
}

const domains = process.argv.slice(2);
if (!domains.length) {
  console.log("usage: node scripts/snapshot.mjs domain.cz [domain2.cz ...]");
  process.exit(1);
}
for (const d of domains) {
  try {
    const r = await snapshot(d);
    console.log(r.error ? `✗ ${d}: ${r.error}` : `✓ ${d}  template ${r.template}  ${r.url}`);
  } catch (e) {
    console.log(`✗ ${d}: ${e.message}`);
  }
}

// list for the overview page
const all = [];
for (const name of await readdir(OUT, { withFileTypes: true })) {
  if (!name.isDirectory()) continue;
  try {
    const { readFile } = await import("node:fs/promises");
    all.push(JSON.parse(await readFile(new URL(`${name.name}/meta.json`, OUT), "utf8")));
  } catch {
    // older hand-made copies without meta.json
  }
}
await writeFile(new URL("shops.json", OUT), JSON.stringify(all, null, 2));
