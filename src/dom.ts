type Attrs = Record<string, string | number | boolean | null | undefined | EventListener>;
type Child = Node | string | null | undefined | false;

// malý pomocník místo Reactu: h("button", { class: "x", onclick: fn }, "text")
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (k === "style") el.setAttribute("style", String(v));
    else if (k in el && typeof v !== "string") (el as unknown as Record<string, unknown>)[k] = v;
    else el.setAttribute(k, v === true ? "" : String(v));
  }
  for (const c of children) if (c != null && c !== false) el.append(c);
  return el;
}

const SVG = "http://www.w3.org/2000/svg";

export function icon(d: string, cls?: string) {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  if (cls) svg.setAttribute("class", cls);
  const p = document.createElementNS(SVG, "path");
  p.setAttribute("d", d);
  svg.append(p);
  return svg;
}

export const text = (el: Element | null) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();

export const prefersReducedMotion = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
