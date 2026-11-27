import { slideSelection } from "./site-motion";

document.querySelectorAll<HTMLElement>("[data-gallery]").forEach(gallery => {
  let category = "All";
  let status = "All";
  const query = gallery.querySelector<HTMLInputElement>("[data-gallery-query]");
  const update = () => {
    let hasMatches = false;
    gallery.querySelectorAll<HTMLElement>("[data-gallery-item]").forEach(item => {
      const matches = (status === "All" || item.dataset.status === status.toLowerCase()) && (category === "All" || item.dataset.category === category) && (item.dataset.search ?? "").toLowerCase().includes(query?.value.toLowerCase().trim() ?? "");
      item.hidden = !matches; hasMatches ||= matches;
    });
    // A family with nothing left to show steps aside, head and all.
    gallery.querySelectorAll<HTMLElement>("[data-gallery-family]").forEach(family => {
      family.hidden = !family.querySelector("[data-gallery-item]:not([hidden])");
    });
    const empty = gallery.querySelector<HTMLElement>("[data-gallery-empty]");
    if (empty) empty.hidden = hasMatches;
  };
  query?.addEventListener("input", update);
  // "/" jumps to the search, as the key drawn in the field says, unless the
  // reader is already typing somewhere.
  document.addEventListener("keydown", event => {
    if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey || !query) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest("input, textarea, select, [contenteditable]:not([contenteditable='false'])")) return;
    event.preventDefault();
    query.focus();
  });
  gallery.querySelectorAll<HTMLButtonElement>(".catalog-segments button").forEach(button => button.addEventListener("click", () => {
    const previous = button.parentElement?.querySelector<HTMLElement>('[aria-pressed="true"]') ?? null;
    slideSelection(previous, button);
    previous?.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-pressed", "true");
    if (button.dataset.view) gallery.dataset.view = button.dataset.view;
    if (button.dataset.statusFilter) status = button.dataset.statusFilter;
    if (button.dataset.category) category = button.dataset.category;
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

// The pinned header is clear at the top of a page and takes its affix
// ground (and the fade band under it) once the page has moved beneath it.
const header = document.querySelector<HTMLElement>("[data-site-header]");
if (header) {
  const onScroll = () => header.toggleAttribute("data-scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

// Effects are a site preference, so an element that should only carry an
// effect while they are on names it: data-fx-on="grain ink". The classes
// are the library's own fx() names.
const syncEffects = () => {
  const isOn = document.documentElement.dataset.siteEffects === "on";
  document.querySelectorAll<HTMLElement>("[data-fx-on]").forEach(element => {
    for (const name of (element.dataset.fxOn ?? "").split(/\s+/).filter(Boolean)) element.classList.toggle(`fx-${name}`, isOn);
  });
};
syncEffects();
new MutationObserver(syncEffects).observe(document.documentElement, { attributes: true, attributeFilter: ["data-site-effects"] });
