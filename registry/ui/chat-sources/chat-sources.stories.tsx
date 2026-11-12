import { useState, type CSSProperties, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";

import {
  resolveThemePair,
  toStyleObject,
  THEME_ZERO,
  ZERO_AUTHORED,
  type ThemeSeed,
} from "@bydiorama/tokens";

import { ChatSources, type ChatSource, type ChatSourcesLabels } from "./chat-sources.tsx";

/**
 * The five sources the sheet draws (3ZOU), one per kind plus a second web
 * page, in the sheet's order.
 */
const SOURCES: ChatSource[] = [
  {
    id: "moma",
    kind: "web",
    title: "Lighthouse at dusk — collection record",
    origin: "moma.example",
    excerpt:
      "The print's horizon sits a third of the way down the sheet, and the lamp is the only saturated mark in it — everything else is a grey the paper itself supplies.",
    href: "https://moma.example/collection/lighthouse",
  },
  {
    id: "grid",
    kind: "libraryItem",
    title: "Grid Systems in Graphic Design",
    origin: "Library · p. 48",
    excerpt: "A grid is not a cage: it is the agreement that lets the exceptions read as deliberate.",
    href: "/library/grid-systems#p48",
  },
  {
    id: "guidelines",
    kind: "brandAsset",
    title: "Colour and contrast",
    origin: "Guidelines · Chapter 4",
    excerpt: "The accent is a signal, not a fill. Use it where the reader's eye should land, and nowhere else.",
    href: "/brand/guidelines/4",
    actionLabel: "Open in guidelines",
  },
  {
    id: "moodboard",
    kind: "file",
    title: "moodboard-v3.png",
    origin: "Attached to this chat",
    href: "/files/moodboard-v3.png",
    isExternal: false,
  },
  {
    id: "tate",
    kind: "web",
    title: "Coastal prints, 1890–1930",
    origin: "tate.example",
    excerpt: "Most of the series was printed in two passes, the second carrying only the light.",
    href: "https://tate.example/coastal-prints",
  },
];

const LABELS: ChatSourcesLabels = {
  openSource: "Open source",
  previousSource: "Previous source",
  nextSource: "Next source",
  unavailable: "No longer available",
};

/**
 * `Meta<typeof ChatSources>`, the looser annotation: the layout prop is a
 * union and a `typeof meta` story would demand the whole of it everywhere.
 * Every story renders inside a Provider — the block cannot exist without the
 * list it numbers.
 */
const meta: Meta<typeof ChatSources> = {
  title: "UI/ChatSources",
  component: ChatSources,
  parameters: { layout: "padded" },
  args: { label: "5 sources", onOpenChange: fn() },
  decorators: [
    (Story) => (
      <ChatSources.Provider sources={SOURCES} labels={LABELS}>
        <div className="max-w-[560px]">
          <Story />
        </div>
      </ChatSources.Provider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ChatSources>;

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex items-start gap-lg">
    <span className="w-32 shrink-0 text-caption text-ink-primary">{label}</span>
    <div className="min-w-0 flex-1">{children}</div>
  </div>
);

/** An answer paragraph, with markers after the clauses they support. */
const Answer = () => (
  <p className="text-body-md text-ink-primary">
    The print keeps its horizon high and lets the lamp carry the only colour
    <ChatSources.Citation sourceIds={["moma"]} />, which is the grid doing its job rather than limiting it
    <ChatSources.Citation sourceIds={["grid", "tate"]} />. The brand treats its accent the same way
    <ChatSources.Citation sourceIds={["guidelines"]} />.
  </p>
);

export const Playground: Story = {
  render: (args) => (
    <div className="flex flex-col gap-lg">
      <Answer />
      <ChatSources {...args} />
    </div>
  ),
};

/**
 * The sheet, section by section: the markers in a sentence (3ZKI), the folded
 * and open block (3ZO6), the cards (3ZQ1) and the data states (3ZQT).
 */
export const Matrix: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-col gap-xl">
      <Row label="Citations">
        <Answer />
      </Row>
      <Row label="Folded">
        <ChatSources label="5 sources" />
      </Row>
      <Row label="Open">
        <ChatSources label="5 sources" defaultIsOpen />
      </Row>
      <Row label="Cards">
        <ChatSources label="5 sources" layout="cards" moreLabel={(n) => `+${n} more`} />
      </Row>
      <Row label="Gathering">
        <ChatSources label="3 sources so far" isGathering />
      </Row>
      <Row label="Single">
        <ChatSources.Provider sources={[SOURCES[0]!]} labels={LABELS}>
          <ChatSources label="1 source" />
        </ChatSources.Provider>
      </Row>
      <Row label="Unavailable">
        <ChatSources.Provider
          sources={[{ ...SOURCES[2]!, isUnavailable: true }]}
          labels={LABELS}
        >
          <ChatSources label="1 source" />
        </ChatSources.Provider>
      </Row>
    </div>
  ),
};

/**
 * The states the sheet's tables draw, one per row: the marker's streaming
 * form, a source with no excerpt or link, a long title truncating, and the
 * cards when every source fits.
 */
export const States: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-col gap-xl">
      <Row label="streaming">
        <ChatSources.Provider sources={SOURCES} labels={LABELS} isStreaming>
          <Answer />
        </ChatSources.Provider>
      </Row>
      <Row label="long title">
        <ChatSources.Provider
          sources={[
            {
              ...SOURCES[0]!,
              title:
                "Lighthouse at dusk, and every later state of the plate the museum has catalogued — the title truncates rather than wrapping",
              origin: "collection.moma.example/prints/lighthouse-at-dusk",
            },
            SOURCES[1]!,
          ]}
          labels={LABELS}
        >
          <ChatSources label="2 sources" defaultIsOpen />
        </ChatSources.Provider>
      </Row>
      <Row label="no link">
        <ChatSources.Provider
          sources={[{ id: "note", kind: "file", title: "meeting-notes.txt", origin: "Attached to this chat" }, SOURCES[0]!]}
          labels={LABELS}
        >
          <ChatSources label="2 sources" defaultIsOpen />
        </ChatSources.Provider>
      </Row>
      <Row label="cards, all fit">
        <ChatSources.Provider sources={SOURCES.slice(0, 3)} labels={LABELS}>
          <ChatSources label="3 sources" layout="cards" moreLabel={(n) => `+${n} more`} />
        </ChatSources.Provider>
      </Row>
    </div>
  ),
};

