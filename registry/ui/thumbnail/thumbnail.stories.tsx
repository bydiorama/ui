import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import {
  resolveThemePair,
  toStyleObject,
  THEME_ZERO,
  ZERO_AUTHORED,
  type ThemeSeed,
} from "@bydiorama/tokens";

import { Thumbnail } from "./thumbnail.tsx";

/** A gradient as a data URI — no network, and a real <img>. */
const IMAGE =
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
 * A path that will not resolve — NOT an empty string.
 *
 * React warns on `src=""` ("may cause the browser to download the whole page
 * again"), and the storybook setup turns a console.error into a thrown test.
 * A missing file is also the more honest fixture: it renders what a real
 * failed attachment renders, which is the well and the alt text.
 */
const MISSING = "/no-such-attachment.png";

const FILES = ["Brand guidelines.pdf", "Business cards.png", "Email signature.png"];

const meta = {
  title: "UI/Thumbnail",
  component: Thumbnail,
  parameters: { layout: "padded" },
  // `src` and `alt` are required, so they live here — a render-only story
  // supplies its own tiles and has no args of its own to give.
  args: { src: IMAGE, alt: FILES[0]! },
} satisfies Meta<typeof Thumbnail>;

export default meta;
type Story = StoryObj<typeof meta>;

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center gap-lg py-sm">
    <span className="w-52 shrink-0 text-caption text-ink-muted">{label}</span>
    <div className="flex flex-wrap items-center gap-lg">{children}</div>
  </div>
);

export const Playground: Story = {
  args: {
    src: IMAGE,
    alt: "Brand guidelines.pdf",
    onRemove: fn(),
    removeLabel: "Remove Brand guidelines.pdf",
  },
};

/**
 * The sheet's five rows, in its order.
 *
 * The two hover rows are drawn as static states in Paper, which a live
 * Storybook cannot reproduce without a pointer — so they appear here as the
 * resting layouts they animate FROM, and the browser test asserts the
 * transition itself.
 */
export const Matrix: Story = {
  render: () => (
    <div>
      <Row label="Default">
        <Thumbnail src={IMAGE} alt={FILES[0]!} />
      </Row>
      <Row label="Close on hover">
        <Thumbnail
          src={IMAGE}
          alt={FILES[0]!}
          onRemove={fn()}
          removeLabel={`Remove ${FILES[0]}`}
        />
      </Row>
      <Row label="Group — row, grid or gallery">
        <Thumbnail.Group>
          {FILES.map((file) => (
            <Thumbnail key={file} src={IMAGE} alt={file} onRemove={fn()} removeLabel={`Remove ${file}`} />
          ))}
        </Thumbnail.Group>
      </Row>
      <Row label="Group stacked">
        <Thumbnail.Group isStacked>
          {FILES.map((file) => (
            <Thumbnail key={file} src={IMAGE} alt={file} onRemove={fn()} removeLabel={`Remove ${file}`} />
          ))}
        </Thumbnail.Group>
      </Row>
      <Row label="Group stacked — hover to spread">
        <Thumbnail.Group isStacked max={3} overflowLabel="4 more attachments">
          {[...FILES, "Poster.png", "Deck.pdf", "Icon set.zip", "Logo.svg"].map((file) => (
            <Thumbnail key={file} src={IMAGE} alt={file} onRemove={fn()} removeLabel={`Remove ${file}`} />
          ))}
        </Thumbnail.Group>
      </Row>
    </div>
  ),
};

/**
 * The states the sheet does not draw, and the one it draws wrongly.
 *
 * The remove control is drawn hover-only; it is revealed on focus too, so tab
 * into this story and the control appears while it holds focus.
 */
export const States: Story = {
  render: () => (
    <div>
      <Row label="no remove control">
        <Thumbnail src={IMAGE} alt={FILES[0]!} />
      </Row>
      <Row label="loading">
        <Thumbnail src={IMAGE} alt="Brand guidelines.pdf" isLoading />
        <Thumbnail.Group>
          {FILES.map((file, i) => (
            <Thumbnail key={file} src={IMAGE} alt={file} isLoading={i > 0} />
          ))}
        </Thumbnail.Group>
      </Row>
      <Row label="broken src — degrades to alt text">
        <Thumbnail src="/does-not-exist.png" alt="Brand guidelines" />
      </Row>
      <Row label="overflow counter">
        <Thumbnail.Group max={2} overflowLabel="3 more attachments">
          {[...FILES, "Poster.png", "Deck.pdf"].map((file) => (
            <Thumbnail key={file} src={IMAGE} alt={file} />
          ))}
        </Thumbnail.Group>
      </Row>
      <Row label="tab in — the control appears on focus">
        <Thumbnail.Group>
          {FILES.slice(0, 2).map((file) => (
            <Thumbnail key={file} src={IMAGE} alt={file} onRemove={fn()} removeLabel={`Remove ${file}`} />
          ))}
        </Thumbnail.Group>
      </Row>
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

export const BrandThemed: Story = {
  render: () => {
    const zero = toStyleObject(resolveThemePair(THEME_ZERO, { authored: ZERO_AUTHORED }));
    const brand = toStyleObject(resolveThemePair(STRESS_BRAND));
    const Panel = ({ style, title }: { style: React.CSSProperties; title: string }) => (
      <div style={style} className="flex-1 rounded-lg bg-base p-xl">
        <p className="pb-md text-caption text-ink-muted">{title}</p>
        <div className="flex flex-col items-start gap-lg">
          <Thumbnail src={IMAGE} alt={FILES[0]!} onRemove={fn()} removeLabel={`Remove ${FILES[0]}`} />
          {/* No picture, so the well and the hairline are what is on show —
              the two themed values this component actually carries. */}
          <Thumbnail.Group max={2} overflowLabel="2 more attachments">
            {[...FILES, "Poster.png"].map((file) => (
              <Thumbnail key={file} src={MISSING} alt={file} />
            ))}
          </Thumbnail.Group>
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
