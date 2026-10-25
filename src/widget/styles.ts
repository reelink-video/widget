// Widget styles. They live in Shadow DOM, so the shop's CSS can't break them and we can't break its.
// Only px, no rem: shops often set a different font size on <html> (e.g. 62.5%).

export const EASE = "cubic-bezier(.2,.8,.2,1)";

export const widgetCss = `
:host { display: block; margin: 16px 0; font-family: var(--rl-font); color: var(--rl-ink); font-size: 15px; line-height: 1.4; }
* { box-sizing: border-box; }
button { font: inherit; }
.rl { position: relative; display: grid; gap: 12px; padding: 16px 0 4px; border-top: 1px solid var(--rl-line); }
/* full page width (no room in the price column): larger tiles */
:host([data-wide]) { margin: 24px 0; }
:host([data-wide]) .rl-row { gap: 12px; }
:host([data-wide]) .rl-tile { flex: 0 0 auto; width: clamp(120px, 16%, 180px); max-width: none; }
:host([data-wide]) .rl-title { font-size: 22px; }
/* the shop already draws a line above the widget: don't draw a second one */
:host([data-noline]) .rl { border-top: 0; padding-top: 4px; }
.rl-head { display: flex; align-items: baseline; gap: 6px; }
.rl-title { font-family: var(--rl-head-font); font-size: 18px; font-weight: 600; letter-spacing: -.01em; margin: 0; }
.rl-count { font-size: 12.5px; color: var(--rl-muted); }

.rl-row { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; padding-bottom: 2px; }
.rl-row::-webkit-scrollbar { display: none; }
.rl-tile {
  position: relative; flex: 1 0 92px; max-width: 120px; aspect-ratio: 9 / 16; border-radius: 12px; overflow: hidden;
  border: 0; padding: 0; background: var(--rl-line); cursor: pointer; color: #fff; isolation: isolate;
  transition: transform .3s ${EASE};
}
.rl-tile:hover { transform: translateY(-3px); }
.rl-tile:focus-visible { outline: 2px solid var(--rl-ink); outline-offset: 3px; }
.rl-tile video { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .6s ${EASE}; }
.rl-tile:hover video { transform: scale(1.06); }
.rl-tile::after { content: ""; position: absolute; inset: 0; background: linear-gradient(to top, rgba(20,14,26,.72), rgba(20,14,26,0) 46%); pointer-events: none; }
.rl-tile .lbl { position: absolute; left: 9px; right: 9px; bottom: 9px; z-index: 1; font-size: 12.5px; font-weight: 700; text-align: left; line-height: 1.2; }
.rl-tile .lbl small { display: block; margin-top: 2px; font-size: 10.5px; font-weight: 600; opacity: .8; font-variant-numeric: tabular-nums; }
.rl-tile .lbl small:empty { display: none; }
.rl-tile .segs { position: absolute; left: 8px; right: 8px; top: 8px; z-index: 1; display: flex; gap: 3px; }
.rl-tile .segs i { flex: 1; height: 2px; border-radius: 2px; background: rgba(255,255,255,.7); }

.rl-circles { display: flex; gap: 14px; overflow-x: auto; scrollbar-width: none; padding: 4px 2px; }
.rl-circles::-webkit-scrollbar { display: none; }
.rl-circle { flex: none; display: grid; justify-items: center; align-content: start; gap: 7px; border: 0; background: none; padding: 0; cursor: pointer; color: var(--rl-ink); font-size: 12px; font-weight: 600; width: 76px; text-align: center; line-height: 1.25; }
.rl-circle .ring { width: 70px; height: 70px; border-radius: 50%; padding: 2px; background: var(--rl-ink); display: block; transition: transform .25s ${EASE}; }
.rl-circle img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block; border: 2.5px solid var(--rl-bg); }
.rl-circle:hover .ring { transform: scale(1.06); }
.rl-circle:focus-visible { outline: 2px solid var(--rl-ink); outline-offset: 3px; border-radius: 12px; }

.rl-feature {
  display: grid; grid-template-columns: 72px 1fr auto; align-items: center; gap: 16px; width: 100%;
  color: var(--rl-ink); text-align: left; cursor: pointer; padding: 0 4px 0 0; border: 0; background: none;
}
.rl-feature-thumb { position: relative; width: 72px; aspect-ratio: 9 / 16; border-radius: 10px; overflow: hidden; background: var(--rl-line); display: block; }
.rl-feature-thumb video { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .6s ${EASE}; }
.rl-feature:hover .rl-feature-thumb video { transform: scale(1.06); }
.rl-feature .play { position: absolute; left: 50%; top: 50%; width: 30px; height: 30px; margin: -15px 0 0 -15px; border-radius: 50%; background: rgba(255,255,255,.9); }
.rl-feature .play::after { content: ""; position: absolute; left: 11.5px; top: 9px; border-left: 10px solid #1a1a1a; border-top: 6px solid transparent; border-bottom: 6px solid transparent; }
.rl-feature-text { display: grid; gap: 4px; min-width: 0; }
.rl-feature-meta { font-size: 11.5px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--rl-muted); font-variant-numeric: tabular-nums; }
.rl-feature-meta:empty { display: none; }
.rl-feature-title { font-family: var(--rl-head-font); font-size: 20px; font-weight: 600; letter-spacing: -.01em; line-height: 1.15; }
.rl-feature-more { display: inline-flex; align-items: center; gap: 8px; margin-top: 4px; font-size: 12.5px; color: var(--rl-muted); }
.rl-feature-more .stack { display: inline-flex; }
.rl-feature-more img { width: 22px; height: 22px; border-radius: 50%; object-fit: cover; border: 2px solid var(--rl-bg); }
.rl-feature-more img + img { margin-left: -8px; }
.rl-feature-go { width: 20px; height: 20px; fill: none; stroke: var(--rl-ink); stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; transition: transform .25s ${EASE}; }
.rl-feature:hover .rl-feature-go { transform: translateX(3px); }
.rl-feature:focus-visible { outline: 2px solid var(--rl-ink); outline-offset: 4px; border-radius: 12px; }
@media (prefers-reduced-motion: reduce) { .rl-tile, .rl-tile video, .rl-circle .ring, .rl-feature-thumb video { transition: none; } }
`;
