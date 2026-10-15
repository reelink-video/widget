import type { Clip, Collection, Theme } from "./types";

export const videaWord = (n: number) => (n === 1 ? "video" : n > 1 && n < 5 ? "videa" : "videí");

export const fmtTime = (sec: number) => Math.floor(sec / 60) + ":" + String(Math.round(sec % 60)).padStart(2, "0");

export const isSingle = (c: Collection) => c.clips.length === 1;

// tile title: collection name for a collection, video title for a standalone video (else the collection's)
export const clipTitle = (c: Collection, v: Clip = c.clips[0]) => (isSingle(c) ? v.label || c.title : c.title);

export const objPos = (v: Clip) => `${v.pos ?? "50%"} 50%`;

// product key = FNV-1a hash of the canonical URL path; the backend computes it the same way from the feed URL
export function pathOf(url: string) {
  let p: string;
  try {
    p = new URL(url, location.href).pathname;
  } catch {
    p = url;
  }
  try {
    p = decodeURIComponent(p);
  } catch {
    // leave it encoded
  }
  p = p.toLowerCase().replace(/\/+$/, "");
  return p || "/";
}

export function fnv1a(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function productKey() {
  const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href;
  return fnv1a(pathOf(canonical || location.href));
}

// first opaque background going up from the element
function backgroundOf(el: Element | null): string {
  for (let e = el; e; e = e.parentElement) {
    const bg = getComputedStyle(e).backgroundColor;
    if (bg && bg !== "transparent" && !/rgba\(.*,\s*0\)$/.test(bg)) return bg;
  }
  return "#ffffff";
}

// the widget adopts the shop's font and colors, accent from its add-to-cart button
export function readTheme(near: Element, cta: HTMLElement | null): Theme {
  const base = getComputedStyle(near.parentElement ?? near);
  const head = document.querySelector("h1");
  const btn = cta ? getComputedStyle(cta) : null;
  const ink = base.color || "#1a1a1a";
  const btnBg = btn ? backgroundOf(cta) : "";
  return {
    font: base.fontFamily || "system-ui, sans-serif",
    headFont: head ? getComputedStyle(head).fontFamily : base.fontFamily,
    ink,
    muted: `color-mix(in srgb, ${ink} 62%, transparent)`,
    line: `color-mix(in srgb, ${ink} 14%, transparent)`,
    bg: backgroundOf(near),
    accent: btnBg || ink,
    onAccent: btn?.color || "#ffffff",
    radius: btn?.borderRadius && btn.borderRadius !== "0px" ? btn.borderRadius : "10px",
  };
}

export function applyTheme(host: HTMLElement, t: Theme) {
  const s = host.style;
  s.setProperty("--rl-font", t.font);
  s.setProperty("--rl-head-font", t.headFont);
  s.setProperty("--rl-ink", t.ink);
  s.setProperty("--rl-muted", t.muted);
  s.setProperty("--rl-line", t.line);
  s.setProperty("--rl-bg", t.bg);
  s.setProperty("--rl-accent", t.accent);
  s.setProperty("--rl-on-accent", t.onAccent);
  s.setProperty("--rl-radius", t.radius);
}

// Shop templates and add-ons like to rearrange the cart block into a row (side by side).
// The widget needs full width, so we go up from the anchor while the element has a sibling beside it.
// By actual position, not CSS: bootstrap's .row is flex, but its columns are often stacked.
const visibleRect = (e: Element) => {
  const r = e.getBoundingClientRect();
  return r.width && r.height ? r : null;
};

export function sideBySide(a: DOMRect, b: DOMRect) {
  const sameLine = a.top < b.bottom - 2 && b.top < a.bottom - 2;
  const apart = a.right <= b.left + 2 || b.right <= a.left + 2;
  return sameLine && apart;
}

function hasNeighbourInRow(el: Element) {
  const me = visibleRect(el);
  if (!me || !el.parentElement) return false;
  for (const s of Array.from(el.parentElement.children)) {
    if (s === el || s.matches("[data-reelink-widget]")) continue;
    const r = visibleRect(s);
    if (r && sideBySide(me, r)) return true;
  }
  return false;
}

// does the element lay out its children side by side (e.g. quantity and add-to-cart button)?
export function hasRowLayout(el: Element) {
  const kids = Array.from(el.children).filter((c) => !c.matches("[data-reelink-widget]"));
  return kids.some((c) => hasNeighbourInRow(c));
}

export function blockAnchor(el: Element): Element {
  let cur = el;
  while (cur.parentElement && cur.parentElement !== document.body && hasNeighbourInRow(cur)) cur = cur.parentElement;
  return cur;
}

// Does the element end with a line (its own or its last descendant's border-bottom, or an <hr>)?
// Then the widget doesn't draw its top line, otherwise there would be two stacked.
// Only something spanning almost the full widget width counts as a line; a button or input border doesn't.
export function endsWithLine(el: Element | null, width: number) {
  const lastChild = (e: Element) => {
    let c = e.lastElementChild;
    while (c?.matches("[data-reelink-widget]")) c = c.previousElementSibling;
    return c;
  };
  for (let e = el, depth = 0; e && depth < 5; e = lastChild(e), depth++) {
    if (/^(BUTTON|INPUT|SELECT|TEXTAREA|LABEL|A|IMG|SVG)$/i.test(e.tagName)) return false;
    if (e.getBoundingClientRect().width < width * 0.8) return false;
    if (e.tagName === "HR") return true;
    const s = getComputedStyle(e);
    const visible = s.borderBottomStyle !== "none" && parseFloat(s.borderBottomWidth) > 0 && !/^(transparent|rgba\(.*,\s*0\))$/.test(s.borderBottomColor);
    if (visible) return true;
  }
  return false;
}