/**
 * The preview, opened by keyboard focus the way a reader tabbing through the
 * answer meets it — so axe checks the panel as well as the block.
 */
export const Preview: Story = {
  parameters: { controls: { disable: true } },
  render: (args) => (
    <div className="flex flex-col gap-lg pb-[240px]">
      <Answer />
      <ChatSources {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.tab();
    const marker = canvas.getAllByRole("button", { name: /^1\s?:/ })[0]!;
    await waitFor(() => expect(marker).toHaveAttribute("aria-expanded", "true"));
    await waitFor(() => expect(within(document.body).getByRole("dialog")).toBeVisible());
  },
};

/**
 * Theme zero beside a hostile brand seed. What matters is the hovered
 * marker and the cited row — both bg-accent-subtle under text-ink-link —
 * and the preview, which must portal INTO the brand scope (`container`) or
 * it paints theme zero.
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

function ThemedPanel({ style, title }: { style: CSSProperties; title: string }) {
  const [scope, setScope] = useState<HTMLDivElement | null>(null);
  return (
    <div ref={setScope} style={style} className="min-w-0 flex-1 rounded-lg bg-base p-xl">
      <p className="pb-md text-caption text-ink-muted">{title}</p>
      <ChatSources.Provider sources={SOURCES} labels={LABELS} container={scope}>
        <div className="flex flex-col gap-lg">
          <Answer />
          <ChatSources label="5 sources" defaultIsOpen />
          <ChatSources label="5 sources" layout="cards" moreLabel={(n) => `+${n} more`} />
        </div>
      </ChatSources.Provider>
    </div>
  );
}

export const BrandThemed: Story = {
  parameters: { controls: { disable: true }, layout: "fullscreen" },
  decorators: [(Story) => <Story />],
  render: () => {
    const zero = toStyleObject(resolveThemePair(THEME_ZERO, { authored: ZERO_AUTHORED }));
    const brand = toStyleObject(resolveThemePair(STRESS_BRAND));
    return (
      <div className="flex flex-col gap-xl p-xl">
        <ThemedPanel style={zero as CSSProperties} title="theme zero" />
        <ThemedPanel style={brand as CSSProperties} title="stress brand — pale yellow accent" />
      </div>
    );
  },
};
