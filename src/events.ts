// Analytics events. Without consent only aggregates: we send no visitor ID or cookies.
// Every event goes out as a window event "reelink:event" (debugging, demo on the site); to the endpoint only
// the ones the shop's statistics show (the first impression also starts the trial) and a missing picked spot.

export type EventName =
  | "impression"
  | "open"
  | "progress_25"
  | "progress_50"
  | "progress_75"
  | "progress_100"
  | "cta_click"
  | "add_to_cart"
  | "anchor_missing";

type Ctx = { endpoint: string | null; shop: string; product: string };
let ctx: Ctx = { endpoint: null, shop: "", product: "" };

// anchor_missing only when the spot picked in „Vzhled“ is gone (rule: 1): the admin warns about it
const SENT: EventName[] = ["impression", "open", "progress_100", "cta_click", "anchor_missing"];
const sent = (name: EventName, data: Record<string, unknown>) => SENT.includes(name) && (name !== "anchor_missing" || data.rule === 1);

export const setEventContext = (c: Ctx) => (ctx = c);

export function track(name: EventName, data: Record<string, string | number | undefined> = {}) {
  const detail = { e: name, shop: ctx.shop, product: ctx.product, ...data, t: Date.now() };
  try {
    window.dispatchEvent(new CustomEvent("reelink:event", { detail }));
    if (ctx.endpoint && sent(name, data) && navigator.sendBeacon) navigator.sendBeacon(ctx.endpoint, JSON.stringify(detail));
  } catch {
    // analytics must never break the shop page
  }
}
