import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import {
  resolveThemePair,
  toStyleObject,
  THEME_ZERO,
  ZERO_AUTHORED,
  type ThemeSeed,
} from "@bydiorama/tokens";

import { ChatProgress, type ChatProgressStep } from "./chat-progress.tsx";

/**
 * `Meta<typeof ChatProgress>` rather than `satisfies`, and `StoryObj<typeof
 * ChatProgress>` rather than `typeof meta`.
 *
 * The props are a DISCRIMINATED UNION, and inferring a story's args from the
 * meta's makes Storybook demand the full union on every story — including the
 * render-only ones that take none. The looser annotation is the shape a union
 * component wants; the type still refuses a wrong arg.
 */
const meta: Meta<typeof ChatProgress> = {
  title: "UI/ChatProgress",
  component: ChatProgress,
  parameters: { layout: "padded" },
  args: { label: "Thinking…" },
};

export default meta;
type Story = StoryObj<typeof ChatProgress>;

const STEPS: ChatProgressStep[] = [
  { id: "tone", label: "Tone of voice — 2 documents", status: "done" },
  { id: "styles", label: "Brand styles — palette and type ramp", status: "done" },
  { id: "images", label: "Collecting images — 8 of 12", status: "current" },
  { id: "moodboard", label: "Compose moodboard", status: "pending" },
];

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-start gap-lg">
    <span className="w-32 shrink-0 text-caption font-semibold text-ink-primary">{label}</span>
    <div className="min-w-0 flex-1">{children}</div>
  </div>
);

export const Playground: Story = {};

/**
 * The sheet's Forms matrix, in the sheet's escalation order: thinking →
 * activity → step list → measured, then the two terminal rows every form folds
 * into.
 */
export const Matrix: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex max-w-[640px] flex-col gap-xl">
      <Row label="Thinking">
        <ChatProgress label="Thinking…" />
      </Row>
      <Row label="Activity line">
        <ChatProgress
          form="activity"
          activities={[
            { verb: "Reading…", detail: "Grid Systems in Graphic Design — Josef Müller-Brockmann, 1961" },
            { verb: "Searching…", detail: "5 files included across 3 spaces" },
          ]}
        />
      </Row>
      <Row label="Step list">
        <ChatProgress form="steps" label="Gathering brand resources" duration="12 s" steps={STEPS} />
      </Row>
      <Row label="Measured">
        <ChatProgress form="measured" label="Generating slide 3 of 6" value={48} />
      </Row>
      <Row label="Receipt (done)">
        <ChatProgress
          form="steps"
          label="Gathering brand resources"
          steps={STEPS.map((step) => ({ ...step, status: "done" as const }))}
          isComplete
          receiptText="Worked for 26 s · 4 steps"
          expandLabel="Show what the agent did"
        />
      </Row>
      <Row label="Failed">
        <ChatProgress
          label="Thinking…"
          errorText="Stopped after 12 s — connection lost"
          retryLabel="Retry"
          onRetryAction={fn()}
        />
      </Row>
    </div>
  ),
};

/**
 * The receipt, expanded. Press it to fold the log away and press it again to
 * bring it back — the point of the row is that the history stays reachable.
 */
export const Receipt: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex max-w-[640px] flex-col gap-xl">
      <Row label="folded">
        <ChatProgress
          form="steps"
          label="Gathering brand resources"
          steps={STEPS.map((step) => ({ ...step, status: "done" as const }))}
          isComplete
          receiptText="Worked for 26 s · 4 steps"
          expandLabel="Show what the agent did"
        />
      </Row>
      <Row label="re-expanded">
        <ChatProgress
          form="steps"
          label="Gathering brand resources"
          steps={STEPS.map((step) => ({ ...step, status: "done" as const }))}
          isComplete
          defaultIsOpen
          receiptText="Worked for 26 s · 4 steps"
          expandLabel="Hide what the agent did"
        />
      </Row>
    </div>
  ),
};

export const States: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex max-w-[640px] flex-col gap-xl">
      <Row label="thinking">
        <ChatProgress label="Thinking…" />
      </Row>
      <Row label="one activity">
        <ChatProgress form="activity" activities={[{ verb: "Reading…", detail: "Grid Systems in Graphic Design" }]} />
      </Row>
      <Row label="long detail">
        <ChatProgress
          form="activity"
          activities={[
            {
              verb: "Searching…",
              detail:
                "Grid Systems in Graphic Design, Josef Müller-Brockmann 1961, plus every scan in the brand library that references it — the detail truncates rather than wrapping",
            },
          ]}
        />
      </Row>
      <Row label="steps, folded">
        <ChatProgress
          form="steps"
          label="Gathering brand resources"
          duration="12 s"
          steps={STEPS}
          defaultIsOpen={false}
        />
      </Row>
      <Row label="measured at 0">
        <ChatProgress form="measured" label="Starting" value={0} />
      </Row>
      <Row label="measured at 100">
        <ChatProgress form="measured" label="Generating slide 6 of 6" value={100} />
      </Row>
      <Row label="failed, no retry">
        <ChatProgress label="Thinking…" errorText="Stopped after 12 s — connection lost" />
      </Row>
    </div>
  ),
};

/**
 * Theme zero beside a hostile brand seed. The case that matters is the
 * spinner's arc and the measured fill: both are `--ui-bg-accent-legible`, the
 * role that is floored at 3:1 against the sunken track — a pale-yellow accent
 * is exactly what it exists to survive.
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
          <ChatProgress label="Thinking…" />
          <ChatProgress form="steps" label="Gathering brand resources" duration="12 s" steps={STEPS} />
          <ChatProgress form="measured" label="Generating slide 3 of 6" value={48} />
          <ChatProgress
            label="Thinking…"
            errorText="Stopped after 12 s — connection lost"
            retryLabel="Retry"
            onRetryAction={fn()}
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
