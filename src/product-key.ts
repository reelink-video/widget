// Which product page this is. The widget and the backend must agree on the key without talking to each other,
// so it is a plain hash of the URL path that both can compute: the widget from the page, the backend from the feed.

// path of the canonical URL: decoded, lowercase, without a trailing slash
export function pathOf(url: string) {
  let p: string;
  try {
    p = new URL(url, location.href).pathname;
  } catch {
    p = url;
  }
  try {
    p = decodeURIComponent(p);
  } catch {
    // leave it encoded
  }
  p = p.toLowerCase().replace(/\/+$/, "");
  return p || "/";
}

// 32-bit FNV-1a as 8 hex chars
export function fnv1a(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

// key of the current page: <base>/s/<shop>/p/<key>.json holds its videos
export function productKey() {
  const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href;
  return fnv1a(pathOf(canonical || location.href));
}
