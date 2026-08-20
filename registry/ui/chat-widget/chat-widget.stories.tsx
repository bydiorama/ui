import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Bookmark, ChevronDown, Copy, Download, Edit, FileText, MoreVertical } from "griddy-icons";

import {
  resolveThemePair,
  toStyleObject,
  THEME_ZERO,
  ZERO_AUTHORED,
  type ThemeSeed,
} from "@bydiorama/tokens";

import { Badge } from "@/ui/badge/badge.tsx";
import { Button } from "@/ui/button/button.tsx";
import { DotPattern } from "@/ui/dot-pattern/dot-pattern.tsx";
import { Progress } from "@/ui/progress/progress.tsx";
import { Thumbnail } from "@/ui/thumbnail/thumbnail.tsx";
import { ChatWidget } from "./chat-widget.tsx";

/** A 1x1 PNG. No network — a story that fetches is a baseline that drifts. */
const TILE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const meta: Meta<typeof ChatWidget> = {
  title: "UI/ChatWidget",
  component: ChatWidget,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof ChatWidget>;

const TextActions = () => (
  <ChatWidget.Actions
    end={
      <>
        <Button variant="ghost" size="md" isIconOnly aria-label="Save artifact" icon={<Bookmark />} onClick={fn()} />
        <Button variant="ghost" size="md" isIconOnly aria-label="More actions" icon={<MoreVertical />} onClick={fn()} />
      </>
    }
  >
    <Button variant="secondary" size="md" icon={<Copy />} onClick={fn()}>
      Copy
    </Button>
    <Button variant="secondary" size="md" icon={<Edit />} onClick={fn()}>
      Edit
    </Button>
  </ChatWidget.Actions>
);

const MediaActions = () => (
  <ChatWidget.Actions
    end={
      <>
        <Button variant="ghost" size="md" isIconOnly aria-label="Save image" icon={<Bookmark />} onClick={fn()} />
        <Button variant="ghost" size="md" isIconOnly aria-label="More actions" icon={<MoreVertical />} onClick={fn()} />
      </>
    }
  >
    <Button variant="secondary" size="md" icon={<Edit />} onClick={fn()}>
      Edit
    </Button>
    <Button variant="secondary" size="md" icon={<Download />} iconEnd={<ChevronDown />} onClick={fn()}>
      Download
    </Button>
  </ChatWidget.Actions>
);

export const Playground: Story = {
  render: () => (
    <div className="max-w-[640px]">
      <ChatWidget>
        <ChatWidget.Header
          name="LinkedIn post — grid systems series"
          icon={<FileText />}
          chip={<Badge>Draft</Badge>}
        />
        <ChatWidget.Body scrollLabel="LinkedIn post draft">
          <p>
            Josef Müller-Brockmann did not design posters. He designed the system a poster has to obey — and then let
            the system do the arguing.
          </p>
          <p>
            Grid Systems in Graphic Design, 1961: strict enough that anyone following it lands somewhere defensible,
            open enough that the good ones land somewhere memorable. Sixty years on, every layout tool still ships his
            column.
          </p>
        </ChatWidget.Body>
        <TextActions />
      </ChatWidget>
    </div>
  ),
};

/**
 * The two families side by side, which is the only way the claim of this
 * component is visible: one container, one bar, two payloads.
 */
export const Matrix: Story = {
  render: () => (
    <div className="flex max-w-[640px] flex-col gap-xl">
      <ChatWidget>
        <ChatWidget.Header
          name="LinkedIn post — grid systems series"
          icon={<FileText />}
          chip={<Badge>Draft</Badge>}
        />
        <ChatWidget.Body scrollLabel="LinkedIn post draft">
          <p>
            Josef Müller-Brockmann did not design posters. He designed the system a poster has to obey — and then let
            the system do the arguing.
          </p>
        </ChatWidget.Body>
        <TextActions />
      </ChatWidget>

      <ChatWidget>
        <ChatWidget.Media ratio="landscape">
          <img src={TILE} alt="Title slide on the brand's deep blue" className="size-full object-cover" />
        </ChatWidget.Media>
        <ChatWidget.Caption>Grounded in brand palette · 2 sources</ChatWidget.Caption>
        <MediaActions />
      </ChatWidget>
    </div>
  ),
};

/**
 * A body past its 320px cap. It scrolls, gains a fade, and — only then —
 * becomes a named region in the tab order. Tab to it and use the arrow keys.
 */
export const LongBody: Story = {
  render: () => (
    <div className="max-w-[640px]">
      <ChatWidget>
        <ChatWidget.Header name="Studio manifesto — long draft" icon={<FileText />} chip={<Badge>Draft</Badge>} />
        <ChatWidget.Body scrollLabel="Studio manifesto draft">
          {Array.from({ length: 8 }, (_, index) => (
            <p key={index}>
              Grid Systems in Graphic Design, 1961: strict enough that anyone following it lands somewhere defensible,
              open enough that the good ones land somewhere memorable. Sixty years on, every layout tool still ships
              his column — and most teams still treat it as decoration.
            </p>
          ))}
        </ChatWidget.Body>
        <TextActions />
      </ChatWidget>
    </div>
  ),
};

/**
 * The stage reserves its final size from the first byte, so generating,
 * loading and failure all happen inside the same frame and the thread never
 * reflows when the image lands. All three are COMPOSITIONS — the caller knows
 * which it has, so the stage takes what it is given.
 */
export const MediaStates: Story = {
  render: () => (
    <div className="grid max-w-[880px] grid-cols-3 gap-lg">
      <ChatWidget>
        <ChatWidget.Media ratio="landscape">
          {/* On bg-sunken, not on the media ground the sheet draws. Progress's
              label is --ui-text-muted — an ink for a light page — and on the
              dark stage it measures under AA, which the story-a11y run caught.
              Recorded in ChatProgress's needsDesign as one question: either
              Progress grows an on-media treatment or this state stays light. */}
          <span className="flex size-full flex-col items-center justify-center gap-sm bg-sunken px-lg">
            <Progress size="sm" label="Generating image 2 of 3" value={42} hasValueText />
          </span>
        </ChatWidget.Media>
        <MediaActions />
      </ChatWidget>

      <ChatWidget>
        <ChatWidget.Media ratio="landscape">
          {/* The reserved frame, marked with the dot grid. border-default
              rather than the default ink: measured on a sunken well the subtle
              role is 1.21:1 and simply is not there. */}
          <span className="relative block size-full bg-sunken">
            <DotPattern className="text-edge-default" />
          </span>
        </ChatWidget.Media>
      </ChatWidget>

      <ChatWidget>
        <ChatWidget.Media ratio="landscape">
          <span className="flex size-full flex-col items-center justify-center gap-xs bg-sunken px-lg text-center">
            <span className="text-body-sm font-body text-ink-muted">Couldn&apos;t generate this image</span>
            <Button variant="ghost" size="sm" onClick={fn()}>
              Retry
            </Button>
          </span>
        </ChatWidget.Media>
      </ChatWidget>
    </div>
  ),
};

/**
 * The carousel, half-built on purpose: the stage takes an overlay and the rail
 * lays the frames out, but which frame is current is state the thread owns.
 */
export const Carousel: Story = {
  render: () => (
    <div className="max-w-[640px]">
      <ChatWidget>
        <ChatWidget.Media
          ratio="portrait"
          overlay={
            <>
              <Button variant="ghost" size="sm" isIconOnly aria-label="Previous frame" icon={<ChevronDown />} onClick={fn()} />
              <Button variant="ghost" size="sm" isIconOnly aria-label="Next frame" icon={<ChevronDown />} onClick={fn()} />
            </>
          }
        >
          <img src={TILE} alt="Frame 1 of 3" className="size-full object-cover" />
        </ChatWidget.Media>
        <ChatWidget.Rail label="Frames">
          {["Frame 1", "Frame 2", "Frame 3"].map((frame) => (
            <li key={frame}>
              <Thumbnail src={TILE} alt={frame} />
            </li>
          ))}
        </ChatWidget.Rail>
        <MediaActions />
      </ChatWidget>
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div className="flex max-w-[640px] flex-col gap-xl">
      <ChatWidget>
        <ChatWidget.Header name="No chip, no icon" />
        <ChatWidget.Body scrollLabel="Short draft">
          <p>A header with nothing but a name.</p>
        </ChatWidget.Body>
      </ChatWidget>
      <ChatWidget>
        <ChatWidget.Header
          name="A name long enough that it has to truncate rather than wrap, because a wrapped filename turns a one-line header into two"
          icon={<FileText />}
          chip={<Badge>Draft</Badge>}
        />
        <ChatWidget.Body scrollLabel="Truncation example">
          <p>The chip and the icon never shrink; the name gives way first.</p>
        </ChatWidget.Body>
        <TextActions />
      </ChatWidget>
      <ChatWidget>
        <ChatWidget.Media ratio="square">
          <img src={TILE} alt="A square frame" className="size-full object-cover" />
        </ChatWidget.Media>
      </ChatWidget>
    </div>
  ),
};

/**
 * Theme zero beside a hostile brand seed. The container is a NEUTRAL surface
 * step and the media stage is `--ui-bg-media-floor`, which is invariant to the
 * brand on purpose — a pale-yellow accent must not become the ground a
 * photograph is judged against.
 */
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
          <ChatWidget>
            <ChatWidget.Header name="LinkedIn post" icon={<FileText />} chip={<Badge>Draft</Badge>} />
            <ChatWidget.Body scrollLabel="LinkedIn post draft">
              <p>Josef Müller-Brockmann did not design posters.</p>
            </ChatWidget.Body>
            <TextActions />
          </ChatWidget>
          <ChatWidget>
            <ChatWidget.Media ratio="landscape">
              <img src={TILE} alt="Title slide" className="size-full object-cover" />
            </ChatWidget.Media>
            <ChatWidget.Caption>Grounded in brand palette · 2 sources</ChatWidget.Caption>
            <MediaActions />
          </ChatWidget>
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
