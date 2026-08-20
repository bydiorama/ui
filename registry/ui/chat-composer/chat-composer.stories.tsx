import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Microphone, Plus } from "griddy-icons";

import {
  resolveThemePair,
  toStyleObject,
  THEME_ZERO,
  ZERO_AUTHORED,
  type ThemeSeed,
} from "@bydiorama/tokens";

import { Button } from "@/ui/button/button.tsx";
import { Thumbnail } from "@/ui/thumbnail/thumbnail.tsx";
import { ChatComposer } from "./chat-composer.tsx";

/**
 * A 1x1 PNG per tile, as a data URI. No network: a story that fetches is a
 * story whose visual baseline differs between the run that recorded it and
 * the run that compares it.
 */
const TILE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const meta = {
  title: "UI/ChatComposer",
  component: ChatComposer,
  parameters: { layout: "padded" },
  args: {
    label: "Message",
    placeholder: "Message Diorama…",
    sendLabel: "Send message",
    stopLabel: "Stop generating",
    onSubmitAction: fn(),
    onStopAction: fn(),
  },
} satisfies Meta<typeof ChatComposer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The sheet's Add control, verbatim: Button ghost · md · full. */
const AddAction = () => (
  <Button variant="ghost" shape="full" size="md" isIconOnly aria-label="Add attachment" icon={<Plus />} onClick={fn()} />
);

/** The sheet's Dictate control. Optional — the first thing to drop when narrow. */
const DictateAction = () => (
  <Button variant="ghost" shape="full" size="md" isIconOnly aria-label="Dictate" icon={<Microphone />} onClick={fn()} />
);

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-start gap-lg">
    <span className="w-32 shrink-0 pt-md text-caption font-semibold text-ink-primary">{label}</span>
    <div className="min-w-0 flex-1">{children}</div>
  </div>
);

export const Playground: Story = {
  args: { startAction: <AddAction />, endActions: <DictateAction /> },
};

/**
 * The sheet's own States matrix, in the sheet's order and at its 640px column,
 * so a visual diff is like-for-like. Focus the second row to see the state the
 * sheet draws focused — an indicator is live, not something a story can pin.
 */
export const Matrix: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex max-w-[640px] flex-col gap-xl">
      <Row label="Rest">
        <ChatComposer
          label="Message"
          placeholder="Message Diorama…"
          sendLabel="Send message"
          stopLabel="Stop generating"
          startAction={<AddAction />}
          endActions={<DictateAction />}
        />
      </Row>
      <Row label="Filled">
        <ChatComposer
          label="Message"
          defaultValue="Create a carousel about Wim Crouwel's New Alphabet"
          sendLabel="Send message"
          stopLabel="Stop generating"
          startAction={<AddAction />}
          endActions={<DictateAction />}
          onSubmitAction={fn()}
        />
      </Row>
      <Row label="Generating">
        <ChatComposer
          label="Message"
          placeholder="Reply to interrupt…"
          sendLabel="Send message"
          stopLabel="Stop generating"
          isGenerating
          startAction={<AddAction />}
          endActions={<DictateAction />}
          onStopAction={fn()}
        />
      </Row>
      <Row label="Disabled">
        <ChatComposer
          label="Message"
          placeholder="Message Diorama…"
          sendLabel="Send message"
          stopLabel="Stop generating"
          isDisabled
          startAction={<AddAction />}
          endActions={<DictateAction />}
        />
      </Row>
      <Row label="Error">
        <ChatComposer
          label="Message"
          defaultValue="Use the attached scan as the visual reference"
          sendLabel="Send message"
          stopLabel="Stop generating"
          errorText="mueller-brockmann.tif is 68 MB — the attachment limit is 50 MB."
          startAction={<AddAction />}
          onSubmitAction={fn()}
        />
      </Row>
      <Row label="Drag-over">
        <ChatComposer
          label="Message"
          placeholder="Message Diorama…"
          dropLabel="Drop to attach"
          isDropActive
          sendLabel="Send message"
          stopLabel="Stop generating"
          startAction={<AddAction />}
        />
      </Row>
    </div>
  ),
};

