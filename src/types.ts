// Data, která admin publikuje pro každý produkt jako statický JSON: <base>/s/<shop>/p/<klíč>.json
// Klíč je hash cesty kanonické URL produktu (viz productKey), takže ho spočítá i backend z URL ve feedu.

export type Clip = {
  src: string;
  poster: string;
  // vodorovný výřez videa v náhledu, např. "40%"
  pos?: string;
  label?: string;
  // délka v sekundách; když chybí, zjistí se z metadat videa
  duration?: number;
};

// kolekce = téma u produktu (jako výběr na Instagramu). Samostatné video je kolekce s jedním klipem.
export type Collection = {
  id: string;
  title: string;
  clips: Clip[];
};

export type Format = "tiles" | "circles" | "single";

export type ProductData = {
  v: 1;
  format: Format;
  // nadpis bloku nad videi; prázdný řetězec = bez nadpisu
  title?: string;
  // odznak „videa přes reelink“ v přehrávači (Start ano, Pro ne)
  badge?: boolean;
  collections: Collection[];
};

// co o produktu víme ze stránky: v přehrávači tak cena vždy sedí s webem
export type PageProduct = {
  id: string | null;
  name: string;
  price: string;
  img: string;
  // má varianty k výběru (velikost, barva): tlačítko v přehrávači vede k nim, ne rovnou do košíku
  needsVariant: boolean;
};

export type Theme = {
  font: string;
  headFont: string;
  ink: string;
  muted: string;
  line: string;
  bg: string;
  accent: string;
  onAccent: string;
  radius: string;
};

export interface PlatformAdapter {
  name: string;
  detect(): boolean;
  isProductPage(): boolean;
  getProduct(): PageProduct | null;
  // kam widget vložit: vrátí prvek a jestli jít před něj, nebo za něj; wide = přes celou šířku stránky.
  // host je už vykreslený widget (podle jeho výšky se dá rozhodnout, jestli se vejde do sloupce)
  findAnchor(host?: HTMLElement): { el: Element; where: "before" | "after"; wide?: boolean } | null;
  // prvek, jehož vzhled widget převezme (barvy a zaoblení tlačítka)
  findCta(): HTMLElement | null;
  // varianta A: zavřít video a ukázat nativní výběr varianty; varianta B: kliknout na nativní tlačítko
  addToCart(): void;
}
