(() => {
  const tooltip = document.createElement("div");
  tooltip.style.cssText =
    "position:fixed;pointer-events:none;background:#222;color:#fff;padding:4px 8px;font:12px sans-serif;border-radius:4px;display:none;z-index:99";
  document.body.appendChild(tooltip);

  document.addEventListener("mouseover", (e) => {
    const el = e.target;
    if (!(el instanceof SVGElement)) return;
    const v = el.getAttribute("data-value");
    const l = el.getAttribute("data-label");
    if (v === null || l === null) return;
    tooltip.textContent = `${l}: ${Number(v).toFixed(4)}`;
    tooltip.style.display = "block";
  });

  document.addEventListener("mousemove", (e) => {
    if (tooltip.style.display !== "block") return;
    tooltip.style.left = e.clientX + 12 + "px";
    tooltip.style.top = e.clientY + 12 + "px";
  });

  document.addEventListener("mouseout", (e) => {
    const el = e.target;
    if (el instanceof SVGElement && el.hasAttribute("data-value"))
      tooltip.style.display = "none";
  });
})();
