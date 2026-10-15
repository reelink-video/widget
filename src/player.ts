import type { Collection, PageProduct, ProductData } from "./types";
import { h, icon } from "./dom";
import { clipTitle, fmtTime, isSingle, objPos, videaWord } from "./util";
import { playerCss } from "./styles";
import { track, type EventName } from "./events";

type Opts = {
  data: ProductData;
  product: PageProduct;
  start: number;
  themeFrom: HTMLElement;
  onCta: () => void;
  onClose: () => void;
};

const PLAY = "M8 5l11 7-11 7z";
const PAUSE = "M8 5h3v14H8zM13 5h3v14h-3z";

// Fullscreen player. Left/right arrows and taps page through videos (at the end of a collection the next one continues),
// up/down arrows and swipe switch collections. A standalone video is a single-clip collection: no bars on top.
export function openPlayer({ data, product, start, themeFrom, onCta, onClose }: Opts) {
  const cols = data.collections;
  const C = cols.length;
  let c = start;
  let i = 0;
  let raf = 0;
  const reported = new Set<string>();

  const host = h("div", { class: "reelink-player" });
  for (const p of Array.from(themeFrom.style)) if (p.startsWith("--rl-")) host.style.setProperty(p, themeFrom.style.getPropertyValue(p));
  const shadow = host.attachShadow({ mode: "open" });
  shadow.append(h("style", {}, playerCss));

  const backdrop = h("img", { class: "p-backdrop", alt: "", "aria-hidden": "true" });
  const row = h("div", { class: "p-row" });
  // <dialog> via showModal() goes to the top layer: no floating shop element (chat, badges) will be above the player
  const dialog = h("dialog", { class: "player", tabindex: -1, "aria-label": "Přehrávač videí" }, backdrop, row);
  shadow.append(dialog);
  dialog.addEventListener("cancel", (e) => {
    e.preventDefault();
    close();
  });
  dialog.addEventListener("click", (e) => (e.target === dialog || e.target === row) && close());

  // return focus to the tile inside the widget's Shadow DOM, not just to its host
  let lastFocus = document.activeElement as HTMLElement | null;
  while (lastFocus?.shadowRoot?.activeElement) lastFocus = lastFocus.shadowRoot.activeElement as HTMLElement;
  const prevOverflow = document.documentElement.style.overflow;
  document.documentElement.style.overflow = "hidden";
  document.body.append(host);

  const at = (d: number) => (c + d + C) % C;

  function step(d: number) {
    const n = cols[c].clips.length;
    if (d > 0) {
      if (i + 1 < n) i++;
      else [c, i] = [at(1), 0];
    } else if (i > 0) i--;
    else [c, i] = [at(-1), 0];
    draw();
  }
  function jump(d: number) {
    [c, i] = [at(d), 0];
    draw();
  }

  function peek(d: number) {
    const k = cols[at(d)];
    const cover = k.clips[0];
    return h(
      "button",
      { class: d < 0 ? "peek l" : "peek r", type: "button", "aria-label": `${d < 0 ? "Předchozí" : "Další"}: ${clipTitle(k)}`, onclick: () => jump(d) },
      h("img", { src: cover.poster, alt: "", style: `object-position:${objPos(cover)}` }),
      h("span", { class: "peek-lbl" }, clipTitle(k), h("small", {}, sub(k))),
      h("span", { class: "peek-arrow", "aria-hidden": "true" }, icon(d < 0 ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7")),
    );
  }

  // subtitle: video count for a collection, duration for a standalone video (when known)
  const sub = (k: Collection) => (isSingle(k) ? (k.clips[0].duration ? fmtTime(k.clips[0].duration) : "") : `${k.clips.length} ${videaWord(k.clips.length)}`);

  function draw() {
    cancelAnimationFrame(raf);
    const col = cols[c];
    const v = col.clips[i];
    const solo = isSingle(col);
    backdrop.src = v.poster;

    const video = h("video", { src: v.src, poster: v.poster, playsInline: true, muted: true, autoplay: true, style: `object-position:${objPos(v)}` });
    const paused = h("span", { class: "p-paused", "aria-hidden": "true", hidden: true });
    const playIcon = h("button", { type: "button", "aria-label": "Pozastavit", onclick: toggle }, icon(PAUSE));
    const mid = h("button", { class: "tap mid", type: "button", "aria-label": "Pozastavit", onclick: toggle });
    const fills: HTMLElement[] = [];
    const subtitle = h("small", {}, solo ? (v.duration ? fmtTime(v.duration) : "") : v.label || "");
    if (solo && !v.duration) video.addEventListener("loadedmetadata", () => (subtitle.textContent = fmtTime(video.duration)), { once: true });

    function toggle() {
      if (video.paused) video.play().catch(() => {});
      else video.pause();
    }
    const setPlaying = (on: boolean) => {
      paused.hidden = on;
      const label = on ? "Pozastavit" : "Přehrát";
      playIcon.setAttribute("aria-label", label);
      mid.setAttribute("aria-label", label);
      playIcon.replaceChildren(icon(on ? PAUSE : PLAY));
    };
    video.addEventListener("play", () => setPlaying(true));
    video.addEventListener("pause", () => setPlaying(false));
    video.addEventListener("ended", () => step(1));
    video.addEventListener("timeupdate", () => {
      if (!video.duration) return;
      const pct = (video.currentTime / video.duration) * 100;
      for (const m of [25, 50, 75, 100]) {
        const key = `${col.id}:${i}:${m}`;
        if (pct >= m - (m === 100 ? 1.5 : 0) && !reported.has(key)) {
          reported.add(key);
          track(`progress_${m}` as EventName, { collection: col.id, clip: i });
        }
      }
    });

    const stage = h(
      "div",
      { class: "stage" },
      video,
      h("div", { class: "p-shade", "aria-hidden": "true" }),
      !solo &&
        h(
          "div",
          { class: "bars" },
          ...col.clips.map((_, k) => {
            const f = h("i", { style: `width:${k < i ? "100%" : "0"}` });
            fills[k] = f;
            return h("span", {}, f);
          }),
        ),
      h(
        "div",
        { class: solo ? "p-top solo" : "p-top" },
        h("span", { class: "p-shop" }, h("span", {}, h("b", {}, solo ? clipTitle(col, v) : col.title), subtitle)),
        h("span", { class: "p-ctrl" }, playIcon, h("button", { class: "close", type: "button", "aria-label": "Zavřít", onclick: close }, icon("M6 6l12 12M18 6 6 18"))),
      ),
      h("button", { class: "tap prev", type: "button", "aria-label": "Předchozí video", onclick: () => step(-1) }),
      mid,
      h("button", { class: "tap next", type: "button", "aria-label": "Další video", onclick: () => step(1) }),
      paused,
      productCard(),
      data.badge !== false &&
        h("a", { class: "p-powered", href: "https://reelink.cz/?utm_source=widget", target: "_blank", rel: "noopener", "aria-label": "Videa přes Reelink" }, h("small", {}, "videa přes"), h("i", { "aria-hidden": "true" }), "reelink"),
    );

    let touch = { x: 0, y: 0 };
    stage.addEventListener("touchstart", (e) => (touch = { x: e.touches[0].clientX, y: e.touches[0].clientY }), { passive: true });
    stage.addEventListener("touchend", (e) => {
      const dx = e.changedTouches[0].clientX - touch.x;
      const dy = e.changedTouches[0].clientY - touch.y;
      if (dy > 90 && Math.abs(dy) > Math.abs(dx)) close();
      else if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) jump(dx < 0 ? 1 : -1);
    });

    row.replaceChildren(...[C > 1 && peek(-1), stage, C > 1 && peek(1)].filter((x): x is HTMLButtonElement | HTMLDivElement => !!x));
    video.play().catch(() => setPlaying(false));

    const tick = () => {
      const f = fills[i];
      if (video.duration && f) f.style.width = (video.currentTime / video.duration) * 100 + "%";
      raf = requestAnimationFrame(tick);
    };
    if (!solo) tick();
  }

  function productCard() {
    const label = product.needsVariant ? "Vybrat velikost" : "Do košíku";
    return h(
      "div",
      { class: product.img ? "p-card" : "p-card noimg" },
      product.img && h("img", { src: product.img, alt: "" }),
      h("span", { class: "p-meta" }, h("b", {}, product.name), product.price && h("span", { class: "p-price" }, product.price)),
      h("button", {
        type: "button",
        onclick: () => {
          track("cta_click", { collection: cols[c].id, variant: product.needsVariant ? "choose" : "cart" });
          close();
          onCta();
        },
      }, label),
    );
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === "Escape") close();
    else if (e.key === "ArrowRight") step(1);
    else if (e.key === "ArrowLeft") step(-1);
    else if (e.key === "ArrowDown") jump(1);
    else if (e.key === "ArrowUp") jump(-1);
    else if (e.key === " ") {
      e.preventDefault();
      const v = shadow.querySelector("video");
      if (v) v.paused ? v.play().catch(() => {}) : v.pause();
    } else return;
    e.stopPropagation();
  }
  document.addEventListener("keydown", onKey, true);

  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    cancelAnimationFrame(raf);
    document.removeEventListener("keydown", onKey, true);
    shadow.querySelectorAll("video").forEach((v) => v.removeAttribute("src"));
    host.remove();
    document.documentElement.style.overflow = prevOverflow;
    lastFocus?.focus({ preventScroll: true });
    onClose();
  }

  draw();
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
  dialog.focus();
  return { close };
}
