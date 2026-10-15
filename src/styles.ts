// Styles live in Shadow DOM, so the shop's CSS can't break them and we can't break its.
// Only px, no rem: shops often set a different font size on <html> (e.g. 62.5%).

const EASE = "cubic-bezier(.2,.8,.2,1)";

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

export const playerCss = `
:host { all: initial; }
* { box-sizing: border-box; }
button { font: inherit; }
.player {
  position: fixed; inset: 0; z-index: 2147483647; background: #0B0A0D; overflow: hidden;
  width: 100%; height: 100%; max-width: none; max-height: none; margin: 0; border: 0;
  display: grid; place-items: center; font-family: var(--rl-font); font-size: 15px; line-height: 1.4; color: #fff;
  padding: env(safe-area-inset-top, 0px) env(safe-area-inset-right, 0px) env(safe-area-inset-bottom, 0px) env(safe-area-inset-left, 0px);
  animation: p-fade .25s ease; -webkit-font-smoothing: antialiased;
}
.player:focus { outline: none; }
.player:not([open]) { display: none; }
.player::backdrop { background: transparent; }
.p-backdrop { position: absolute; inset: -60px; width: calc(100% + 120px); height: calc(100% + 120px); object-fit: cover; filter: blur(48px) saturate(1.3) brightness(.45); pointer-events: none; }
.p-row { position: relative; display: flex; align-items: center; justify-content: center; gap: 32px; width: 100%; height: 100%; }
.stage {
  position: relative; flex: none; height: min(90vh, 860px); height: min(90dvh, 860px); aspect-ratio: 9 / 16; max-width: 100vw;
  background: #0B0B0A; border-radius: 20px; overflow: hidden; color: #fff; touch-action: pan-y;
  box-shadow: 0 30px 80px -20px rgba(0,0,0,.7); animation: p-in .35s ${EASE};
}
@keyframes p-fade { from { opacity: 0; } }
@keyframes p-in { from { opacity: 0; transform: translateY(24px) scale(.96); } }
@media (max-width: 560px) { .stage { height: 100%; width: 100%; aspect-ratio: auto; border-radius: 0; } }
.stage video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; animation: p-fade .3s ease; }
.p-shade { position: absolute; inset: 0; pointer-events: none; z-index: 1; background: linear-gradient(to bottom, rgba(0,0,0,.45), transparent 18%, transparent 58%, rgba(0,0,0,.7)); }
.bars { position: absolute; top: 10px; left: 12px; right: 12px; display: flex; gap: 4px; z-index: 3; }
.bars span { flex: 1; height: 2.5px; border-radius: 2px; background: rgba(255,255,255,.3); overflow: hidden; }
.bars span i { display: block; height: 100%; width: 0; background: #fff; }
.p-top { position: absolute; top: 22px; left: 12px; right: 10px; display: flex; justify-content: space-between; align-items: center; gap: 8px; z-index: 4; }
.p-top.solo { top: 12px; }
.p-shop { display: flex; align-items: center; gap: 9px; line-height: 1.2; min-width: 0; }
.p-shop b { display: block; font-size: 13.5px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.p-shop small { display: block; font-size: 12px; opacity: .8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-variant-numeric: tabular-nums; }
.p-shop small:empty { display: none; }
.p-ctrl { display: flex; gap: 2px; flex: none; }
.p-ctrl button { width: 38px; height: 38px; display: grid; place-items: center; border: 0; border-radius: 50%; background: transparent; color: #fff; cursor: pointer; transition: background .2s; }
.p-ctrl button:hover { background: rgba(255,255,255,.14); }
.p-ctrl svg { width: 20px; height: 20px; fill: currentColor; stroke: currentColor; stroke-width: 0; }
.p-ctrl .close svg { fill: none; stroke-width: 2; stroke-linecap: round; }
.tap { position: absolute; top: 70px; bottom: 96px; z-index: 2; border: 0; background: transparent; cursor: pointer; padding: 0; }
.tap.prev { left: 0; width: 30%; } .tap.next { right: 0; width: 30%; } .tap.mid { left: 30%; right: 30%; }
.p-paused { position: absolute; left: 50%; top: 50%; z-index: 2; width: 64px; height: 64px; margin: -32px 0 0 -32px; border-radius: 50%; background: rgba(0,0,0,.35); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); pointer-events: none; animation: p-fade .2s ease; }
.p-paused::after { content: ""; position: absolute; left: 25px; top: 20px; border-left: 20px solid #fff; border-top: 12px solid transparent; border-bottom: 12px solid transparent; }
.p-card {
  position: absolute; left: 10px; right: 10px; bottom: 30px; z-index: 3;
  display: grid; grid-template-columns: 40px 1fr auto; gap: 10px; align-items: center;
  background: rgba(255,253,250,.94); color: #1a1a1a; border-radius: 14px; padding: 6px;
  backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
}
.p-card.noimg { grid-template-columns: 1fr auto; padding-left: 12px; }
.p-card img { width: 40px; height: 40px; border-radius: 9px; object-fit: cover; display: block; }
.p-meta { display: grid; gap: 1px; min-width: 0; line-height: 1.2; }
.p-meta b { font-size: 12px; font-weight: 600; color: #6b6470; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.p-price { font-size: 14.5px; font-weight: 800; }
.p-card button { font-size: 13.5px; font-weight: 700; white-space: nowrap; padding: 11px 16px; border-radius: min(var(--rl-radius), 12px); border: 0; background: var(--rl-accent); color: var(--rl-on-accent); cursor: pointer; transition: filter .2s; }
.p-card button:hover { filter: brightness(1.08); }
.p-powered { position: absolute; left: 50%; bottom: 7px; z-index: 3; transform: translateX(-50%); display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; letter-spacing: -.01em; color: #fff; opacity: .5; transition: opacity .25s; text-decoration: none; white-space: nowrap; }
.stage:hover .p-powered { opacity: .85; }
.p-powered small { font-size: 10px; font-weight: 500; letter-spacing: .01em; margin-right: 1px; }
.p-powered i { position: relative; width: 12px; height: 12px; border-radius: 3.5px; background: #FFE04A; }
.p-powered i::after { content: ""; position: absolute; left: 4.5px; top: 3px; border-left: 4.5px solid #141413; border-top: 3px solid transparent; border-bottom: 3px solid transparent; }
.peek { position: relative; flex: none; height: min(56vh, 540px); height: min(56dvh, 540px); aspect-ratio: 9 / 16; border: 0; padding: 0; border-radius: 16px; overflow: hidden; cursor: pointer; background: #000; transition: transform .3s ${EASE}; color: #fff; }
.peek:hover { transform: scale(1.03); }
.peek img { width: 100%; height: 100%; object-fit: cover; display: block; opacity: .4; transition: opacity .25s; }
.peek:hover img { opacity: .7; }
.peek-lbl { position: absolute; left: 12px; right: 12px; bottom: 12px; text-align: left; font-size: 13.5px; font-weight: 700; line-height: 1.2; text-shadow: 0 1px 4px rgba(0,0,0,.5); }
.peek-lbl small { display: block; margin-top: 2px; font-size: 11px; font-weight: 600; opacity: .8; }
.peek-lbl small:empty { display: none; }
.peek-arrow { position: absolute; left: 50%; top: 50%; width: 40px; height: 40px; margin: -20px 0 0 -20px; opacity: .75; transition: opacity .2s, transform .25s ${EASE}; filter: drop-shadow(0 1px 4px rgba(0,0,0,.5)); }
.peek-arrow svg { width: 100%; height: 100%; display: block; fill: none; stroke: #fff; stroke-width: 1.3; stroke-linecap: round; stroke-linejoin: round; }
.peek:hover .peek-arrow { opacity: 1; }
.peek.l:hover .peek-arrow { transform: translateX(-3px); }
.peek.r:hover .peek-arrow { transform: translateX(3px); }
@media (max-width: 860px) { .peek { display: none; } }
@media (prefers-reduced-motion: reduce) { .player, .stage, .stage video, .p-paused { animation: none; } .peek { transition: none; } }
`;
