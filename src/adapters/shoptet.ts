import type { PageProduct, PlatformAdapter } from "../types";
import { text } from "../dom";
import { blockAnchor, sideBySide } from "../util";

// Shoptet: all templates use the same product form (#product-detail-form) and data-testid,
// verified on levanduloveudoli.cz and erikafashion.cz (template 11)
const form = () => document.getElementById("product-detail-form");

// variants to choose: a select or radio parameter with more than one option
function hasVariantChoice(f: Element) {
  const selects = Array.from(f.querySelectorAll<HTMLSelectElement>('select[name^="parameterValueId"], select[name="priceId"]'));
  if (selects.some((s) => Array.from(s.options).filter((o) => o.value).length > 1)) return true;
  const radios = f.querySelectorAll('input[type="radio"][name^="parameterValueId"], input[type="radio"][name="priceId"]');
  return radios.length > 1;
}

// Visible price on the product page. With variants Shoptet has a price per variant and hides the others,
// hence innerText (no hidden ones) and only visible elements. We don't put the unit ("/ ks") into the player.
function visiblePrice() {
  const scope = document.querySelector(".p-detail-inner") ?? document;
  const visible = (sel: string) =>
    Array.from(scope.querySelectorAll<HTMLElement>(sel)).find((e) => e.offsetParent !== null && e.innerText.trim());
  const clean = (t: string) => t.replace(/\s+/g, " ").trim().replace(/\s*\/\s*[^\d\s/]+\.?$/, "");
  const el = visible(".price-final-holder") ?? visible(".price-final");
  if (el) return clean(el.innerText);
  // the template hid Shoptet's price and shows its own (fermato.cz): take the hidden one's text, else microdata
  const hidden = scope.querySelector(".price-final-holder, .price-final");
  if (hidden?.textContent?.trim()) return clean(hidden.textContent);
  const amount = document.querySelector<HTMLMetaElement>('#product-detail-form [itemprop="price"]')?.content;
  const currency = document.querySelector<HTMLMetaElement>('#product-detail-form [itemprop="priceCurrency"]')?.content;
  if (!amount) return "";
  try {
    return new Intl.NumberFormat(document.documentElement.lang || "cs", { style: "currency", currency: currency || "CZK", maximumFractionDigits: Number(amount) % 1 ? 2 : 0 }).format(Number(amount));
  } catch {
    return amount;
  }
}

// Availability, shipping and benefits ("Doprava zdarma", "Vrácení do 30 dnů") are part of the purchase decision,
// the widget must not separate them from the button: it goes after them, but still before the description and tabs.
const BUY_INFO = /availability|delivery|shipping|benefit|doprava|doruc|gift|darek|perk|usp|dkLabFav|social-buttons|link-icons/i;
const COLUMN = ".p-info-wrapper, #product-detail-form";

// The sibling directly below the element on the page. By position, not DOM order: templates
// rearrange the column with the CSS order property (fermato.cz has the price note at the very end of the DOM).
// We skip our widget and invisible elements.
function nextEl(e: Element) {
  const me = e.getBoundingClientRect();
  if (!me.height || !e.parentElement) {
    let n = e.nextElementSibling;
    while (n?.matches("[data-reelink-widget]")) n = n.nextElementSibling;
    return n;
  }
  let best: Element | null = null;
  let bestTop = Infinity;
  for (const s of Array.from(e.parentElement.children)) {
    if (s === e || s.matches("[data-reelink-widget]")) continue;
    const r = s.getBoundingClientRect();
    if (!r.width || !r.height || r.top < me.bottom - 2) continue;
    if (r.top < bestTop) [best, bestTop] = [s, r.top];
  }
  return best;
}

// Short note by the price or cart ("Ceny vč. DPH, sleva z běžné ceny."): text only, no photos or controls.
function isNote(e: Element) {
  if (/^H[1-6]$/.test(e.tagName) || e.querySelector("h1,h2,h3,h4,img,video,iframe,input,select,button")) return false;
  const t = (e as HTMLElement).innerText?.trim() ?? "";
  return t.length > 0 && t.length <= 120 && e.getBoundingClientRect().height <= 48;
}

// The purchase block is often its own card (coffeespot.cz: section.cart-box, brainmarket.cz: .detail-buy),
// the widget doesn't belong in it. From the anchor we go up to the highest wrapper that doesn't yet contain the product description.
const DESCRIPTION = '.p-short-description, [data-testid="productCardShortDescr"], [data-testid="productCardDescr"], .p-detail-inner-header, h1';

function buyBlock(start: Element) {
  let at = start;
  while (at.parentElement && !at.parentElement.matches(COLUMN) && at.parentElement !== document.body && !at.parentElement.querySelector(DESCRIPTION)) {
    at = at.parentElement;
  }
  return at;
}

const isBuyInfo = (e: Element) => BUY_INFO.test(String(e.className)) || isNote(e);

function afterBuyInfo(start: Element) {
  let at = buyBlock(start);
  for (;;) {
    // last element in the purchase block wrapper (e.g. .detail-buy): continue one level up
    while (!nextEl(at) && at.parentElement && !at.parentElement.matches(COLUMN) && at.parentElement !== document.body) at = at.parentElement;
    const next = nextEl(at);
    if (next && isBuyInfo(next)) at = next;
    else return at;
  }
}

