/** Typed documentation for SiteHeader (CONVENTIONS §11). */

export const siteHeaderDoc = {
  name: "SiteHeader",
  status: "experimental",
  summary:
    "The SITE header (#33): a wordmark, a short row of quiet links and one call to action, composed from Header — which stays app chrome. Data-driven rather than compound, because every marketing site here is Astro and an .astro file cannot compose Header's parts across the island boundary. Below the caller's collapse point the bar keeps two words, the wordmark and Menu; the menu is a full-screen Sheet from the top.",

  anatomy: [
    { part: "root", slot: "header", notes: "Header, at its own 48px (h-12), px-xl wide and px-lg collapsed. `affix` is ON by default — a site's bar stays reachable — and is Header's own prop, so the affix ground, blur and hairline are Header's. Carries `data-site-header` (the scope of its media query) and, while it sits on the hero, `data-over-media`." },
    { part: "brand", slot: "site-header-brand", notes: "One link to brand.href (default \"/\"). Type-only by default: brand.label at title-sm 16/600 in the bar's ink. With brand.wordmark the artwork is shown, hidden from assistive tech, and brand.label names the link — the organisation, never \"Home\" or \"Logo\". No brand-mark TILE: on a site the mark is the favicon's job (#33, revision 2)." },
    { part: "nav", slot: "header-nav", notes: "Header.Nav, named by navLabel, holding Header.Item variant=\"quiet\" links: label-md 13/600, px-sm, 32px tall, no fill in ANY state. Ink is the only channel — --ui-text-muted at rest, --ui-text-primary on hover and on the current page (2.90:1 apart), aria-current=\"page\" on the current one. Hidden below collapseBelow." },
    { part: "cta", slot: "site-header-cta", notes: "Button primary md (32px) rendered as an <a>. The bar's only filled shape. Below collapseBelow it leaves the bar and reappears, full width at lg, at the menu's foot." },
    { part: "menu button", slot: "site-header-menu", notes: "Header.MenuButton in its TEXT form: the word menuText at label-md, a 44px target, no surface. Its name is menuLabel, which must START with the visible word (SC 2.5.3) — \"Menu, site navigation\", not \"Open navigation\". Present only below collapseBelow: the bar renders the nav OR the menu button, never both." },
    { part: "menu", slot: "site-header-menu-panel", notes: "A Sheet, side=\"top\" — full screen, sliding down. Its first row is the bar again (wordmark, and closeText exactly where menuText was). Then the items at title-lg 24/500 in 44px rows, muted with the current one in primary, then the CTA full-width where a thumb reaches it and an optional menuFooter line in body-sm muted. Focus is trapped, Escape and Close dismiss, the page behind does not scroll — all Sheet's. Following a link closes it." },
    { part: "scrim (over media)", slot: "site-header-scrim", notes: "Only with isOverMedia and scrim (default on): --ui-bg-media at 72% (MEDIA_SCRIM_ALPHA) held for the bar's 48px, then ramped to 0 over 32px more on the perceptual dark ramp. Behind the bar's content, pointer-events none, aria-hidden; fades out as the bar affixes." },
  ],

  composition: `
<SiteHeader
  brand={{ label: "Diorama" }}
  items={[
    { label: "Work", href: "/work" },
    { label: "Studio", href: "/studio", isCurrent: true },
    { label: "Journal", href: "/journal" },
    { label: "Careers", href: "/careers" },
  ]}
  cta={{ label: "Book a call", href: "/contact" }}
  collapseBelow="62rem"
  menuFooter="studio@diorama.example"
/>

// On a hero: put it directly before the first section. The bar pulls that
// section up under itself and paints the media inks until it affixes.
<SiteHeader isOverMedia brand={brand} items={items} cta={cta} />
<section className="relative min-h-[70vh] bg-media">…</section>

// Astro: the desktop bar is plain HTML. Only the collapsed menu needs React,
// so hydrate it on narrow screens only.
<SiteHeader client:media="(width < 62rem)" {...props} />
`,

  props: {
    brand: { type: "{ label: string; href?: string; wordmark?: ReactNode }", required: true, notes: "label is the link's accessible name and, without wordmark, the visible type-only wordmark. href defaults to \"/\". wordmark is decorative artwork (an SVG sized 20px tall)." },
    items: { type: "{ label: string; href: string; isCurrent?: boolean }[]", required: true, notes: "The quiet links. Exactly one isCurrent, or none. Rendered twice — in the bar and in the menu — and only one copy is ever displayed, so assistive tech never meets both." },
    cta: { type: "{ label: string; href: string }", notes: "The one call to action. A link styled as Button primary — it goes somewhere, so it is an <a> (Patterns — Navigation)." },
    collapseBelow: { type: "string", default: '"62rem"', notes: "The collapse point, a px/rem/em length. There is no breakpoint token (#32 is deferred), so it is the caller's — bydiorama.com's 991px is 62rem. Emitted as a range media query in a scoped <style>, so the switch exists in server-rendered HTML before hydration. Anything that is not a plain length is refused (it lands in CSS) and falls back to 62rem with a dev error." },
    isOverMedia: { type: "boolean", default: "false", notes: "The bar sits ON the first section: no fill, the media inks (on-media-muted rest, on-media for hover, current, wordmark and Menu) and the scrim, until the page scrolls under it — then affix takes over and it is the ordinary pinned bar. It pulls the next section up by its own 48px (-mb-12), so place it immediately before the hero." },
    scrim: { type: "boolean", default: "true", notes: "The over-media scrim. Off only for a hero that is guaranteed dark: without it the inks are measured against nothing." },
    affix: { type: "boolean | { fade?: boolean }", default: "true", notes: "Header's affix, on by default here. { fade: true } is Header's fade variant." },
    navLabel: { type: "string", default: '"Site"', notes: "Names the navigation landmark (in the bar and in the menu) and the menu dialog." },
    menuText: { type: "string", default: '"Menu"', notes: "The visible word on the collapsed bar's control." },
    menuLabel: { type: "string", default: '"Menu, site navigation"', notes: "The control's accessible name. Must start with menuText (SC 2.5.3, label in name) — a dev error says so if it does not." },
    closeText: { type: "string", default: '"Close"', notes: "The visible word on the same control inside the open menu." },
    closeLabel: { type: "string", default: '"Close, site navigation"', notes: "Its accessible name; must start with closeText." },
    menuFooter: { type: "ReactNode", notes: "A line under the CTA in the open menu — a contact address. body-sm, muted." },
  },

  do: [
    "Use it for a marketing or editorial site. An app's top bar is Header, composed — it has an account menu, a brand switcher and a Sidebar the menu opens; this has none of those.",
    "Give exactly one item isCurrent on pages that are in the nav, and none on pages that are not.",
    "Set collapseBelow to the width at which the row of items and the CTA stops fitting beside the wordmark with room to spare — measure the longest locale.",
    "Place an over-media header directly before the hero, and give the hero its own height: the bar overlaps the top 48px of it.",
  ],

  dont: [
    "Do not add a second filled button. The CTA is the bar's only shape; a second one makes neither the call to action.",
    "Do not pass a brand-mark tile as the wordmark. A site's mark belongs in the favicon; the bar carries the name.",
    "Do not rename the menu control to an icon. The text control is the design: a glyph on a chrome square is the app bar's, and would be the only boxed shape besides the CTA.",
    "Do not turn the scrim off over photography you do not control. It is what the over-media contrast is measured against.",
    "Do not reach for Header.Item variant=\"quiet\" in an app bar to make it 'calmer'. The quiet item's rest ink is muted, which is the app bar's CURRENT-page ink — mixing the two variants in one bar inverts what current means.",
  ],

  a11y: {
    role: "banner (Header's <header>), containing a navigation landmark named navLabel. Below the collapse point the menu is a modal dialog (Sheet) named navLabel, holding a second navigation landmark with the same name — only one of the two is ever displayed.",
    name: "The wordmark link from brand.label; the nav and the dialog from navLabel; the menu control from menuLabel/closeLabel, each starting with its visible word.",
    keyboard: [
      { key: "Tab", does: "Wordmark, then the items, then the CTA — or, collapsed, wordmark then Menu." },
      { key: "Enter / Space", does: "On Menu, opens the menu with focus inside it (Sheet). Enter follows a link." },
      { key: "Escape", does: "Closes the menu and returns focus to Menu (Sheet)." },
    ],
    target: "Quiet items are 32px tall, the CTA 32px, the menu control and the menu rows 44px — every target clears SC 2.5.8's 24px, and the two touch-only controls clear 2.5.5's 44px.",
    contrastPairs: [
      { fg: "--ui-text-muted", bg: "--ui-bg-base", floor: "text", role: "a quiet item at REST on the page ground, and the menu's rows. 5.93:1 light, 4.94:1 dark" },
      { fg: "--ui-text-primary", bg: "--ui-bg-base", floor: "text", role: "the wordmark, Menu/Close, and a quiet item hovered or current — 2.90:1 above the rest ink, which is what makes the current page legible as current" },
      { fg: "--ui-text-secondary", bg: "--ui-bg-affix-floor", floor: "text", role: "a quiet item at rest while the bar is AFFIXED. It steps up from muted because muted measures 3.66:1 on this ground in dark, the same conformance step the default item's current page takes" },
      { fg: "--ui-text-primary", bg: "--ui-bg-affix-floor", floor: "text", role: "the wordmark, Menu and the current item while affixed" },
      { fg: "--ui-text-on-media-muted", bg: "--ui-bg-media-floor", floor: "text", role: "a quiet item at rest OVER MEDIA, measured against the scrim over a white photograph — the bar's worst case, and why the scrim is 72% rather than the sheet's 64%" },
      { fg: "--ui-text-on-media", bg: "--ui-bg-media-floor", floor: "text", role: "the wordmark, Menu and a hovered or current item over media" },
      { fg: "--ui-text-on-accent", bg: "--ui-bg-accent", floor: "text", role: "the CTA's label, in the bar and in the menu — the accent fill does not depend on the ground under it" },
    ],
  },

  needsDesign: [
    "Current page over media: on-media is only 1.33:1 from the on-media-muted rest ink (2.90:1 on the page). aria-current carries it for assistive tech; visually it is the sheet's open choice — accept it, or add a 1.5px on-media underline to the current item over media only. Shipped as accepted (no underline) until decided.",
  ],

  knownGaps: [
    "The collapse point is a prop, not a token: there is no breakpoint scale yet (#32 is deferred). When #32 adds one, collapseBelow should accept its names.",
    "Shipped under registry/ui as a ui item, not registry/blocks as the #33 sheet drew it: every gate (utilities, contrast, motion, controls, visual coverage) scans registry/ui, and a block outside it would ship ungated. It is still a separate item from Header, which was the decision that mattered.",
    "Items are flat. A site nav with a dropdown (Header.Item's trailing chevron + Menu) is not designed for the site bar.",
    "The scrim is 72% (MEDIA_SCRIM_ALPHA), not the sheet's 64%: 64% was the lowest alpha that passed for the full on-media ink, and the system has one measured media scrim. A darker hero shows no difference; a white one gains contrast.",
  ],

  motion:
    "Quiet items transition `color` at --ui-duration-fast (Header.Item's own motionMicro); the affix change is Header's (background and shadow at motionStandard); the scrim fades its opacity with the same token as the bar affixes, so the two cross over rather than snap. The menu slides down from the top with Sheet's motionStandard translate and fades; reduced motion removes the travel (Sheet's).",

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/8-0/3QL1-0",
} as const;

export type SiteHeaderDoc = typeof siteHeaderDoc;