/**
 * The two arrangements, side by side, which is the only way to see that they
 * are one component. The corner is the tell: a pill around one line, radius-xl
 * the moment the text takes a second.
 */
export const Layouts: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex max-w-[640px] flex-col gap-xl">
      <Row label="inline">
        <ChatComposer
          label="Message"
          defaultValue="Match this look for the spring set"
          sendLabel="Send message"
          stopLabel="Stop generating"
          startAction={<AddAction />}
          endActions={<DictateAction />}
          onSubmitAction={fn()}
        />
      </Row>
      <Row label="stacked (wrapped)">
        <ChatComposer
          label="Message"
          defaultValue="Create a LinkedIn carousel about Josef Müller-Brockmann's grid systems — use the attached scan as the visual reference and keep the type strictly on the grid."
          sendLabel="Send message"
          stopLabel="Stop generating"
          startAction={<AddAction />}
          endActions={<DictateAction />}
          onSubmitAction={fn()}
        />
      </Row>
    </div>
  ),
};

/**
 * The tray, above the frame. Spaced while the user is working, stacked once
 * the composer loses focus — both are Thumbnail.Group's own behaviour, which
 * is why the composer only holds the slot.
 */
export const Attachments: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex max-w-[640px] flex-col gap-xl">
      <Row label="Tray — working">
        <ChatComposer
          label="Message"
          defaultValue="Match this look for the spring set"
          sendLabel="Send message"
          stopLabel="Stop generating"
          startAction={<AddAction />}
          onSubmitAction={fn()}
          attachments={
            <Thumbnail.Group>
              <Thumbnail src={TILE} alt="Poster scan" onRemove={fn()} removeLabel="Remove Poster scan" />
              <Thumbnail src={TILE} alt="Cover study" onRemove={fn()} removeLabel="Remove Cover study" />
              <Thumbnail src={TILE} alt="Type specimen" onRemove={fn()} removeLabel="Remove Type specimen" />
            </Thumbnail.Group>
          }
        />
      </Row>
      <Row label="Tray — stacked">
        <ChatComposer
          label="Message"
          placeholder="Message Diorama…"
          sendLabel="Send message"
          stopLabel="Stop generating"
          startAction={<AddAction />}
          attachments={
            <Thumbnail.Group isStacked max={3} overflowLabel="2 more attachments">
              <Thumbnail src={TILE} alt="Poster scan" />
              <Thumbnail src={TILE} alt="Cover study" />
              <Thumbnail src={TILE} alt="Type specimen" />
              <Thumbnail src={TILE} alt="Archival scan" />
              <Thumbnail src={TILE} alt="Grid study" />
            </Thumbnail.Group>
          }
        />
      </Row>
      <Row label="Uploading">
        <ChatComposer
          label="Message"
          placeholder="Message Diorama…"
          sendLabel="Send message"
          stopLabel="Stop generating"
          startAction={<AddAction />}
          attachments={
            <Thumbnail.Group>
              <Thumbnail src={TILE} alt="Poster scan" onRemove={fn()} removeLabel="Remove Poster scan" />
              <Thumbnail src={TILE} alt="poster-scan.tif" isLoading />
            </Thumbnail.Group>
          }
        />
      </Row>
    </div>
  ),
};

/**
 * The three widths the sheet draws. Desktop centres at 640 in the conversation
 * column; the assistant sidebar offers 308 and drops the dictate slot and the
 * disclaimer; mobile runs full-bleed at 343.
 */
