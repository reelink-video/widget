// Where the widget goes on the page and keeping it there while the shop's own scripts are still rearranging things.

import type { Anchor, Placement, PlatformAdapter } from "./types";
import { endsWithLine, hasRowLayout } from "./layout";
import { track } from "./events";

// narrower windows use the phone rule of the placement (the admin previews phones at 390 px, desktops at 1280 px)
const PHONE_MAX = 767;

// The spot the shop picked in „Vzhled“ wins; when its element isn't on the page (another template, a different kind
// of product), the adapter finds the spot itself and the admin hears about it once through anchor_missing.
export class Spots {
  private told = false;
  constructor(
    private adapter: PlatformAdapter,
    public placement: Placement | null,
  ) {}

  ruled(host?: HTMLElement): Anchor | null {
    const phone = innerWidth <= PHONE_MAX;
    const rule = phone ? this.placement?.mobile : this.placement?.desktop;
    if (!rule) return null;
    let el: Element | null = null;
    try {
      el = document.querySelector(rule.anchor);
    } catch {
      // an invalid selector behaves like a missing element
    }
    if (el && !(host && host.contains(el)) && !el.closest("[data-reelink-widget]")) return { el, where: rule.where, wide: !phone && rule.wide }; // one column on phones: never the wide look
    if (!this.told) track("anchor_missing", { adapter: this.adapter.name, rule: 1 });
    this.told = true;
    return null;
  }

  findAnchor(host?: HTMLElement) {
    return this.ruled(host) ?? this.adapter.findAnchor(host);
  }
}

// inserts the widget at the anchor; returns false when the anchor isn't on the page
export function place(host: HTMLElement, spot: Spots) {
  const anchor = spot.findAnchor(host);
  if (!anchor) return false;
  if (host.hasAttribute("data-wide") !== !!anchor.wide) host.toggleAttribute("data-wide", !!anchor.wide);
  const at = anchor.el;
  const pos: Pos = anchor.where === "prepend" ? { el: at, mode: "prepend" } : gridSafe(at, anchor.where);
  if (!isAt(host, pos)) put(host, pos);
  // templates lay out the column with flex and CSS order: without the same order the widget would jump to the top
  const order = pos.mode === "after" || pos.mode === "before" ? getComputedStyle(at).order : "";
  if (host.style.order !== order) host.style.order = order;
  const lined = endsWithLine(anchor.where === "after" ? at : host.previousElementSibling, host.getBoundingClientRect().width);
  if (host.hasAttribute("data-noline") !== lined) host.toggleAttribute("data-noline", lined);
  return true;
}

type Pos = { el: Element; mode: "after" | "before" | "append" | "prepend" };

// Column laid out as a grid (areas, or items with a fixed row): the browser would put a new element
// into the first free cell. So we go inside the cell:
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
export function settle(host: HTMLElement, spot: Spots, onMove: () => void) {
  let timer = 0;
  // where the widget was before its last move: coming back there means the widget itself flips the layout
  // (inline buttons re-wrap around it), so it stays put until the window width changes
  let back: [Element | null, Element | null] | null = null;
  let frozen = false;
  // not requestAnimationFrame: it doesn't run in a background tab (product opened in a new tab)
  const schedule = (delay = 30) => {
    if (frozen) return;
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      const before = host.parentElement;
      const prev = host.previousElementSibling;
      place(host, spot);
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
