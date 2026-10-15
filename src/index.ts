// Reelink widget: videa na kartě produktu.
// <script async src="https://<cdn>/widget.js" data-shop="ID_OBCHODU"></script>
//
// Atributy skriptu:
//   data-shop    ID obchodu (povinné)
//   data-base    odkud brát data, výchozí je adresa, ze které se načetl skript
//   data-src     přímá adresa JSONu s videi (ukázka přes proxy, ladění)
//   data-format  přebije formát z adminu: tiles | circles | single
//   data-events  adresa pro události analytiky (zatím žádná)

import type { Format, PlatformAdapter, ProductData } from "./types";
import { shoptet } from "./adapters/shoptet";
import { generic } from "./adapters/generic";
import { widgetCss } from "./styles";
import { h } from "./dom";
import { applyTheme, endsWithLine, hasRowLayout, productKey, readTheme } from "./util";
import { renderWidget, type WidgetView } from "./widget";
import { openPlayer } from "./player";
import { setEventContext, track } from "./events";

const ADAPTERS: PlatformAdapter[] = [shoptet, generic];
const FORMATS: Format[] = ["tiles", "circles", "single"];

type Info = { product: ReturnType<PlatformAdapter["getProduct"]>; spot: string; after: string; line: boolean };
type Api = { setFormat(f: Format): void; adapter: string; key: string; info(): Info };
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
  setEventContext({ endpoint: script.dataset.events ?? null, shop, product: key });

  const url = script.dataset.src ?? `${base}/s/${encodeURIComponent(shop)}/p/${key}.json`;
  const res = await fetch(url, { credentials: "omit" });
  if (!res.ok) return; // produkt bez videí: widget se vůbec neukáže
  const data: unknown = await res.json();
  if (!valid(data)) return;
  data.collections = data.collections.filter((c) => c.clips.length > 0);
  // cesty k videím jsou relativní k JSONu, ne ke stránce obchodu (ta může mít vlastní <base>)
  const abs = (u: string) => new URL(u, new URL(url, location.href)).href;
  for (const c of data.collections) for (const v of c.clips) [v.src, v.poster] = [abs(v.src), abs(v.poster)];
  const forced = script.dataset.format as Format | undefined;
  if (forced && FORMATS.includes(forced)) data.format = forced;
  if (!FORMATS.includes(data.format)) data.format = "tiles";

  const anchor = adapter.findAnchor();
  const product = adapter.getProduct();
  if (!anchor || !product) {
    // šablona obchodu se změnila: v adminu to ukážeme jako poruchu instalace
    track("anchor_missing", { adapter: adapter.name });
    return;
  }

  const host = h("div", { class: "reelink", "data-reelink-widget": "" });
  place(host, adapter);
  applyTheme(host, readTheme(host, adapter.findCta()));
  const shadow = host.attachShadow({ mode: "open" });
  shadow.append(h("style", {}, widgetCss));

  let view: WidgetView;
  view = renderWidget(shadow, data, (start) => {
    view.pause(true);
    openPlayer({
      data,
      product: adapter.getProduct() ?? product, // cena se mohla změnit výběrem varianty
      start,
      themeFrom: host,
      onCta: () => {
        const p = adapter.getProduct() ?? product;
        adapter.addToCart();
        // u variant zákazník teprve vybírá velikost, do košíku jsme nic nepřidali
        if (!p.needsVariant) track("add_to_cart", { adapter: adapter.name });
      },
      onClose: () => view.pause(false),
    });
  });

  // teprve teď má widget výšku: adaptér rozhodne, jestli zůstane ve sloupci, nebo půjde přes celou šířku
  place(host, adapter);
  // přesunutý prvek prohlížeč zastaví i s videi v náhledech, rozjedeme je znovu
  settle(host, adapter, () => {
    view.pause(true);
    view.pause(false);
  });

  window.reelink = {
    adapter: adapter.name,
    key,
    setFormat: (f) => FORMATS.includes(f) && view.setFormat(f),
    // pro ladění a testovací přehled: co widget o stránce zjistil a kam se postavil
    info: () => ({
      product: adapter.getProduct(),
      spot: host.hasAttribute("data-wide") ? "wide" : "column",
      after: String(host.previousElementSibling?.className ?? "").split(" ")[0],
      line: !host.hasAttribute("data-noline"),
    }),
  };
}

// vloží widget ke kotvě; vrátí false, když kotva na stránce není
function place(host: HTMLElement, adapter: PlatformAdapter) {
  const anchor = adapter.findAnchor(host);
  if (!anchor) return false;
  if (host.hasAttribute("data-wide") !== !!anchor.wide) host.toggleAttribute("data-wide", !!anchor.wide);
  const at = anchor.el;
  const pos = gridSafe(at, anchor.where);
  if (!isAt(host, pos)) put(host, pos);
  // šablony skládají sloupec přes flex a CSS order: bez stejného order by widget vyskočil nahoru
  const order = pos.mode === "after" || pos.mode === "before" ? getComputedStyle(at).order : "";
  if (host.style.order !== order) host.style.order = order;
  const lined = endsWithLine(anchor.where === "after" ? at : at.previousElementSibling, host.getBoundingClientRect().width);
  if (host.hasAttribute("data-noline") !== lined) host.toggleAttribute("data-noline", lined);
  return true;
}

type Pos = { el: Element; mode: "after" | "before" | "append" | "prepend" };

// Sloupec složený jako grid (oblasti, nebo položky s pevným řádkem): nový prvek by prohlížeč posadil
// do první volné buňky (vyprodejpovleceni.cz). Pak jdeme dovnitř buňky:
// na konec kotvy, a když kotva skládá obsah do řádku, na začátek následujícího bloku.
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

// Skripty šablony a doplňků často přeskládají blok s košíkem až po načtení stránky a galerie
// dostane výšku až s fotkami. Prvních 10 s proto hlídáme DOM i velikost stránky a widget přesuneme,
// kam patří; změnu šířky okna (otočení telefonu) hlídáme pořád.
function settle(host: HTMLElement, adapter: PlatformAdapter, onMove: () => void) {
  let timer = 0;
  // ne requestAnimationFrame: ve vkladce na pozadí (produkt otevřený do nové karty) neběží
  const schedule = (delay = 30) => {
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      const before = host.parentElement;
      const prev = host.previousElementSibling;
      place(host, adapter);
      if (host.parentElement !== before || host.previousElementSibling !== prev) onMove();
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
    schedule(150);
  });
}

function start() {
  boot().catch(() => {
    // cokoli se pokazí, stránka obchodu musí fungovat dál
  });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();
