import type { PageProduct, PlatformAdapter } from "../types";
import { text } from "../dom";

// Any site: the widget goes into a <div data-reelink></div> that the shop places itself.
// Product data comes from schema.org (JSON-LD), the player button just scrolls the page to the purchase area.

type LdProduct = { "@type"?: string | string[]; name?: string; image?: string | string[]; offers?: unknown; sku?: string };

function ldProduct(): LdProduct | null {
  for (const s of Array.from(document.querySelectorAll('script[type="application/ld+json"]'))) {
    try {
      const json = JSON.parse(s.textContent ?? "");
      const items: LdProduct[] = [json, ...(json["@graph"] ?? [])].flat();
      const p = items.find((x) => [x?.["@type"]].flat().includes("Product"));
      if (p) return p;
    } catch {
      // skip broken JSON-LD
    }
  }
  return null;
}

function ldPrice(offers: unknown) {
  const o = [offers].flat()[0] as { price?: string | number; priceCurrency?: string } | undefined;
  if (!o?.price) return "";
  const n = Number(o.price);
  if (!o.priceCurrency || !Number.isFinite(n)) return String(o.price);
  try {
    return new Intl.NumberFormat(document.documentElement.lang || "cs", { style: "currency", currency: o.priceCurrency, maximumFractionDigits: n % 1 ? 2 : 0 }).format(n);
  } catch {
    return `${o.price} ${o.priceCurrency}`;
  }
}

const slot = () => document.querySelector("[data-reelink]");

export const generic: PlatformAdapter = {
  name: "generic",

  detect: () => true,

  isProductPage() {
    return !!slot();
  },

  getProduct(): PageProduct | null {
    const p = ldProduct();
    const img = [p?.image].flat()[0] || document.querySelector<HTMLMetaElement>('meta[property="og:image"]')?.content || "";
    return {
      id: p?.sku ?? null,
      name: p?.name || text(document.querySelector("h1")),
      price: ldPrice(p?.offers),
      img: String(img),
      needsVariant: false,
    };
  },

  findAnchor() {
    const el = slot();
    return el ? { el, where: "after" } : null;
  },

  findCta() {
    return null;
  },

  addToCart() {
    const target = document.querySelector("form[action*='cart'], form[action*='kosik'], form[action*='basket']") ?? slot();
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  },
};
