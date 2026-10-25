// Player styles, in its own Shadow DOM (see ../widget/styles.ts). The player sits in the top layer above the shop.

import { EASE } from "../widget/styles";

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
