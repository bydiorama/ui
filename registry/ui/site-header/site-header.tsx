"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "@/lib/cn";
import { FADE_RAMP_DARK } from "@/lib/fade-ramp";
import { useIsStuck } from "@/hooks/use-is-stuck";
import { motionMicro, motionStandard } from "@/lib/motion";
import { Button } from "@/ui/button";
import { Header } from "@/ui/header";
import { Sheet } from "@/ui/sheet";

export interface SiteHeaderBrand {
  /**
   * The organisation's name. It is the link's accessible name — never "Home"
   * or "Logo" — and, without a `wordmark`, the visible type-only wordmark.
   */
  label: string;
  /** Where the wordmark goes. Defaults to "/". */
  href?: string;
  /**
   * The caller's wordmark artwork (an SVG). Decorative: `label` names the
   * link, so the artwork is hidden from assistive tech. No brand-mark TILE —
   * on a site the mark is the favicon's job (#33).
   */
  wordmark?: ReactNode;
}

export interface SiteHeaderItem {
  label: string;
  href: string;
  /** The page you are on. Exactly one item, or none. */
  isCurrent?: boolean;
}

export interface SiteHeaderCta {
  label: string;
  href: string;
}

export interface SiteHeaderProps extends Omit<HTMLAttributes<HTMLElement>, "children" | "title"> {
  brand: SiteHeaderBrand;
  items: SiteHeaderItem[];
  /**
   * The bar's one filled shape: Button primary md rendered as a link. Below
   * `collapseBelow` it leaves the bar for the menu's foot, full width.
   */
  cta?: SiteHeaderCta;
  /**
   * Where the bar collapses to wordmark + "Menu" — a CSS length (`62rem`,
   * `991px`). There is no breakpoint token yet (#32 is deferred), so the
   * point is the caller's. Emitted as a plain media query in a scoped
   * <style>, so the switch happens in static HTML before any hydration.
   */
  collapseBelow?: string;
  /**
   * The bar sits ON the first section — no fill, the media inks, a scrim —
   * until the page scrolls under it; then `affix` takes over and it is the
   * ordinary pinned bar. Put the header directly before the hero: it pulls
   * the hero up under itself by its own 48px.
   */
  isOverMedia?: boolean;
  /**
   * The over-media scrim: --ui-bg-media at 72% (the system's media scrim
   * alpha) held for the bar's 48px, then ramped to 0 over 32px more. It is
   * what keeps the inks legible over a white photograph — the bar is measured
   * against --ui-bg-media-floor, which is exactly that. Turn it off only for a
   * hero that is guaranteed dark.
   */
  scrim?: boolean;
  /** Pins the bar (Header's `affix`). On by default for a site. */
  affix?: boolean | { fade?: boolean };
  /** Names the navigation landmark and the menu dialog. */
  navLabel?: string;
  /** The collapsed bar's visible control. */
  menuText?: string;
  /** Its accessible name — must START with `menuText` (SC 2.5.3). */
  menuLabel?: string;
  /** The same control inside the open menu. */
  closeText?: string;
  /** Its accessible name — must start with `closeText`. */
  closeLabel?: string;
  /** A line under the CTA in the open menu — a contact address, say. */
  menuFooter?: ReactNode;
}

/** A CSS length and nothing else — the value lands inside a <style>. */
const LENGTH = /^\d+(?:\.\d+)?(?:px|rem|em)$/;

/**
 * The scrim: --ui-bg-media at 72% held for the bar's 48px, then a 32px tail.
 *
 * 72%, not the sheet's 64%. 64% was the lowest alpha that passed (4.66:1 over
 * a white photograph); 72% is MEDIA_SCRIM_ALPHA, the system's one media scrim
 * (ImageOverlay's), and --ui-bg-media-floor is DEFINED as it over white — so
 * check:contrast measures this bar's worst case instead of trusting a number
 * on a sheet. A second scrim alpha would be a second, unmeasured floor.
 *
 * The tail is on the system's perceptual ramp rather than a linear one (the
 * Fade refactor): a straight drop reads as a band with an edge. FADE_RAMP_DARK
 * because what is painted is dark ink — media does not flip — and that table
 * was solved for a dark paint. Scaled to the peak.
 */
