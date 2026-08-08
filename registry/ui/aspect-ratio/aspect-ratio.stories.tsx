import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  resolveThemePair,
  toStyleObject,
  THEME_ZERO,
  ZERO_AUTHORED,
  type ThemeSeed,
} from "@bydiorama/tokens";

import { AspectRatio, type AspectRatioName } from "./aspect-ratio.tsx";



/**
 * A data URI rather than a file or a URL.
 *
 * Stories run through axe in the `stories` vitest project and the visual
 * project screenshots them; both need the picture to be there, synchronously,
 * with no network. An <img> is also the point — the frame's crop rule only
 * applies to one, so a story that faked the media with a div would be testing
 * a different component.
 *
 * NOT exported. Storybook's CSF indexer treats EVERY named export in a story
 * file as a story, so a shared constant here crashes processCSFFile and the
 * whole file fails to load — with an error that names the indexer and not the
 * export. `check:stories` now refuses a named export that is not typed Story.
 */
const PLACEHOLDER =
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

const meta = {
  title: "UI/AspectRatio",
  component: AspectRatio,
  parameters: { layout: "padded" },
  // Required props live here so a render-only story still type-checks —
  // `children` is required, and a story that supplies its own frames has no
  // args of its own to give.
  args: { children: <img src={PLACEHOLDER} alt="Abstract gradient" /> },
} satisfies Meta<typeof AspectRatio>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A path that will not resolve — NOT an empty string. React warns on `src=""`
 * and the storybook setup turns a console.error into a thrown test; a missing
 * file is also the more honest fixture, since it renders what a real failed
 * image renders.
 */
const MISSING = "/no-such-image.png";

const RATIOS: AspectRatioName[] = ["square", "story", "portrait", "landscape", "card", "screen"];
const CAPTION: Record<AspectRatioName, string> = {
  square: "1:1, square",
  story: "9:16, story",
  portrait: "3:4, portrait",
  landscape: "4:3, landscape",
  card: "1.586:1, card",
  screen: "16:9, screen",
};

export const Playground: Story = {
  args: {
    ratio: "square",
    children: <img src={PLACEHOLDER} alt="Abstract gradient" />,
  },
  render: (args) => (
    <div className="w-64">
      <AspectRatio {...args} />
    </div>
  ),
};

/**
 * The sheet's own layout — one ratio per row, caption above the frame, so a
 * visual diff against the Paper export is like-for-like.
 *
 * Every frame is given the SAME width, which is the one thing the sheet cannot
 * show: it draws six different widths at a shared 256px height, so the six
 * ratios never appear as six heights of one column. That is the comparison
 * that catches a ratio written the wrong way round.
 */
export const Matrix: Story = {
  render: () => (
    <div className="flex flex-col gap-xl">
      {RATIOS.map((ratio) => (
        <div key={ratio} className="flex flex-col items-start gap-sm">
          <p className="text-title-lg font-display font-medium leading-normal tracking-tight text-ink-primary">
            {`Aspect Ratio ${ratio[0]!.toUpperCase()}${ratio.slice(1)}`}
          </p>
          <p className="text-body-sm font-body font-medium leading-normal text-ink-muted">
            {CAPTION[ratio]}
          </p>
          <div className="w-48">
            <AspectRatio ratio={ratio}>
              <img src={PLACEHOLDER} alt="" />
            </AspectRatio>
          </div>
        </div>
      ))}
    </div>
  ),
};

/**
 * The two states the component has that are not a ratio: the well showing
 * through when there is no media, and a caller replacing the ratio through
 * className because their shape is outside the six.
 */
export const States: Story = {
  render: () => (
    <div className="flex items-start gap-lg">
      <div className="flex w-40 flex-col gap-sm">
        <p className="text-caption text-ink-muted">no media — the well</p>
        <AspectRatio ratio="landscape">
          <img src={MISSING} alt="" />
        </AspectRatio>
      </div>
      <div className="flex w-40 flex-col gap-sm">
        <p className="text-caption text-ink-muted">className wins — 21:9</p>
        <AspectRatio ratio="square" className="aspect-[21/9]">
          <img src={PLACEHOLDER} alt="" />
        </AspectRatio>
      </div>
      <div className="flex w-40 flex-col gap-sm">
        <p className="text-caption text-ink-muted">className wins — square radius</p>
        <AspectRatio ratio="landscape" className="rounded-none">
          <img src={PLACEHOLDER} alt="" />
        </AspectRatio>
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
 * The frames themselves carry one themed value — the well — so the case is
 * deliberately shown with NO media: a brand-themed picture would hide the only
 * thing there is to look at.
 */
export const BrandThemed: Story = {
  render: () => {
    const zero = toStyleObject(resolveThemePair(THEME_ZERO, { authored: ZERO_AUTHORED }));
    const brand = toStyleObject(resolveThemePair(STRESS_BRAND));
    const Panel = ({ style, title }: { style: React.CSSProperties; title: string }) => (
      <div style={style} className="flex-1 rounded-lg bg-base p-xl">
        <p className="pb-md text-caption text-ink-muted">{title}</p>
        <div className="flex items-start gap-md">
          <div className="w-24">
            <AspectRatio ratio="square">
              <img src={MISSING} alt="" />
            </AspectRatio>
          </div>
          <div className="w-24">
            <AspectRatio ratio="landscape">
              <img src={PLACEHOLDER} alt="" />
            </AspectRatio>
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
