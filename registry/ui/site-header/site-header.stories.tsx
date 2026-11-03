import type { Meta, StoryObj } from "@storybook/react-vite";

import { SiteHeader, type SiteHeaderItem } from "./site-header.tsx";

/*
 * Fragment hrefs, not paths: these are REAL links, so a path would navigate
 * Storybook away from the story demonstrating them.
 */
const ITEMS: SiteHeaderItem[] = [
  { label: "Work", href: "#work" },
  { label: "Studio", href: "#studio", isCurrent: true },
  { label: "Journal", href: "#journal" },
  { label: "Careers", href: "#careers" },
];

const meta = {
  title: "UI/SiteHeader",
  component: SiteHeader,
  parameters: { layout: "fullscreen" },
  args: {
    brand: { label: "Diorama", href: "#top" },
    items: ITEMS,
    cta: { label: "Book a call", href: "#contact" },
    menuFooter: "studio@diorama.example",
  },
} satisfies Meta<typeof SiteHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Prose under the bar so the affix state has something to scroll under. */
const Page = () => (
  <main className="mx-auto flex max-w-dialog-lg flex-col gap-lg px-xl py-2xl">
    {Array.from({ length: 8 }, (_, i) => (
      <p key={i} className="text-body-md font-body text-ink-secondary">
        Josef Müller-Brockmann set the grid as a system of proportions rather than a cage — a field of
        modules in which type, image and space each take a measured share, and the page reads as one
        decision instead of many.
      </p>
    ))}
  </main>
);

/**
 * The bar above its collapse point: wordmark, quiet links, one filled CTA.
 * Scroll to watch it affix — Header's ground, blur and hairline.
 */
export const Playground: Story = {
  render: (args) => (
    <div className="min-h-[200vh] bg-base">
      <SiteHeader {...args} collapseBelow="40rem" />
      <Page />
    </div>
  ),
};

/**
 * Collapsed: the wordmark and the word Menu, nothing else. The menu is a
 * full-screen Sheet from the top with the CTA at its foot. `collapseBelow`
 * is set past any canvas so the story shows this layout at every width.
 */
export const Collapsed: Story = {
  render: (args) => (
    <div className="bg-base">
      <SiteHeader {...args} collapseBelow="200rem" />
      <Page />
    </div>
  ),
};

/**
 * On a hero: no fill, the media inks, a 72% --ui-bg-media scrim behind the
 * bar. The pale patch is the worst case the scrim exists for — a bright
 * photograph under the items. Scroll and the bar becomes the pinned bar.
 */
export const OverMedia: Story = {
  render: (args) => (
    <div className="min-h-[200vh] bg-base">
      <SiteHeader {...args} isOverMedia collapseBelow="40rem" />
      <section
        className="flex h-[70vh] min-h-96 flex-col justify-end gap-sm bg-media px-xl pb-2xl"
        style={{ backgroundImage: "radial-gradient(60% 50% at 70% 10%, #FFFFFF, transparent)" }}
      >
        <h1 className="text-display-md font-display text-ink-on-media">Grid systems, built to last.</h1>
        <p className="text-body-md font-body text-ink-on-media-muted">After Josef Müller-Brockmann, 1961.</p>
      </section>
      <Page />
    </div>
  ),
};

/** The wordmark as artwork: the SVG is hidden, `brand.label` names the link. */
export const WithWordmark: Story = {
  args: {
    brand: {
      label: "Diorama",
      href: "#top",
      wordmark: (
        <svg viewBox="0 0 88 20" fill="currentColor">
          <rect x="0" y="4" width="12" height="12" rx="2" />
          <rect x="18" y="8" width="70" height="4" rx="2" />
        </svg>
      ),
    },
  },
  render: (args) => (
    <div className="bg-base">
      <SiteHeader {...args} collapseBelow="40rem" />
    </div>
  ),
};
