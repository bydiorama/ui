import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import {
  resolveThemePair,
  toStyleObject,
  THEME_ZERO,
  ZERO_AUTHORED,
  type ThemeSeed,
} from "@bydiorama/tokens";

import { Badge } from "@/ui/badge/badge.tsx";
import { Button } from "@/ui/button/button.tsx";
import { ImageOverlay } from "./image-overlay.tsx";

/** A gradient as a data URI — no network, and a real <img>. */
const DARK_IMAGE =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" preserveAspectRatio="none">
      <defs><linearGradient id="g" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0" stop-color="#a5aaf6"/><stop offset="0.5" stop-color="#e0a473"/>
        <stop offset="1" stop-color="#5b5ca8"/>
      </linearGradient></defs>
      <rect width="64" height="64" fill="url(#g)"/>
    </svg>`,
  );

/**
 * The picture the veil's guarantee is stated against: a white one.
 *
 * The sheet's own image is a mid-tone gradient, which is the comfortable case
 * — a caption looks fine over it at almost any scrim strength. This is the
 * case that decides whether the strength is right, and it belongs in Storybook
 * for the same reason Button's icon row does: a gate with nothing to look at
 * is not evidence.
 */
const WHITE_IMAGE =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 4"><rect width="4" height="4" fill="#ffffff"/></svg>`,
  );

const meta = {
  title: "UI/ImageOverlay",
  component: ImageOverlay,
  parameters: { layout: "padded" },
  // `src` and `alt` are required, so they live here — a render-only story
  // supplies its own overlays and has no args of its own to give.
  args: { src: DARK_IMAGE, alt: "Abstract gradient" },
} satisfies Meta<typeof ImageOverlay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  args: {
    src: DARK_IMAGE,
    alt: "Abstract gradient",
    ratio: "square",
    variant: "scrim",
    children: (
      <>
        <Badge variant="success">Approved</Badge>
        <ImageOverlay.Title>Abstract background</ImageOverlay.Title>
        <ImageOverlay.Description>Photo Library</ImageOverlay.Description>
      </>
    ),
  },
  render: (args) => (
    <div className="w-64">
      <ImageOverlay {...args} />
    </div>
  ),
};

/** The sheet's two rows, in its order and its layout. */
export const Matrix: Story = {
  render: () => (
    <div className="flex flex-col gap-xl">
      <div className="flex flex-col items-start gap-sm">
        <p className="text-title-lg font-display font-medium leading-normal tracking-tight text-ink-primary">
          Image Overlay Scrim
        </p>
        <p className="text-body-sm font-body font-medium leading-normal text-ink-muted">Scrim</p>
        <div className="w-64">
          <ImageOverlay src={DARK_IMAGE} alt="Abstract gradient">
            <Badge variant="success">Approved</Badge>
            <ImageOverlay.Title>Abstract background</ImageOverlay.Title>
            <ImageOverlay.Description>Photo Library</ImageOverlay.Description>
          </ImageOverlay>
        </div>
      </div>
      <div className="flex flex-col items-start gap-sm">
        <p className="text-title-lg font-display font-medium leading-normal tracking-tight text-ink-primary">
          Image Overlay Full
        </p>
        <p className="text-body-sm font-body font-medium leading-normal text-ink-muted">Full</p>
        <div className="w-64">
          <ImageOverlay src={DARK_IMAGE} alt="Abstract gradient" variant="full">
            <Button size="md" shape="full" onClick={fn()}>
              Download
            </Button>
          </ImageOverlay>
        </div>
      </div>
    </div>
  ),
};

/**
 * The cases the sheet does not draw: every ratio, and the white picture the
 * veil's AA guarantee is stated against.
 */
export const States: Story = {
  render: () => (
    <div className="flex flex-col gap-xl">
      <div className="flex flex-wrap items-start gap-md">
        {(["story", "portrait", "landscape", "card", "screen"] as const).map((ratio) => (
          <div key={ratio} className="w-36">
            <ImageOverlay src={DARK_IMAGE} alt="" ratio={ratio}>
              <ImageOverlay.Title>{ratio}</ImageOverlay.Title>
              <ImageOverlay.Description>Photo Library</ImageOverlay.Description>
            </ImageOverlay>
          </div>
        ))}
      </div>
      <div className="flex items-start gap-md">
        <div className="w-48">
          <p className="pb-sm text-caption text-ink-muted">the worst picture — pure white</p>
          <ImageOverlay src={WHITE_IMAGE} alt="">
            <ImageOverlay.Title>Abstract background</ImageOverlay.Title>
            <ImageOverlay.Description>Photo Library</ImageOverlay.Description>
          </ImageOverlay>
        </div>
        <div className="w-48">
          <p className="pb-sm text-caption text-ink-muted">full, over white</p>
          <ImageOverlay src={WHITE_IMAGE} alt="" variant="full">
            <Button size="md" shape="full" onClick={fn()}>
              Download
            </Button>
          </ImageOverlay>
        </div>
      </div>
    </div>
  ),
};

const STRESS_BRAND: ThemeSeed = {
  colors: {
    bg: "#fffdf5",
    surface: "#ffffff",
    muted: "#f4ecd8",
    textPrimary: "#1a1400",
    textMuted: "#6b5d3f",
    border: "rgba(26, 20, 0, 0.12)",
    accent: "#ffe066",
  },
};

/**
 * Theme zero beside a hostile brand seed (AGENTS.md).
 *
 * The interesting claim here is that the veil does NOT follow the brand into
 * pale yellow: a scrim derived from an accent would go light and take the
 * caption's legibility with it.
 */
export const BrandThemed: Story = {
  render: () => {
    const zero = toStyleObject(resolveThemePair(THEME_ZERO, { authored: ZERO_AUTHORED }));
    const brand = toStyleObject(resolveThemePair(STRESS_BRAND));
    const Panel = ({ style, title }: { style: React.CSSProperties; title: string }) => (
      <div style={style} className="flex-1 rounded-lg bg-base p-xl">
        <p className="pb-md text-caption text-ink-muted">{title}</p>
        <div className="flex items-start gap-md">
          <div className="w-36">
            <ImageOverlay src={WHITE_IMAGE} alt="">
              <ImageOverlay.Title>Abstract background</ImageOverlay.Title>
              <ImageOverlay.Description>Photo Library</ImageOverlay.Description>
            </ImageOverlay>
          </div>
          <div className="w-36">
            <ImageOverlay src={DARK_IMAGE} alt="" variant="full">
              <Button size="md" shape="full" onClick={fn()}>
                Download
              </Button>
            </ImageOverlay>
          </div>
        </div>
      </div>
    );
    return (
      <div className="flex gap-xl">
        <Panel style={zero as React.CSSProperties} title="theme zero" />
        <Panel style={brand as React.CSSProperties} title="stress brand — pale yellow accent" />
      </div>
    );
  },
};
