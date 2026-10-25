// Builds dist/widget.js, the file served from the CDN. The build is reproducible: the same commit always gives
// the same bytes, so anyone can rebuild a release and compare its SHA-384 hash.
import * as esbuild from "esbuild";
import { pathToFileURL } from "node:url";

export const options = {
  entryPoints: ["src/index.ts"],
  bundle: true,
  format: "iife",
  target: "es2019",
  minify: true,
  outfile: "dist/widget.js",
  legalComments: "none",
};

// also imported by the local dev server, which reuses these options
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const r = await esbuild.build({ ...options, metafile: true });
  const bytes = Object.values(r.metafile.outputs)[0].bytes;
  console.log(`dist/widget.js ${(bytes / 1024).toFixed(1)} kB`);
}
