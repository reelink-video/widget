// Data the admin publishes for each product as static JSON: <base>/s/<shop>/p/<key>.json
// The key is a hash of the product's canonical URL path (see productKey), so the backend can compute it from the feed URL too.

export type Clip = {
  // video id in the admin, sent with events for the statistics
  id?: string;
  src: string;
  poster: string;
  // short silent loop for the tile (a few seconds, ~100 kB); without it the tile shows only the poster
  // and the full video loads in the player
  preview?: string;
  // horizontal crop of the video in the preview, e.g. "40%"
  pos?: string;
  label?: string;
  // duration in seconds; when missing, read from the video metadata
  duration?: number;
};

// collection = a topic on the product (like an Instagram highlight). A standalone video is a single-clip collection.
export type Collection = {
  id: string;
  title: string;
  clips: Clip[];
};

export type Format = "tiles" | "circles" | "single";

export type ProductData = {
  v: 1;
  format: Format;
  // block heading above the videos; empty string = no heading
  title?: string;
  // "videa přes reelink" badge in the player (Start yes, Pro no)
  badge?: boolean;
  collections: Collection[];
};

// what we know about the product from the page: so the price in the player always matches the site
export type PageProduct = {
  id: string | null;
  name: string;
  price: string;
  img: string;
  // has variants to choose (size, color): the player button leads to them, not straight to the cart
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
  // where to insert the widget: returns the element and whether to go before or after it; wide = full page width.
  // host is the already rendered widget (its height tells whether it fits in the column)
  findAnchor(host?: HTMLElement): { el: Element; where: "before" | "after"; wide?: boolean } | null;
  // element whose look the widget adopts (button colors and border radius)
  findCta(): HTMLElement | null;
  // option A: close the video and show the native variant picker; option B: click the native button
  addToCart(): void;
}