export const Contexts: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-col gap-2xl">
      <div className="flex flex-col gap-md">
        <p className="text-caption font-semibold text-ink-muted">Desktop · 640</p>
        <ChatComposer
          className="w-[640px]"
          label="Message"
          placeholder="Message Diorama…"
          sendLabel="Send message"
          stopLabel="Stop generating"
          disclaimer="Diorama Agent can make mistakes — check important details."
          startAction={<AddAction />}
          endActions={<DictateAction />}
        />
      </div>
      <div className="flex items-start gap-3xl">
        <div className="flex flex-col gap-md">
          <p className="text-caption font-semibold text-ink-muted">Sidebar · 308</p>
          <ChatComposer
            className="w-[308px]"
            label="Ask about this document"
            placeholder="Ask about this document…"
            sendLabel="Send message"
            stopLabel="Stop generating"
            layout="stacked"
            startAction={<AddAction />}
          />
        </div>
        <div className="flex flex-col gap-md">
          <p className="text-caption font-semibold text-ink-muted">Mobile · 343</p>
          <ChatComposer
            className="w-[343px]"
            label="Message"
            placeholder="Message Diorama…"
            sendLabel="Send message"
            stopLabel="Stop generating"
            startAction={<AddAction />}
            endActions={<DictateAction />}
          />
        </div>
      </div>
    </div>
  ),
};

export const States: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex max-w-[640px] flex-col gap-xl">
      <Row label="empty">
        <ChatComposer label="Message" placeholder="Message Diorama…" sendLabel="Send message" stopLabel="Stop generating" startAction={<AddAction />} />
      </Row>
      <Row label="sendable">
        <ChatComposer label="Message" defaultValue="Redraw it with Wim Crouwel's New Alphabet" sendLabel="Send message" stopLabel="Stop generating" startAction={<AddAction />} onSubmitAction={fn()} />
      </Row>
      <Row label="generating">
        <ChatComposer label="Message" placeholder="Reply to interrupt…" isGenerating sendLabel="Send message" stopLabel="Stop generating" startAction={<AddAction />} onStopAction={fn()} />
      </Row>
      <Row label="disabled">
        <ChatComposer label="Message" placeholder="Message Diorama…" isDisabled sendLabel="Send message" stopLabel="Stop generating" startAction={<AddAction />} />
      </Row>
      <Row label="error">
        <ChatComposer label="Message" defaultValue="Use the attached scan" errorText="mueller-brockmann.tif is 68 MB — the attachment limit is 50 MB." sendLabel="Send message" stopLabel="Stop generating" startAction={<AddAction />} onSubmitAction={fn()} />
      </Row>
      <Row label="at the row cap">
        <ChatComposer
          label="Message"
          maxRows={3}
          defaultValue={"One\nTwo\nThree\nFour\nFive"}
          sendLabel="Send message"
          stopLabel="Stop generating"
          startAction={<AddAction />}
          onSubmitAction={fn()}
        />
      </Row>
    </div>
  ),
};

/**
 * Theme zero beside a hostile brand seed. The pale-yellow accent is the case
 * that matters: Send is the one filled control in the frame, so the resolver
 * has to re-tone its ink rather than hand the component Diorama's blue — and
 * Stop is painted from --ui-bg-inverse, which follows the page's ink and must
 * not follow the brand at all.
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
  parameters: { controls: { disable: true } },
  render: () => {
    const zero = toStyleObject(resolveThemePair(THEME_ZERO, { authored: ZERO_AUTHORED }));
    const brand = toStyleObject(resolveThemePair(STRESS_BRAND));

    const Panel = ({ style, title }: { style: React.CSSProperties; title: string }) => (
      <div style={style} className="flex-1 rounded-lg bg-base p-xl">
        <p className="pb-md text-caption text-ink-muted">{title}</p>
        <div className="flex flex-col gap-lg">
          <ChatComposer
            label="Message"
            defaultValue="Redraw it with Wim Crouwel's New Alphabet"
            sendLabel="Send message"
            stopLabel="Stop generating"
            startAction={<AddAction />}
            onSubmitAction={fn()}
          />
          <ChatComposer
            label="Message"
            placeholder="Reply to interrupt…"
            isGenerating
            sendLabel="Send message"
            stopLabel="Stop generating"
            startAction={<AddAction />}
            onStopAction={fn()}
          />
          <ChatComposer
            label="Message"
            defaultValue="Use the attached scan"
            errorText="The attachment limit is 50 MB."
            sendLabel="Send message"
            stopLabel="Stop generating"
            startAction={<AddAction />}
            onSubmitAction={fn()}
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
