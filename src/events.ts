// Události analytiky. Bez souhlasu jen agregáty: neposíláme žádné ID návštěvníka ani cookies.
// Endpoint zatím není; každá událost jde i jako window event „reelink:event“ (ladění, ukázka na webu).

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

export const setEventContext = (c: Ctx) => (ctx = c);

export function track(name: EventName, data: Record<string, string | number> = {}) {
  const detail = { e: name, shop: ctx.shop, product: ctx.product, ...data, t: Date.now() };
  try {
    window.dispatchEvent(new CustomEvent("reelink:event", { detail }));
    if (ctx.endpoint && navigator.sendBeacon) navigator.sendBeacon(ctx.endpoint, JSON.stringify(detail));
  } catch {
    // analytika nesmí nikdy rozbít stránku obchodu
  }
}
