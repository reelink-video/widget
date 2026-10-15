import * as esbuild from "esbuild";
import { createServer } from "node:http";
import { createReadStream, readFileSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";

const serve = process.argv.includes("--serve");
const opts = {
  entryPoints: ["src/index.ts"],
  bundle: true,
  format: "iife",
  target: "es2019",
  minify: !serve,
  sourcemap: serve ? "inline" : false,
  outfile: serve ? "dev/widget.js" : "dist/widget.js",
  legalComments: "none",
};

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp4": "video/mp4",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

// static server for dev/: esbuild serve doesn't support Range, without it the browser won't play videos
function staticServer(root, port) {
  createServer((req, res) => {
    // shop copies always via 127.0.0.1: some shops' scripts switch on "localhost"
    // into dev mode and load CSS from their developer's machine (brainmarket.cz)
    if (/^localhost(:|$)/.test(req.headers.host ?? "") && /^\/($|\?|index\.html|_real\/|test\.html|mobile\.html)/.test(req.url)) {
      res.writeHead(302, { Location: `http://127.0.0.1:${port}${req.url}` }).end();
      return;
    }
    const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
    let file = join(root, path);
    let st;
    try {
      st = statSync(file);
      if (st.isDirectory()) st = statSync((file = join(file, "index.html")));
    } catch {
      if (!proxyToShop(req, res, root)) res.writeHead(404).end("not found");
      return;
    }
    const headers = {
      "Content-Type": TYPES[extname(file)] ?? "application/octet-stream",
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store",
      // shop copies are also opened via 127.0.0.1 (some scripts switch to dev mode on "localhost")
      "Access-Control-Allow-Origin": "*",
    };
    const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? "");
    if (m) {
      const start = m[1] ? Number(m[1]) : st.size - Number(m[2]);
      const end = m[1] && m[2] ? Math.min(Number(m[2]), st.size - 1) : st.size - 1;
      res.writeHead(206, { ...headers, "Content-Range": `bytes ${start}-${end}/${st.size}`, "Content-Length": end - start + 1 });
      createReadStream(file, { start, end }).pipe(res);
    } else {
      res.writeHead(200, { ...headers, "Content-Length": st.size });
      createReadStream(file).pipe(res);
    }
  }).listen(port, () => console.log(`http://localhost:${port}/`));
}

// Some shops' scripts build paths from location.host (brainmarket.cz: /projects/.../detail.min.css),
// <base> doesn't help with those. Whatever isn't in dev/ and came from a /_real/<domain>/ page, we fetch from the origin,
// just like the demo proxy will.
function proxyToShop(req, res, root) {
  const ref = req.headers.referer ? new URL(req.headers.referer) : null;
  const domain = ref && /^\/_real\/([^/]+)\//.exec(ref.pathname)?.[1];
  if (!domain) return false;
  let origin;
  try {
    origin = new URL(JSON.parse(readFileSync(join(root, "_real", domain, "meta.json"), "utf8")).url).origin;
  } catch {
    return false;
  }
  fetch(origin + req.url, { headers: { "User-Agent": req.headers["user-agent"] ?? "" }, redirect: "follow" })
    .then(async (r) => {
      const type = r.headers.get("content-type") ?? "application/octet-stream";
      res.writeHead(r.status, { "Content-Type": type, "Cache-Control": "no-store" });
      res.end(Buffer.from(await r.arrayBuffer()));
    })
    .catch(() => res.writeHead(502).end("bad gateway"));
  return true;
}

if (serve) {
  const ctx = await esbuild.context(opts);
  await ctx.watch();
  staticServer("dev", 4400);
} else {
  const r = await esbuild.build({ ...opts, metafile: true });
  const bytes = Object.values(r.metafile.outputs)[0].bytes;
  console.log(`dist/widget.js ${(bytes / 1024).toFixed(1)} kB`);
}
