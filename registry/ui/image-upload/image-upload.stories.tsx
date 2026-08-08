import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Image } from "griddy-icons";

import {
  resolveThemePair,
  toStyleObject,
  THEME_ZERO,
  ZERO_AUTHORED,
  type ThemeSeed,
} from "@bydiorama/tokens";

import { AspectRatio } from "@/ui/aspect-ratio/aspect-ratio.tsx";
import { Button } from "@/ui/button/button.tsx";
import { Thumbnail } from "@/ui/thumbnail/thumbnail.tsx";
import { ImageUpload } from "./image-upload.tsx";

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

const CONSTRAINTS = "PNG or JPG · max 10 MB · at least 800px wide";

const meta = {
  title: "UI/ImageUpload",
  component: ImageUpload,
  parameters: { layout: "padded" },
  args: { label: "Cover image", helperText: CONSTRAINTS, onSelect: fn() },
} satisfies Meta<typeof ImageUpload>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <div className="max-w-dialog-md">
      <ImageUpload {...args} />
    </div>
  ),
};

const Section = ({ title, caption, children }: { title: string; caption: string; children: React.ReactNode }) => (
  <div className="flex flex-col items-start gap-sm">
    <p className="text-title-lg font-display font-medium leading-normal tracking-tight text-ink-primary">
      {title}
    </p>
    <p className="pb-xs text-body-sm font-body font-medium leading-normal text-ink-muted">{caption}</p>
    <div className="w-full max-w-dialog-md">{children}</div>
  </div>
);

/**
 * The sheet's six rows, in its order.
 *
 * Drag-over is the one row a static story cannot reproduce — the component
 * owns that state and it needs a real file over the target — so it is
 * asserted in the browser test instead, by dispatching a dragover.
 */
export const Matrix: Story = {
  render: () => (
    <div className="flex flex-col gap-2xl">
      <Section title="Image Upload" caption="Empty — the drop target at rest">
        <ImageUpload label="Cover image" helperText={CONSTRAINTS} onSelect={fn()} />
      </Section>

      <Section title="Image Upload In Progress" caption="Uploading — determinate, cancellable">
        <div className="flex flex-col gap-sm">
          <ImageUpload
            label="Cover image"
            status="busy"
            busyText="Uploading the image"
            onSelect={fn()}
          />
          <ImageUpload.File
            name="hero-cover.jpg"
            value={62}
            detail="1.4 MB of 2.2 MB"
            icon={<Image />}
            onCancel={fn()}
            cancelLabel="Cancel upload of hero-cover.jpg"
          />
        </div>
      </Section>

      <Section title="Image Upload Attached" caption="Attached — one image, replaceable">
        <ImageUpload
          label="Cover image"
          status="attached"
          helperText="hero-cover.jpg · 2.2 MB · 1600 × 900"
          onSelect={fn()}
          preview={
            <AspectRatio ratio="screen">
              <img src={IMAGE} alt="hero-cover.jpg" />
            </AspectRatio>
          }
          actions={
            <>
              <Button variant="outline" size="sm" onClick={fn()}>Replace</Button>
              <Button variant="ghost" size="sm" onClick={fn()}>Remove</Button>
            </>
          }
        />
      </Section>

      <Section title="Image Upload Rejected" caption="Rejected — the file broke a stated constraint">
        <ImageUpload
          label="Cover image"
          helperText={CONSTRAINTS}
          errorText="hero-cover.jpg is 14 MB"
          errorDetail="The limit is 10 MB. Try a smaller file."
          onSelect={fn()}
          actions={<Button variant="outline" size="sm" onClick={fn()}>Choose another file</Button>}
        />
      </Section>

      <Section title="Image Upload Multiple" caption="Multiple — attached set with an add tile">
        <div className="flex flex-col items-start gap-sm">
          <span className="text-label-md font-body font-medium text-ink-secondary">Gallery images</span>
          <ImageUpload.Grid>
            {["Poster.png", "Deck.pdf", "Icon set.png"].map((file) => (
              <Thumbnail
                key={file}
                src={IMAGE}
                alt={file}
                className="size-23"
                onRemove={fn()}
                removeLabel={`Remove ${file}`}
              />
            ))}
            <ImageUpload.Add label="Add images" onClick={fn()} />
          </ImageUpload.Grid>
          <span className="text-caption font-body font-book text-ink-muted">
            3 of 8 attached · drag a tile to reorder
          </span>
        </div>
      </Section>
    </div>
  ),
};

/** Disabled, and a finished row with no bar — neither is drawn in the sheet. */
export const States: Story = {
  render: () => (
    <div className="flex w-full max-w-dialog-md flex-col gap-lg">
      <ImageUpload label="Disabled" helperText={CONSTRAINTS} isDisabled onSelect={fn()} />
      <ImageUpload.File
        name="a-very-long-attachment-name-that-has-to-truncate.jpg"
        detail="2.2 MB · uploaded"
        icon={<Image />}
        onCancel={fn()}
        cancelLabel="Remove a-very-long-attachment-name-that-has-to-truncate.jpg"
      />
      <ImageUpload.File name="no-cancel.jpg" value={20} detail="0.4 MB of 2.2 MB" icon={<Image />} />
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
        <div className="flex flex-col gap-lg">
          <ImageUpload label="Cover image" helperText={CONSTRAINTS} onSelect={fn()} />
          {/* The progress fill is the interesting one: it must stay legible
              against its own track whatever the brand accent is. */}
          <ImageUpload.File name="hero-cover.jpg" value={62} detail="1.4 MB of 2.2 MB" icon={<Image />} />
          <ImageUpload
            label="Rejected"
            errorText="hero-cover.jpg is 14 MB"
            errorDetail="The limit is 10 MB."
            helperText={CONSTRAINTS}
            onSelect={fn()}
          />
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
