// Reelink widget: videos on the product page.
// <script async src="https://<cdn>/widget.js" data-shop="SHOP_ID"></script>
//
// Script attributes:
//   data-shop    shop ID (required)
//   data-base    where to fetch data from, defaults to the URL the script was loaded from
//   data-src     direct URL of the videos JSON (proxy demo, debugging)
//   data-format  overrides the format from admin: tiles | circles | single
//   data-events  URL for analytics events, defaults to the Reelink API (none with data-src: demos and debugging)

import type { Format, Placement, PlatformAdapter } from "./types";
import { shoptet } from "./adapters/shoptet";
import { generic } from "./adapters/generic";
import { widgetCss } from "./widget/styles";
import { renderWidget, type WidgetView } from "./widget/render";
import { openPlayer } from "./player/player";
import { h } from "./dom";
import { productKey } from "./product-key";
import { applyTheme, readTheme } from "./theme";
import { FORMATS, loadData } from "./data";
import { Spots, place, settle } from "./placement";
import { setEventContext, track } from "./events";

// first adapter that recognises the page wins; generic only works where the shop put <div data-reelink>
const ADAPTERS: PlatformAdapter[] = [shoptet, generic];
const EVENTS = "https://api.reelink.cz/api/e";

// what the page sees as window.reelink: the admin preview drives the widget through it
type Info = { product: ReturnType<PlatformAdapter["getProduct"]>; spot: string; after: string; line: boolean };
type Api = {
  setFormat(f: Format): void;
  setTitle(t: string | undefined): void;
  // admin preview: try a placement without saving; true = the widget sits where the rule says
  setPlacement(p: Placement | null): boolean;
  adapter: string;
  key: string;
  info(): Info;
};
declare global {
  interface Window {
    reelink?: Api | { loaded: true };
  }
}

const script = (document.currentScript as HTMLScriptElement | null) ?? document.querySelector<HTMLScriptElement>("script[data-shop][src*='widget']");

async function boot() {
  if (!script || window.reelink) return;
  window.reelink = { loaded: true };
  const shop = script.dataset.shop ?? "";
  const base = (script.dataset.base ?? new URL(script.src, location.href).origin).replace(/\/$/, "");

  const adapter = ADAPTERS.find((a) => a.detect() && a.isProductPage());
  if (!adapter) return;
  const key = productKey();
  setEventContext({ endpoint: script.dataset.events ?? (script.dataset.src ? null : EVENTS), shop, product: key });

  const shopPath = `${base}/s/${encodeURIComponent(shop)}`;
  const loaded = await loadData({
    url: script.dataset.src ?? `${shopPath}/p/${key}.json`,
    configUrl: script.dataset.src ? null : `${shopPath}/config.json`,
    forced: script.dataset.format,
  });
  if (!loaded) return;
  const { data, config } = loaded;

  const spot = new Spots(adapter, config?.placement ?? null);
  const anchor = spot.findAnchor();
  const product = adapter.getProduct();
  if (!anchor || !product) {
    // the shop template changed: admin shows it as a broken installation
    track("anchor_missing", { adapter: adapter.name });
    return;
  }

  // inline, because shop CSS beats :host (some templates float every div in the product info)
  const host = h("div", { class: "reelink", "data-reelink-widget": "", style: "float:none;clear:both" });
  place(host, spot);
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
  place(host, spot);
  const restart = () => {
    view.pause(true);
    view.pause(false);
  };
  // the browser stops a moved element along with its preview videos, restart them
  settle(host, spot, restart);

  window.reelink = {
    adapter: adapter.name,
    key,
    setFormat: (f) => FORMATS.includes(f) && view.setFormat(f),
    setTitle: (t) => view.setTitle(t),
    setPlacement: (p) => {
      spot.placement = p;
      const before = host.previousElementSibling;
      place(host, spot);
      if (host.previousElementSibling !== before) restart();
      return spot.ruled(host) !== null;
    },
    // for debugging and the test overview: what the widget learned about the page and where it placed itself
    info: () => ({
      product: adapter.getProduct(),
      spot: host.hasAttribute("data-wide") ? "wide" : "column",
      after: String(host.previousElementSibling?.className ?? "").split(" ")[0],
      line: !host.hasAttribute("data-noline"),
    }),
  };
}

function start() {
  boot().catch(() => {
    // whatever breaks, the shop page must keep working
  });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();