// Where to put the widget on desktop (two columns: gallery and info) so no empty space appears:
//  1. into the price column below the purchase block, if its bottom won't go past the gallery there,
//  2. else below the gallery, if there is free space under it (the price column is longer),
//  3. else full width below the product block.
// On mobile (one column) always below the purchase block. Height is taken from the already rendered widget.
const SLACK = 60;
type Spot = "column" | "gallery" | "wide";

const rect = (el: Element) => el.getBoundingClientRect();

// Bottom of the column's content, not its box: columns in one grid/flex row stretch to the same height.
function contentBottom(col: Element) {
  let bottom = 0;
  for (const c of Array.from(col.children)) {
    if (c.matches("[data-reelink-widget]")) continue;
    const r = rect(c);
    if (r.width && r.height) bottom = Math.max(bottom, r.bottom);
  }
  return bottom || rect(col).bottom;
}

function chooseSpot(host: HTMLElement | undefined, buyEnd: Element): Spot {
  const gallery = document.querySelector(".p-image-wrapper");
  const info = document.querySelector(".p-info-wrapper");
  if (!host || !gallery || !info) return "column";
  const g = rect(gallery);
  const i = rect(info);
  if (!g.width || !g.height || !sideBySide(g, i)) return "column";
  const s = getComputedStyle(host);
  const h = rect(host).height + parseFloat(s.marginTop) + parseFloat(s.marginBottom);
  if (!h) return "column";
  // measure everything without the widget, otherwise it would flip-flop: below the gallery it lengthens it and then "fits" in the column
  // the widget in the column pushes everything below it down by its height, subtract it
  const without = (col: Element) => {
    const b = contentBottom(col);
    return col.contains(host) && b > rect(host).bottom - 1 ? b - h : b;
  };
  const galleryBottom = without(gallery);
  const infoBottom = without(info);
  const b = rect(buyEnd);
  const buyBottom = buyEnd.contains(host) ? b.bottom - h : b.bottom;
  if (buyBottom + h <= galleryBottom + SLACK) return "column";
  if (galleryBottom + h <= infoBottom + SLACK) return "gallery";
  return "wide";
}

// below the gallery: after the last element in its column
function gallerySpot() {
  const g = document.querySelector(".p-image-wrapper");
  let last = g?.lastElementChild ?? null;
  while (last?.matches("[data-reelink-widget]")) last = last.previousElementSibling;
  return last;
}

// full-width spot: below the product block and benefits bar, before related products and tabs
function wideSpot() {
  const inner = document.querySelector(".p-detail-inner");
  if (!inner) return null;
  const n = nextEl(inner);
  return n?.matches(".benefitBanner") ? n : inner;
}

export const shoptet: PlatformAdapter = {
  name: "shoptet",

  detect() {
    return !!(
      (window as unknown as { shoptet?: unknown }).shoptet ||
      document.querySelector('link[href*="cdn.myshoptet.com"], script[src*="cdn.myshoptet.com"]')
    );
  },

  isProductPage() {
    return document.body.classList.contains("type-detail") || !!form();
  },

  getProduct(): PageProduct | null {
    const f = form();
    if (!f) return null;
    const id = f.querySelector<HTMLInputElement>('input[name="productId"]')?.value ?? null;
    const name = text(document.querySelector(".p-detail-inner-header h1, h1"));
    const img =
      document.querySelector<HTMLImageElement>(".p-main-image img, [data-testid='mainImage'] img")?.src ||
      document.querySelector<HTMLMetaElement>('meta[property="og:image"]')?.content ||
      "";
    return { id, name, price: visiblePrice(), img, needsVariant: hasVariantChoice(f) };
  },

  findAnchor(host) {
    const buy = document.querySelector('#product-detail-form [data-testid="divAddToCart"], #product-detail-form .add-to-cart');
    if (buy) {
      const end = afterBuyInfo(blockAnchor(buy));
      const spot = chooseSpot(host, end);
      const el = spot === "gallery" ? gallerySpot() : spot === "wide" ? wideSpot() : end;
      if (el && el !== end) return { el, where: "after", wide: true };
      return { el: end, where: "after" };
    }
    const price = document.querySelector(".p-final-price-wrapper");
    if (price) return { el: price, where: "after" };
    const f = form();
    return f ? { el: f, where: "after" } : null;
  },

  findCta() {
    return document.querySelector<HTMLElement>('#product-detail-form [data-testid="buttonAddToCart"], #product-detail-form .add-to-cart-button');
  },

  addToCart() {
    const f = form();
    if (f && hasVariantChoice(f)) {
      // option A: show the size/color picker, leave the cart to the customer
      const target = f.querySelector<HTMLElement>(".detail-parameters, .variant-list") ?? f;
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      f.querySelector<HTMLElement>('select[name^="parameterValueId"], select[name="priceId"], input[type="radio"]')?.focus({ preventScroll: true });
      return;
    }
    // option B: native button, Shoptet adds to cart itself and shows its own popup
    const btn = this.findCta();
    if (btn) btn.click();
    else f?.scrollIntoView({ behavior: "smooth", block: "center" });
  },
};
