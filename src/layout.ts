// Geometry helpers for finding a spot on the page. They look at where elements actually are on screen,
// not at the CSS that put them there: shop templates reach the same layout in many different ways.

const visibleRect = (e: Element) => {
  const r = e.getBoundingClientRect();
  return r.width && r.height ? r : null;
};

// two boxes on the same line, one beside the other
export function sideBySide(a: DOMRect, b: DOMRect) {
  const sameLine = a.top < b.bottom - 2 && b.top < a.bottom - 2;
  const apart = a.right <= b.left + 2 || b.right <= a.left + 2;
  return sameLine && apart;
}

function hasNeighbourInRow(el: Element) {
  const me = visibleRect(el);
  if (!me || !el.parentElement) return false;
  for (const s of Array.from(el.parentElement.children)) {
    if (s === el || s.matches("[data-reelink-widget]")) continue;
    const r = visibleRect(s);
    if (r && sideBySide(me, r)) return true;
  }
  return false;
}

// does the element lay out its children side by side (e.g. quantity and add-to-cart button)?
export function hasRowLayout(el: Element) {
  const kids = Array.from(el.children).filter((c) => !c.matches("[data-reelink-widget]"));
  return kids.some((c) => hasNeighbourInRow(c));
}

// Shop templates and add-ons like to rearrange the cart block into a row (side by side).
// The widget needs full width, so we go up from the anchor while the element has a sibling beside it.
// By actual position, not CSS: bootstrap's .row is flex, but its columns are often stacked.
export function blockAnchor(el: Element): Element {
  let cur = el;
  while (cur.parentElement && cur.parentElement !== document.body && hasNeighbourInRow(cur)) cur = cur.parentElement;
  return cur;
}

// Does the element end with a line (its own or its last descendant's border-bottom, or an <hr>)?
// Then the widget doesn't draw its top line, otherwise there would be two stacked.
// Only something spanning almost the full widget width counts as a line; a button or input border doesn't.
export function endsWithLine(el: Element | null, width: number) {
  const lastChild = (e: Element) => {
    let c = e.lastElementChild;
    while (c?.matches("[data-reelink-widget]")) c = c.previousElementSibling;
    return c;
  };
  for (let e = el, depth = 0; e && depth < 5; e = lastChild(e), depth++) {
    if (/^(BUTTON|INPUT|SELECT|TEXTAREA|LABEL|A|IMG|SVG)$/i.test(e.tagName)) return false;
    if (e.getBoundingClientRect().width < width * 0.8) return false;
    if (e.tagName === "HR") return true;
    const s = getComputedStyle(e);
    const visible = s.borderBottomStyle !== "none" && parseFloat(s.borderBottomWidth) > 0 && !/^(transparent|rgba\(.*,\s*0\))$/.test(s.borderBottomColor);
    if (visible) return true;
  }
  return false;
}
