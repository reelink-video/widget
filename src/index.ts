// Reelink widget: videos on the product page.
// <script async src="https://<cdn>/widget.js" data-shop="SHOP_ID"></script>
//
// Script attributes:
//   data-shop    shop ID (required)
//   data-base    where to fetch data from, defaults to the URL the script was loaded from
//   data-src     direct URL of the videos JSON (proxy demo, debugging)
//   data-format  overrides the format from admin: tiles | circles | single
//   data-events  URL for analytics events, defaults to the Reelink API (none with data-src: demos and debugging)

import type { Format, PlatformAdapter, ProductData, ShopConfig } from "./types";
import { shoptet } from "./adapters/shoptet";
import { generic } from "./adapters/generic";
import { widgetCss } from "./styles";
import { h } from "./dom";
import { applyTheme, endsWithLine, hasRowLayout, productKey, readTheme } from "./util";
import { renderWidget, type WidgetView } from "./widget";
import { openPlayer } from "./player";
import { setEventContext, track } from "./events";

const ADAPTERS: PlatformAdapter[] = [shoptet, generic];
const EVENTS = "https://api.reelink.cz/api/e";
const FORMATS: Format[] = ["tiles", "circles", "single"];

type Info = { product: ReturnType<PlatformAdapter["getProduct"]>; spot: string; after: string; line: boolean };
type Api = { setFormat(f: Format): void; setTitle(t: string | undefined): void; adapter: string; key: string; info(): Info };
declare global {
  interface Window {
    reelink?: Api | { loaded: true };
  }
}

const script = (document.currentScript as HTMLScriptElement | null) ?? document.querySelector<HTMLScriptElement>("script[data-shop][src*='widget']");

function valid(d: unknown): d is ProductData {
  const x = d as ProductData;
  return !!x && Array.isArray(x.collections) && x.collections.some((c) => c?.clips?.length > 0);
}

async function boot() {
  if (!script || window.reelink) return;
  window.reelink = { loaded: true };
  const shop = script.dataset.shop ?? "";
  const base = (script.dataset.base ?? new URL(script.src, location.href).origin).replace(/\/$/, "");

  const adapter = ADAPTERS.find((a) => a.detect() && a.isProductPage());
  if (!adapter) return;
  const key = productKey();
  setEventContext({ endpoint: script.dataset.events ?? (script.dataset.src ? null : EVENTS), shop, product: key });

  const url = script.dataset.src ?? `${base}/s/${encodeURIComponent(shop)}/p/${key}.json`;
  // shop settings in parallel with the product, so they add no wait; none (never saved, or a demo) = defaults
  const config = script.dataset.src ? null : fetchJson<ShopConfig>(`${base}/s/${encodeURIComponent(shop)}/config.json`);
  const data = await fetchJson<unknown>(url);
  if (!valid(data)) return; // product without videos: the widget doesn't show at all
  const cfg = await config;
  if (cfg?.format) data.format = cfg.format;
  if (typeof cfg?.title === "string") data.title = cfg.title;
  if (typeof cfg?.badge === "boolean") data.badge = cfg.badge;
  data.collections = data.collections.filter((c) => c.clips.length > 0);
  // video paths are relative to the JSON, not to the shop page (it may have its own <base>)
  const abs = (u: string) => new URL(u, new URL(url, location.href)).href;
  for (const c of data.collections) for (const v of c.clips) [v.src, v.poster, v.preview] = [abs(v.src), abs(v.poster), v.preview && abs(v.preview)];
  const forced = script.dataset.format as Format | undefined;
  if (forced && FORMATS.includes(forced)) data.format = forced;
  if (!FORMATS.includes(data.format)) data.format = "tiles";

  const anchor = adapter.findAnchor();
  const product = adapter.getProduct();
  if (!anchor || !product) {
    // the shop template changed: admin shows it as a broken installation
    track("anchor_missing", { adapter: adapter.name });
    return;
  }

  // inline, because shop CSS beats :host (goldbee.cz floats every div in .p-detail-info)
  const host = h("div", { class: "reelink", "data-reelink-widget": "", style: "float:none;clear:both" });
  place(host, adapter);
  applyTheme(host, readTheme(host, adapter.findCta()));
  const shadow = host.attachShadow({ mode: "open" });
  shadow.append(h("style", {}, widgetCss));

  let view: WidgetView;
  view = renderWidget(shadow, data, (start) => {
    view.pause(true);
    openPlayer({
      data,
      product: adapter.getProduct() ?? product, // the price may have changed by picking a variant
      start,
      themeFrom: host,
      onCta: () => {
        const p = adapter.getProduct() ?? product;
        adapter.addToCart();
        // with variants the customer is still choosing a size, we added nothing to the cart
        if (!p.needsVariant) track("add_to_cart", { adapter: adapter.name });
      },
      onClose: () => view.pause(false),
    });
  });

  // only now does the widget have a height: the adapter decides whether it stays in the column or goes full width
  place(host, adapter);
  // the browser stops a moved element along with its preview videos, restart them
  settle(host, adapter, () => {
    view.pause(true);
    view.pause(false);
  });

  window.reelink = {
    adapter: adapter.name,
    key,
    setFormat: (f) => FORMATS.includes(f) && view.setFormat(f),
    setTitle: (t) => view.setTitle(t),
    // for debugging and the test overview: what the widget learned about the page and where it placed itself
    info: () => ({
      product: adapter.getProduct(),
      spot: host.hasAttribute("data-wide") ? "wide" : "column",
      after: String(host.previousElementSibling?.className ?? "").split(" ")[0],
      line: !host.hasAttribute("data-noline"),
    }),
  };
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { credentials: "omit" });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

