import type { PageProduct, PlatformAdapter } from "../types";
import { text } from "../dom";
import { blockAnchor, sideBySide } from "../util";

// Shoptet: všechny šablony používají stejný formulář produktu (#product-detail-form) a data-testid,
// ověřeno na levanduloveudoli.cz a erikafashion.cz (šablona 11)
const form = () => document.getElementById("product-detail-form");

// varianty k výběru: select nebo radio s parametrem, kde je víc než jedna možnost
function hasVariantChoice(f: Element) {
  const selects = Array.from(f.querySelectorAll<HTMLSelectElement>('select[name^="parameterValueId"], select[name="priceId"]'));
  if (selects.some((s) => Array.from(s.options).filter((o) => o.value).length > 1)) return true;
  const radios = f.querySelectorAll('input[type="radio"][name^="parameterValueId"], input[type="radio"][name="priceId"]');
  return radios.length > 1;
}

// Viditelná cena v kartě produktu. U variant má Shoptet cenu každé varianty a skryté schovává,
// proto innerText (bez skrytých) a jen viditelné prvky. Jednotku („/ ks“) do přehrávače nedáváme.
function visiblePrice() {
  const scope = document.querySelector(".p-detail-inner") ?? document;
  const visible = (sel: string) =>
    Array.from(scope.querySelectorAll<HTMLElement>(sel)).find((e) => e.offsetParent !== null && e.innerText.trim());
  const clean = (t: string) => t.replace(/\s+/g, " ").trim().replace(/\s*\/\s*[^\d\s/]+\.?$/, "");
  const el = visible(".price-final-holder") ?? visible(".price-final");
  if (el) return clean(el.innerText);
  // šablona cenu Shoptetu skryla a ukazuje vlastní (fermato.cz): vezmeme text skryté, jinak mikrodata
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

// Dostupnost, doprava a výhody („Doprava zdarma“, „Vrácení do 30 dnů“) patří k rozhodnutí o nákupu,
// widget je nemá oddělit od tlačítka: jde až za ně, ale pořád před popis a záložky.
const BUY_INFO = /availability|delivery|shipping|benefit|doprava|doruc|gift|darek|perk|usp|dkLabFav|social-buttons|link-icons/i;
const COLUMN = ".p-info-wrapper, #product-detail-form";

// Sourozenec, který je na stránce hned pod prvkem. Podle polohy, ne podle pořadí v DOM: šablony
// přeskládávají sloupec CSS vlastností order (fermato.cz má poznámku k cenám v DOM až úplně na konci).
// Náš widget a neviditelné prvky přeskakujeme.
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

// Krátká poznámka u ceny nebo košíku („Ceny vč. DPH, sleva z běžné ceny.“): jen text, žádné fotky a ovládání.
function isNote(e: Element) {
  if (/^H[1-6]$/.test(e.tagName) || e.querySelector("h1,h2,h3,h4,img,video,iframe,input,select,button")) return false;
  const t = (e as HTMLElement).innerText?.trim() ?? "";
  return t.length > 0 && t.length <= 120 && e.getBoundingClientRect().height <= 48;
}

// Blok nákupu bývá vlastní karta (coffeespot.cz: section.cart-box, brainmarket.cz: .detail-buy),
// widget do ní nepatří. Od kotvy jdeme nahoru až k nejvyššímu obalu, ve kterém ještě není popis produktu.
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
    // poslední prvek v obalu bloku nákupu (např. .detail-buy): pokračujeme o úroveň výš
    while (!nextEl(at) && at.parentElement && !at.parentElement.matches(COLUMN) && at.parentElement !== document.body) at = at.parentElement;
    const next = nextEl(at);
    if (next && isBuyInfo(next)) at = next;
    else return at;
  }
}

// Kam widget na desktopu (dva sloupce: galerie a info) dát, aby nevzniklo prázdné místo:
//  1. do sloupce s cenou pod blok nákupu, když tam jeho spodek nepřesáhne galerii,
//  2. jinak pod galerii, když je pod ní volné místo (sloupec s cenou je delší),
//  3. jinak přes celou šířku pod blokem produktu.
// Na mobilu (jeden sloupec) vždy pod nákup. Výšku bereme z už vykresleného widgetu.
const SLACK = 60;
type Spot = "column" | "gallery" | "wide";

const rect = (el: Element) => el.getBoundingClientRect();

// Spodek obsahu sloupce, ne jeho krabice: sloupce v jednom řádku gridu/flexu se natáhnou na stejnou výšku.
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
  // všechno měříme bez widgetu, jinak by přeskakoval: pod galerií ji prodlouží a „vejde se“ do sloupce
  // widget ve sloupci posouvá všechno pod sebou o svou výšku, tu odečteme
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

// pod galerii: za poslední prvek v jejím sloupci
function gallerySpot() {
  const g = document.querySelector(".p-image-wrapper");
  let last = g?.lastElementChild ?? null;
  while (last?.matches("[data-reelink-widget]")) last = last.previousElementSibling;
  return last;
}

// místo přes celou šířku: pod blokem produktu a pruhem výhod, před souvisejícími produkty a záložkami
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
      // varianta A: ukázat výběr velikosti/barvy, košík nechat na zákazníkovi
      const target = f.querySelector<HTMLElement>(".detail-parameters, .variant-list") ?? f;
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      f.querySelector<HTMLElement>('select[name^="parameterValueId"], select[name="priceId"], input[type="radio"]')?.focus({ preventScroll: true });
      return;
    }
    // varianta B: nativní tlačítko, Shoptet sám přidá do košíku a ukáže svoje okno
    const btn = this.findCta();
    if (btn) btn.click();
    else f?.scrollIntoView({ behavior: "smooth", block: "center" });
  },
};
