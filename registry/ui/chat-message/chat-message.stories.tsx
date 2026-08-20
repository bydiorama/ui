import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Bookmark, Copy, MoreVertical, Refresh, ThumbsDown, ThumbsUp } from "griddy-icons";

import {
  resolveThemePair,
  toStyleObject,
  THEME_ZERO,
  ZERO_AUTHORED,
  type ThemeSeed,
} from "@bydiorama/tokens";

import { Button } from "@/ui/button/button.tsx";
import { Thumbnail } from "@/ui/thumbnail/thumbnail.tsx";
import { ChatMessage } from "./chat-message.tsx";

/** A 1x1 PNG per tile. No network — see the composer's stories for why. */
const TILE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const meta = {
  title: "UI/ChatMessage",
  component: ChatMessage.Receiver,
  parameters: { layout: "padded" },
  args: { children: "Here's your title slide — Aspekta headline on the brand's deep blue." },
} satisfies Meta<typeof ChatMessage.Receiver>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The sheet's own six actions, in the sheet's order. */
const Actions = () => (
  <>
    <Button variant="ghost" size="sm" isIconOnly aria-label="Copy answer" icon={<Copy />} onClick={fn()} />
    <Button variant="ghost" size="sm" isIconOnly aria-label="Regenerate" icon={<Refresh />} onClick={fn()} />
    <Button variant="ghost" size="sm" isIconOnly aria-label="Good answer" icon={<ThumbsUp />} onClick={fn()} />
    <Button variant="ghost" size="sm" isIconOnly aria-label="Bad answer" icon={<ThumbsDown />} onClick={fn()} />
    <Button variant="ghost" size="sm" isIconOnly aria-label="Save answer" icon={<Bookmark />} onClick={fn()} />
    <Button variant="ghost" size="sm" isIconOnly aria-label="More actions" icon={<MoreVertical />} onClick={fn()} />
  </>
);

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-start gap-lg">
    <span className="w-32 shrink-0 text-caption font-semibold text-ink-primary">{label}</span>
    <div className="min-w-0 flex-1">{children}</div>
  </div>
);

export const Playground: Story = {
  args: { actions: <Actions />, meta: "Diorama Agent · just now", isActionsVisible: true },
};

/**
 * One exchange on the sheet's 640px thread, in the sheet's own order: a sender
 * bubble with an attachment, then the receiver block with its actions row.
 * Hover the answer to see the row appear — it is pinned here so the layout is
 * comparable, which is not what a consumer gets.
 */
export const Matrix: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex max-w-[640px] flex-col gap-xl">
      <ChatMessage.Sender
        attachments={
          <Thumbnail.Group>
            <Thumbnail src={TILE} alt="Poster scan" />
          </Thumbnail.Group>
        }
      >
        Create a title slide for a talk on Josef Müller-Brockmann&apos;s grid systems — use this poster scan as the
        reference.
      </ChatMessage.Sender>
      <ChatMessage.Receiver actions={<Actions />} meta="Diorama Agent · 2 min ago" isActionsVisible>
        Here&apos;s your title slide — Aspekta headline on the brand&apos;s deep blue, with the 1961 poster grid
        recreated as a background system. The type sits on a strict 12-column layout, exactly as the reference does.
      </ChatMessage.Receiver>
    </div>
  ),
};

/**
 * The bubble never changes fill by state — status is carried by a caption
 * under the trailing edge, so the message stays legible while pending or
 * failed.
 */
export const SenderStates: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex max-w-[640px] flex-col gap-xl">
      <Row label="Default">
        <ChatMessage.Sender>What&apos;s our primary colour in CMYK?</ChatMessage.Sender>
      </Row>
      <Row label="Sending">
        <ChatMessage.Sender status="sending" statusText="Sending…">
          Now redraw it with Wim Crouwel&apos;s New Alphabet instead.
        </ChatMessage.Sender>
      </Row>
      <Row label="Failed">
        <ChatMessage.Sender status="failed" statusText="Not sent" retryLabel="Retry" onRetryAction={fn()}>
          Now redraw it with Wim Crouwel&apos;s New Alphabet instead.
        </ChatMessage.Sender>
      </Row>
      <Row label="Attachment group">
        <ChatMessage.Sender
          attachments={
            <Thumbnail.Group>
              <Thumbnail src={TILE} alt="Poster scan one" />
              <Thumbnail src={TILE} alt="Poster scan two" />
            </Thumbnail.Group>
          }
        >
          Which of these two poster scans reads better as a cover?
        </ChatMessage.Sender>
      </Row>
    </div>
  ),
};

