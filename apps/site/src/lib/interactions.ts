document.querySelectorAll<HTMLElement>("[data-gallery]").forEach(gallery => {
  let category = "All";
  let status = "All statuses";
  const query = gallery.querySelector<HTMLInputElement>("[data-gallery-query]");
  const update = () => {
    let hasMatches = false;
    gallery.querySelectorAll<HTMLElement>("[data-gallery-item]").forEach(item => {
      const matches = (status === "All statuses" || item.dataset.status === status.toLowerCase()) && (category === "All" || item.dataset.category === category) && (item.dataset.search ?? "").toLowerCase().includes(query?.value.toLowerCase().trim() ?? "");
      item.hidden = !matches; hasMatches ||= matches;
    });
    const empty = gallery.querySelector<HTMLElement>("[data-gallery-empty]");
    if (empty) empty.hidden = hasMatches;
  };
  query?.addEventListener("input", update);
  gallery.querySelectorAll<HTMLButtonElement>("button[data-status-filter]").forEach(button => button.addEventListener("click", () => {
    status = button.dataset.statusFilter ?? "All statuses";
    gallery.querySelectorAll<HTMLButtonElement>("button[data-status-filter]").forEach(other => other.setAttribute("aria-pressed", String(other === button)));
    update();
  }));
  gallery.querySelectorAll<HTMLButtonElement>("button[data-view]").forEach(button => button.addEventListener("click", () => {
    gallery.dataset.view = button.dataset.view;
    gallery.querySelectorAll<HTMLButtonElement>("button[data-view]").forEach(other => other.setAttribute("aria-pressed", String(other === button)));
  }));
  gallery.querySelectorAll<HTMLButtonElement>("button[data-category]").forEach(button => button.addEventListener("click", () => {
    category = button.dataset.category ?? "All";
    gallery.querySelectorAll<HTMLButtonElement>("button[data-category]").forEach(other => other.setAttribute("aria-pressed", String(other === button)));
    update();
  }));
});

document.querySelectorAll<HTMLButtonElement>("[data-copy]").forEach(button => button.addEventListener("click", async () => {
  const target = document.getElementById(button.dataset.copy ?? "");
  if (!target) return;
  const label = button.textContent;
  try { await navigator.clipboard.writeText(target.textContent ?? ""); button.textContent = "Copied"; }
  catch { button.textContent = "Select to copy"; const range = document.createRange(); range.selectNodeContents(target); const selection = getSelection(); selection?.removeAllRanges(); selection?.addRange(range); }
  setTimeout(() => { button.textContent = label; }, 1800);
}));