// inserts the widget at the anchor; returns false when the anchor isn't on the page
function place(host: HTMLElement, adapter: PlatformAdapter) {
  const anchor = adapter.findAnchor(host);
  if (!anchor) return false;
  if (host.hasAttribute("data-wide") !== !!anchor.wide) host.toggleAttribute("data-wide", !!anchor.wide);
  const at = anchor.el;
  const pos = gridSafe(at, anchor.where);
  if (!isAt(host, pos)) put(host, pos);
  // templates lay out the column with flex and CSS order: without the same order the widget would jump to the top
  const order = pos.mode === "after" || pos.mode === "before" ? getComputedStyle(at).order : "";
  if (host.style.order !== order) host.style.order = order;
  const lined = endsWithLine(anchor.where === "after" ? at : at.previousElementSibling, host.getBoundingClientRect().width);
  if (host.hasAttribute("data-noline") !== lined) host.toggleAttribute("data-noline", lined);
  return true;
}

type Pos = { el: Element; mode: "after" | "before" | "append" | "prepend" };

// Column laid out as a grid (areas, or items with a fixed row): the browser would put a new element
// into the first free cell (vyprodejpovleceni.cz). So we go inside the cell:
// to the end of the anchor, and when the anchor lays out its content in a row, to the start of the next block.
function gridSafe(at: Element, where: "before" | "after"): Pos {
  const parent = at.parentElement;
  const ps = parent && getComputedStyle(parent);
  if (!ps || !ps.display.includes("grid")) return { el: at, mode: where };
  if (where === "after" && !hasRowLayout(at)) return { el: at, mode: "append" };
  let next = where === "after" ? at.nextElementSibling : at;
  while (next?.matches("[data-reelink-widget]")) next = next.nextElementSibling;
  if (next && !hasRowLayout(next)) return { el: next, mode: "prepend" };
  return { el: at, mode: where };
}

function isAt(host: HTMLElement, { el, mode }: Pos) {
  if (mode === "after") return el.nextElementSibling === host;
  if (mode === "before") return el.previousElementSibling === host;
  if (mode === "append") return el.lastElementChild === host;
  return el.firstElementChild === host;
}

function put(host: HTMLElement, { el, mode }: Pos) {
  if (mode === "after") el.after(host);
  else if (mode === "before") el.before(host);
  else if (mode === "append") el.append(host);
  else el.prepend(host);
}

// Template and add-on scripts often rearrange the cart block only after page load, and the gallery
// gets its height only with the photos. So for the first 10 s we watch the DOM and page size and move the widget
// where it belongs; window width changes (phone rotation) we watch always.
function settle(host: HTMLElement, adapter: PlatformAdapter, onMove: () => void) {
  let timer = 0;
  // where the widget was before its last move: coming back there means the widget itself flips the layout
  // (goldbee.cz: inline buttons re-wrap around it), so it stays put until the window width changes
  let back: [Element | null, Element | null] | null = null;
  let frozen = false;
  // not requestAnimationFrame: it doesn't run in a background tab (product opened in a new tab)
  const schedule = (delay = 30) => {
    if (frozen) return;
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      const before = host.parentElement;
      const prev = host.previousElementSibling;
      place(host, adapter);
      if (host.parentElement === before && host.previousElementSibling === prev) return;
      frozen = !!back && back[0] === host.parentElement && back[1] === host.previousElementSibling;
      back = [before, prev];
      onMove();
    }, delay);
  };
  const stops: (() => void)[] = [];
  if ("MutationObserver" in window) {
    const mo = new MutationObserver(() => schedule());
    mo.observe(document.body, { childList: true, subtree: true });
    stops.push(() => mo.disconnect());
  }
  if ("ResizeObserver" in window) {
    const ro = new ResizeObserver(() => schedule(100));
    ro.observe(document.body);
    stops.push(() => ro.disconnect());
  }
  window.addEventListener("load", () => schedule(), { once: true });
  setTimeout(() => stops.forEach((f) => f()), 10000);
  let width = innerWidth;
  window.addEventListener("resize", () => {
    if (innerWidth === width) return;
    width = innerWidth;
    frozen = false;
    back = null;
    schedule(150);
  });
}

function start() {
  boot().catch(() => {
    // whatever breaks, the shop page must keep working
  });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();