/**
 * While streaming, the caret block is the only ornament and the actions row is
 * withheld. Failure is a block inside the message, not a toast — the error
 * stays attached to the turn it belongs to.
 */
export const ReceiverStates: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex max-w-[640px] flex-col gap-xl">
      <Row label="Streaming">
        <ChatMessage.Receiver isStreaming actions={<Actions />} meta="Diorama Agent">
          Here&apos;s your title slide — Aspekta headline on the brand&apos;s deep blue, with the 1961 poster grid
          recreated as a
        </ChatMessage.Receiver>
      </Row>
      <Row label="Settled">
        <ChatMessage.Receiver actions={<Actions />} meta="Diorama Agent · just now" isActionsVisible>
          Here&apos;s your title slide — Aspekta headline on the brand&apos;s deep blue, with the 1961 poster grid
          recreated as a background system.
        </ChatMessage.Receiver>
      </Row>
      <Row label="Failed">
        <ChatMessage.Receiver
          errorText="Generation stopped — connection lost. The partial answer above is kept."
          retryLabel="Retry"
          onRetryAction={fn()}
        >
          Here&apos;s your title slide — Aspekta headline on the brand&apos;s deep
        </ChatMessage.Receiver>
      </Row>
    </div>
  ),
};

/**
 * The bubble cap loosens as the column narrows — 75% at 640, 85% at sidebar
 * and mobile widths, because a narrow column with a narrow cap wastes half the
 * line. It is a custom property, not a prop: the app that chose the column is
 * the only thing that knows how wide it is.
 */
export const Widths: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-start gap-3xl">
      <div className="flex w-[308px] flex-col gap-md">
        <p className="text-caption font-semibold text-ink-muted">Sidebar · 308</p>
        <div className="flex flex-col gap-lg [--ui-chat-message-bubble-max-width:85%]">
          <ChatMessage.Sender size="sm">Shorten the intro and make it more personal.</ChatMessage.Sender>
          <ChatMessage.Receiver size="sm">
            Draft intro in the brand tone — short sentences, direct address: “Investing for the first time? No need to
            worry.”
          </ChatMessage.Receiver>
        </div>
      </div>
      <div className="flex w-[343px] flex-col gap-md">
        <p className="text-caption font-semibold text-ink-muted">Mobile · 343</p>
        <div className="flex flex-col gap-lg [--ui-chat-message-bubble-max-width:85%]">
          <ChatMessage.Sender>Build a habit tracker with a progress bar on top.</ChatMessage.Sender>
          <ChatMessage.Receiver>
            Starting with the list view — each habit gets a row with a checkbox, and the bar fills as you check them
            off.
          </ChatMessage.Receiver>
        </div>
      </div>
    </div>
  ),
};

export const States: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex max-w-[640px] flex-col gap-xl">
      <Row label="sender">
        <ChatMessage.Sender>What&apos;s our primary colour in CMYK?</ChatMessage.Sender>
      </Row>
      <Row label="receiver">
        <ChatMessage.Receiver actions={<Actions />} meta="Diorama Agent · just now" isActionsVisible>
          Four-colour process: 82 / 46 / 0 / 12. The deep blue is the only brand colour with a CMYK build; everything
          else is derived from it.
        </ChatMessage.Receiver>
      </Row>
      <Row label="streaming">
        <ChatMessage.Receiver isStreaming>Four-colour process: 82 / 46</ChatMessage.Receiver>
      </Row>
      <Row label="hover-revealed">
        <ChatMessage.Receiver actions={<Actions />} meta="Diorama Agent · just now">
          Hover this answer — the actions row fades in at duration-fast, and appears for a keyboard on focus-within.
        </ChatMessage.Receiver>
      </Row>
    </div>
  ),
};

/**
 * Theme zero beside a hostile brand seed. Neither voice carries the accent —
 * which is the point of the case: the sender's bubble is a NEUTRAL surface
 * step, so a pale-yellow brand must not tint it, and the failure block's ink
 * has to be re-toned rather than handed Diorama's red.
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
          <ChatMessage.Sender>What&apos;s our primary colour in CMYK?</ChatMessage.Sender>
          <ChatMessage.Receiver actions={<Actions />} meta="Diorama Agent · just now" isActionsVisible>
            Four-colour process: 82 / 46 / 0 / 12.
          </ChatMessage.Receiver>
          <ChatMessage.Receiver
            errorText="Generation stopped — connection lost."
            retryLabel="Retry"
            onRetryAction={fn()}
          >
            Four-colour process: 82 / 46
          </ChatMessage.Receiver>
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
