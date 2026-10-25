// Loads what to show on this product page: the product's videos and the shop's settings, both static JSON.
// Any failure (no videos for the product, network error, broken JSON) means the widget stays hidden.

import type { Format, ProductData, ShopConfig } from "./types";

export const FORMATS: Format[] = ["tiles", "circles", "single"];

type Source = {
  // product JSON: <base>/s/<shop>/p/<key>.json, or a direct URL for demos and debugging
  url: string;
  // shop settings from „Vzhled“; null for demos (no shop behind them)
  configUrl: string | null;
  // data-format on the script tag wins over everything
  forced?: string;
};

export type Loaded = { data: ProductData; config: ShopConfig | null };

export async function loadData({ url, configUrl, forced }: Source): Promise<Loaded | null> {
  // shop settings in parallel with the product, so they add no wait; none (never saved, or a demo) = defaults
  const config = configUrl ? fetchJson<ShopConfig>(configUrl) : null;
  const data = await fetchJson<unknown>(url);
  if (!valid(data)) return null; // product without videos: the widget doesn't show at all
  const cfg = await config;
  if (cfg?.off) return null;

  if (cfg?.format) data.format = cfg.format;
  if (typeof cfg?.title === "string") data.title = cfg.title;
  if (typeof cfg?.badge === "boolean") data.badge = cfg.badge;
  if (forced && FORMATS.includes(forced as Format)) data.format = forced as Format;
  if (!FORMATS.includes(data.format)) data.format = "tiles";

  data.collections = data.collections.filter((c) => c.clips.length > 0);
  // video paths are relative to the JSON, not to the shop page (it may have its own <base>)
  const abs = (u: string) => new URL(u, new URL(url, location.href)).href;
  for (const c of data.collections) for (const v of c.clips) [v.src, v.poster, v.preview] = [abs(v.src), abs(v.poster), v.preview && abs(v.preview)];
  return { data, config: cfg };
}

function valid(d: unknown): d is ProductData {
  const x = d as ProductData;
  return !!x && Array.isArray(x.collections) && x.collections.some((c) => c?.clips?.length > 0);
}

// no cookies: the CDN never learns who the visitor is
async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { credentials: "omit" });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}