const SCRIM_PEAK = 0.72;
const SCRIM_HOLD = 48;
const SCRIM_TAIL = 32;
const SCRIM = `linear-gradient(to bottom, ${[
  `color-mix(in srgb, var(--ui-bg-media) ${SCRIM_PEAK * 100}%, transparent) 0px`,
  ...FADE_RAMP_DARK.map((alpha, i, ramp) => {
    const t = i / (ramp.length - 1);
    const at = SCRIM_HOLD + t * SCRIM_TAIL;
    const pct = Math.round((1 - alpha) * SCRIM_PEAK * 1000) / 10;
    return `color-mix(in srgb, var(--ui-bg-media) ${pct}%, transparent) ${Math.round(at * 10) / 10}px`;
  }),
].join(", ")})`;

/**
 * The SITE header (#33): a wordmark, a short row of quiet links and one call
 * to action — not the app bar. Header stays app chrome; this composes it.
 *
 * DATA-DRIVEN, not compound. Every marketing site here is Astro, and an
 * .astro file cannot compose Header's parts across the island boundary
 * (diorama-static-rendering), so the bar takes its content as props.
 *
 * Two layouts, switched by CSS at `collapseBelow` rather than by a hook: the
 * bar renders the nav OR the menu button, never both (Patterns — Navigation).
 * Above the point it is static-safe HTML — links and a link CTA. Below it the
 * menu is a full-screen Sheet from the top, the one part that needs
 * hydration.
 */
