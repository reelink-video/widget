import type { Collection, Format, ProductData } from "./types";
import { h, icon, prefersReducedMotion } from "./dom";
import { clipTitle, fmtTime, isSingle, objPos, videaWord } from "./util";
import { track } from "./events";

// duration: for a standalone video we show it instead of "1 video"
// (from the data; the tile only plays the short preview, so its metadata doesn't know the length)
function durationSlot(c: Collection) {
  const el = h("small");
  const known = c.clips.reduce((s, v) => s + (v.duration ?? NaN), 0);
  if (Number.isFinite(known)) el.textContent = isSingle(c) ? fmtTime(known) : `${c.clips.length} ${videaWord(c.clips.length)} · ${fmtTime(known)}`;
  else if (!isSingle(c)) el.textContent = `${c.clips.length} ${videaWord(c.clips.length)}`;
  return el;
}

// tiles loop the short preview, never the full clip: that one loads only in the player
function preview(c: Collection) {
  const v = c.clips[0];
  return h("video", { muted: true, playsInline: true, loop: true, preload: "none", poster: v.poster, src: v.preview, style: `object-position:${objPos(v)}` });
}

function tile(c: Collection, open: () => void) {
  const video = preview(c);
  const k = c.clips.length;
  const name = clipTitle(c);
  const label = isSingle(c) ? `Přehrát video: ${name}` : `Přehrát: ${c.title}, ${k} ${videaWord(k)}`;
  return h(
    "button",
    { class: "rl-tile", type: "button", "aria-label": label, onclick: open },
    video,
    k > 1 && h("span", { class: "segs", "aria-hidden": "true" }, ...c.clips.map(() => h("i"))),
    h("span", { class: "lbl" }, name, durationSlot(c)),
  );
}

// ring split into as many segments as the collection has videos; a standalone video has a full one
function ringSegments(n: number) {
  if (n < 2) return "var(--rl-ink)";
  const step = 360 / n;
  const gap = 7;
  const parts = Array.from({ length: n }, (_, k) => {
    const a = k * step;
    return `var(--rl-ink) ${a + gap / 2}deg ${a + step - gap / 2}deg, transparent ${a + step - gap / 2}deg ${a + step + gap / 2}deg`;
  });
  return `conic-gradient(transparent 0deg ${gap / 2}deg, ${parts.join(", ")})`;
}

function circle(c: Collection, open: () => void) {
  const v = c.clips[0];
  const k = c.clips.length;
  const name = clipTitle(c);
  return h(
    "button",
    { class: "rl-circle", type: "button", "aria-label": isSingle(c) ? `Přehrát video: ${name}` : `Přehrát: ${c.title}, ${k} ${videaWord(k)}`, onclick: open },
    h("span", { class: "ring", style: `background:${ringSegments(k)}` }, h("img", { src: v.poster, alt: "", loading: "lazy", style: `object-position:${objPos(v)}` })),
    name,
  );
}

function feature(cols: Collection[], open: (i: number) => void) {
  const c = cols[0];
  const video = preview(c);
  const rest = cols.slice(1);
  const meta = durationSlot(c);
  meta.className = "rl-feature-meta";
  return h(
    "button",
    { class: "rl-feature", type: "button", "aria-label": `Přehrát: ${clipTitle(c)}`, onclick: () => open(0) },
    h("span", { class: "rl-feature-thumb" }, video, h("span", { class: "play", "aria-hidden": "true" })),
    h(
      "span",
      { class: "rl-feature-text" },
      meta,
      h("span", { class: "rl-feature-title" }, clipTitle(c)),
      rest.length > 0 &&
        h(
          "span",
          { class: "rl-feature-more" },
          h("span", { class: "stack", "aria-hidden": "true" }, ...rest.slice(0, 3).map((x) => h("img", { src: x.clips[0].poster, alt: "", loading: "lazy", style: `object-position:${objPos(x.clips[0])}` }))),
          `Dále: ${rest.map((x) => clipTitle(x)).join(", ")}`,
        ),
    ),
    icon("M9 5l7 7-7 7", "rl-feature-go"),
  );
}

// previews autoplay when visible (and the visitor doesn't prefer reduced motion)
function autoplay(root: ParentNode) {
  const vids = Array.from(root.querySelectorAll<HTMLVideoElement>("video[src]"));
  if (prefersReducedMotion() || !("IntersectionObserver" in window)) return () => {};
  const io = new IntersectionObserver(
    (es) =>
      es.forEach((e) => {
        const v = e.target as HTMLVideoElement;
        if (e.isIntersecting) {
          v.preload = "auto";
          v.play().catch(() => {});
        } else v.pause();
      }),
    { threshold: 0.4 },
  );
  vids.forEach((v) => io.observe(v));
  return () => {
    io.disconnect();
    vids.forEach((v) => v.pause());
  };
}

export type WidgetView = {
  setFormat(f: Format): void;
  pause(on: boolean): void;
};

export function renderWidget(shadow: ShadowRoot, data: ProductData, onOpen: (collection: number) => void): WidgetView {
  const root = h("div", { class: "rl" });
  shadow.append(root);
  const cols = data.collections;
  const n = cols.reduce((s, c) => s + c.clips.length, 0);
  let format = data.format;
  let stop = () => {};

  const open = (i: number) => {
    track("open", { collection: cols[i].id, video: cols[i].clips[0].id });
    onOpen(i);
  };

  function draw() {
    stop();
    root.replaceChildren();
    const title = data.title ?? "Podívejte se naživo";
    if (format !== "single" && title) {
      root.append(h("div", { class: "rl-head" }, h("h2", { class: "rl-title" }, title), h("span", { class: "rl-count" }, `· ${n} ${videaWord(n)}`)));
    }
    if (format === "tiles") root.append(h("div", { class: "rl-row" }, ...cols.map((c, i) => tile(c, () => open(i)))));
    else if (format === "circles") root.append(h("div", { class: "rl-circles" }, ...cols.map((c, i) => circle(c, () => open(i)))));
    else root.append(feature(cols, open));
    stop = autoplay(root);
  }

  draw();

  // widget impression (once, when at least half visible)
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          track("impression", { format });
          io.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    io.observe(root);
  }

  return {
    setFormat(f) {
      if (f === format) return;
      format = f;
      draw();
    },
    pause(on) {
      if (on) stop();
      else stop = autoplay(root);
    },
  };
}
