// panel pro vývoj: přepínač formátů, poslední událost a falešný Shoptet košík
(function () {
  const bar = document.querySelector(".dev-bar");
  const out = bar.querySelector("output");
  bar.querySelectorAll("button[data-f]").forEach((b) =>
    b.addEventListener("click", () => {
      window.reelink && window.reelink.setFormat && window.reelink.setFormat(b.dataset.f);
      bar.querySelectorAll("button[data-f]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    }),
  );
  window.addEventListener("reelink:event", (e) => {
    out.textContent = JSON.stringify(e.detail);
    console.log("[reelink]", e.detail);
  });
  const form = document.getElementById("product-detail-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = "Shoptet: zboží přidáno do košíku";
    document.body.append(t);
    setTimeout(() => t.remove(), 2500);
  });
})();