export const SiteHeader = forwardRef<HTMLElement, SiteHeaderProps>(function SiteHeader(
  {
    brand,
    items,
    cta,
    collapseBelow = "62rem",
    isOverMedia = false,
    scrim = true,
    affix = true,
    navLabel = "Site",
    menuText = "Menu",
    menuLabel = "Menu, site navigation",
    closeText = "Close",
    closeLabel = "Close, site navigation",
    menuFooter,
    className,
    ...rest
  },
  ref,
) {
  const scope = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [node, setNode] = useState<HTMLElement | null>(null);

  const attachRef = useCallback(
    (el: HTMLElement | null) => {
      setNode(el);
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    },
    [ref],
  );

  // Header observes the same thing for its own `data-affixed`; this second
  // observer is what ends the over-media state at the same moment.
  const isAffixed = useIsStuck(isOverMedia && affix ? node : null);
  const isOnMedia = isOverMedia && !isAffixed;

  const breakpoint = LENGTH.test(collapseBelow) ? collapseBelow : "62rem";
  const isLabelInName = menuLabel.startsWith(menuText) && closeLabel.startsWith(closeText);
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (breakpoint !== collapseBelow) {
      console.error(`SiteHeader: collapseBelow="${collapseBelow}" is not a px, rem or em length; using 62rem.`);
    }
    if (!isLabelInName) {
      console.error("SiteHeader: menuLabel and closeLabel must START with menuText and closeText (WCAG 2.5.3, label in name).");
    }
  }, [breakpoint, collapseBelow, isLabelInName]);

  // A menu left open while the window widens past the point would leave a
  // full-screen dialog over a bar that no longer offers it.
  useEffect(() => {
    if (!isOpen) return;
    const wide = window.matchMedia(`(width >= ${breakpoint})`);
    const close = () => wide.matches && setIsOpen(false);
    close();
    wide.addEventListener("change", close);
    return () => wide.removeEventListener("change", close);
  }, [isOpen, breakpoint]);

  // Unlayered, so it outranks the (layered) utilities it switches off — and
  // `display:none` takes the hidden half out of the accessibility tree too.
  // Range syntax, so the two halves meet at the point without a 1px overlap.
  // Quoted selector: useId's output is not a valid bare identifier.
  const root = `[data-site-header="${scope}"]`;
  const css =
    `@media (width >= ${breakpoint}){${root} [data-slot="site-header-menu"]{display:none}}` +
    `@media (width < ${breakpoint}){${root}{padding-inline:var(--ui-space-lg)}` +
    `${root} [data-slot="header-nav"],${root} [data-slot="site-header-cta"]{display:none}}`;

  const wordmark = (
    <a
      href={brand.href ?? "/"}
      data-slot="site-header-brand"
      aria-label={brand.wordmark ? brand.label : undefined}
      className={cn(
        "inline-flex min-h-8 shrink-0 items-center rounded-sm",
        "text-title-sm font-body text-current no-underline",
        "[&_svg]:h-5 [&_svg]:w-auto",
        "focus-visible:shadow-(--ui-focus-ring) focus-visible:forced-colors:outline focus-visible:forced-colors:outline-focus focus-visible:outline-none",
      )}
    >
      {brand.wordmark ? <span aria-hidden="true" className="contents">{brand.wordmark}</span> : brand.label}
    </a>
  );

  return (
    <Sheet isOpen={isOpen} onOpenChange={setIsOpen}>
      <style>{css}</style>
      <Header
        ref={attachRef}
        affix={affix}
        data-site-header={scope}
        data-over-media={isOnMedia || undefined}
        className={cn(
          "gap-sm px-xl",
          // ON THE HERO: no fill, the media inks, and the hero pulled up under
          // the bar by the bar's own height. `sticky` (from affix) and
          // `relative` are both positions, so only one may be written.
          isOverMedia && "-mb-12",
          isOverMedia && !affix && "relative z-(--ui-z-sticky)",
          "data-[over-media]:bg-transparent data-[over-media]:text-ink-on-media",
          className,
        )}
        {...rest}
      >
        {isOverMedia && scrim && (
          <div
            aria-hidden="true"
            data-slot="site-header-scrim"
            style={{ backgroundImage: SCRIM }}
            className={cn(
              // Behind the bar's content, inside its stacking context.
              "pointer-events-none absolute inset-x-0 top-0 z-(--ui-z-below) h-20",
              "transition-opacity", motionStandard,
              isOnMedia ? "opacity-100" : "opacity-0",
            )}
          />
        )}
        <Header.Start>{wordmark}</Header.Start>
        <Header.Spacer />
        <Header.Nav label={navLabel}>
          {items.map((item) => (
            <Header.Item
              key={item.href}
              variant="quiet"
              href={item.href}
              isCurrent={item.isCurrent ?? false}
            >
              {item.label}
            </Header.Item>
          ))}
        </Header.Nav>
        <Header.End>
          {cta && (
            <Button
              data-slot="site-header-cta"
              variant="primary"
              size="md"
              render={<a href={cta.href} />}
            >
              {cta.label}
            </Button>
          )}
          <Sheet.Trigger
            render={
              <Header.MenuButton data-slot="site-header-menu" label={menuLabel} className="-me-sm">
                {menuText}
              </Header.MenuButton>
            }
          />
        </Header.End>
      </Header>

      <Sheet.Panel side="top" label={navLabel}>
        <div data-slot="site-header-menu-panel" className="flex min-h-full flex-col">
          {/* The bar again, so "Close" sits exactly where "Menu" was. */}
          <div className="flex h-12 shrink-0 items-center justify-between px-lg text-ink-primary">
            {wordmark}
            <Sheet.Close
              render={
                <Header.MenuButton label={closeLabel} className="-me-sm">
                  {closeText}
                </Header.MenuButton>
              }
            />
          </div>
          <nav aria-label={navLabel} className="flex-1 px-lg pt-xl">
            <ul className="flex list-none flex-col p-0">
              {items.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    aria-current={item.isCurrent ? "page" : undefined}
                    data-slot="site-header-menu-item"
                    data-current={item.isCurrent || undefined}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex min-h-11 items-center rounded-sm no-underline",
                      "text-title-lg font-body",
                      "text-ink-muted hover:text-ink-primary data-[current]:text-ink-primary",
                      "transition-[color]", motionMicro,
                      "focus-visible:shadow-(--ui-focus-ring) focus-visible:forced-colors:outline focus-visible:forced-colors:outline-focus focus-visible:outline-none",
                    )}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          {(cta || menuFooter) && (
            // Where a thumb reaches it.
            <div className="flex shrink-0 flex-col items-center gap-md px-lg pt-xl pb-2xl">
              {cta && (
                <Button
                  variant="primary"
                  size="lg"
                  isFullWidth
                  render={<a href={cta.href} />}
                  onClick={() => setIsOpen(false)}
                >
                  {cta.label}
                </Button>
              )}
              {menuFooter && <div className="text-body-sm font-body text-ink-muted">{menuFooter}</div>}
            </div>
          )}
        </div>
      </Sheet.Panel>
    </Sheet>
  );
});
