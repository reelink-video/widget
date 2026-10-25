// The widget has no colors of its own: it borrows the shop's font, text color and the look of its
// add-to-cart button, so it reads as part of the page. Values are passed into Shadow DOM as --rl-* variables.

import type { Theme } from "./types";

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
