import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import {
  resolveThemePair,
  toStyleObject,
  THEME_ZERO,
  ZERO_AUTHORED,
  type ThemeSeed,
} from "@bydiorama/tokens";

import { ChatQuestionnaire, type ChatQuestionnaireOption, type ChatQuestionnaireTile } from "./chat-questionnaire.tsx";

/** A 1x1 PNG. No network — a story that fetches is a baseline that drifts. */
const TILE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const TONE: ChatQuestionnaireOption[] = [
  { id: "confident", label: "Confident and direct" },
  { id: "warm", label: "Warm and personal" },
  { id: "playful", label: "Playful — a wink in every line" },
  { id: "other", label: "Other — tell me in your own words…", isHandoff: true },
];

const FORMATS: ChatQuestionnaireOption[] = [
  { id: "carousel", label: "LinkedIn carousel" },
  { id: "story", label: "Story 9:16" },
  { id: "poster", label: "Print poster" },
];

const DIRECTIONS: ChatQuestionnaireTile[] = [
  { id: "botanical", label: "Botanical macro", src: TILE, alt: "A close-up of a leaf against a dark ground" },
  { id: "studio", label: "Studio still life", src: TILE, alt: "Objects arranged on a seamless backdrop" },
  { id: "street", label: "Street documentary", src: TILE, alt: "A candid street scene in daylight" },
  { id: "archival", label: "Archival scan", src: TILE, alt: "A scanned page from a 1960s poster book" },
];

const meta: Meta<typeof ChatQuestionnaire> = {
  title: "UI/ChatQuestionnaire",
  component: ChatQuestionnaire,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof ChatQuestionnaire>;

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-start gap-lg">
    <span className="w-32 shrink-0 text-caption font-semibold text-ink-primary">{label}</span>
    <div className="min-w-0 flex-1">{children}</div>
  </div>
);

export const Playground: Story = {
  render: () => (
    <div className="max-w-[640px]">
      <ChatQuestionnaire
        question="Which tone should the campaign lead with?"
        options={TONE}
        onSubmitAction={fn()}
      />
    </div>
  ),
};

/**
 * The sheet's Text options matrix, in its own order. The selection language is
 * Card Sorting's: the fill does not move, a 1.5px border-focus edge and a check
 * in the same blue carry the state, and the filled accent stays reserved for
 * Confirm and the answered Badge.
 */
export const Matrix: Story = {
  render: () => (
    <div className="flex max-w-[640px] flex-col gap-xl">
      <Row label="Unanswered">
        <ChatQuestionnaire question="Which tone should the campaign lead with?" options={TONE} onSubmitAction={fn()} />
      </Row>
      <Row label="Selected (single)">
        <ChatQuestionnaire
          question="Which tone should the campaign lead with?"
          options={TONE.slice(0, 2).reverse()}
          defaultValue={["warm"]}
          onSubmitAction={fn()}
        />
      </Row>
      <Row label="Multi-select">
        <ChatQuestionnaire
          question="Which formats should the campaign cover? Pick any."
          mode="multiple"
          options={FORMATS}
          defaultValue={["carousel", "story"]}
          confirmLabel="Confirm — 2 picked"
          skipLabel="Skip"
          onSkipAction={fn()}
          onSubmitAction={fn()}
        />
      </Row>
      <Row label="Answered">
        <ChatQuestionnaire
          question="Which tone should the campaign lead with?"
          options={TONE}
          answer="Warm and personal"
        />
      </Row>
    </div>
  ),
};

/**
 * Four 1:1 tiles across the thread, caption under each. Selection is a 2px
 * outline OUTSIDE the media plus an accent check badge — the same language the
 * rows use, so picking an image here feels like picking one anywhere else in
 * the product.
 */
export const ImagePicker: Story = {
  render: () => (
    <div className="flex max-w-[640px] flex-col gap-xl">
      <Row label="Choosing">
        <ChatQuestionnaire
          question="Which image direction fits the spring launch?"
          variant="tiles"
          options={DIRECTIONS}
          defaultValue={["botanical"]}
          onSubmitAction={fn()}
        />
      </Row>
      <Row label="Answered">
        <ChatQuestionnaire
          question="Which image direction fits the spring launch?"
          variant="tiles"
          options={DIRECTIONS}
          answer="Botanical macro"
        />
      </Row>
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div className="flex max-w-[640px] flex-col gap-xl">
      <Row label="nothing picked">
        <ChatQuestionnaire question="Which tone?" options={TONE} onSubmitAction={fn()} />
      </Row>
      <Row label="one picked">
        <ChatQuestionnaire question="Which tone?" options={TONE} defaultValue={["warm"]} onSubmitAction={fn()} />
      </Row>
      <Row label="multi, none picked">
        <ChatQuestionnaire
          question="Which formats?"
          mode="multiple"
          options={FORMATS}
          confirmLabel="Confirm"
          skipLabel="Skip"
          onSkipAction={fn()}
          onSubmitAction={fn()}
        />
      </Row>
      <Row label="answered">
        <ChatQuestionnaire question="Which tone?" options={TONE} answer="Playful" />
      </Row>
    </div>
  ),
};

/**
 * Theme zero beside a hostile brand seed. The selection edge is border-focus,
 * which the resolver re-tones per brand — and the answered Badge is one of the
 * three places the filled accent is allowed, so a pale-yellow seed has to
 * carry legible ink on it.
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
          <ChatQuestionnaire
            question="Which tone should the campaign lead with?"
            options={TONE.slice(0, 3)}
            defaultValue={["warm"]}
            onSubmitAction={fn()}
          />
          <ChatQuestionnaire
            question="Which formats should the campaign cover?"
            mode="multiple"
            options={FORMATS}
            defaultValue={["carousel"]}
            confirmLabel="Confirm — 1 picked"
            skipLabel="Skip"
            onSkipAction={fn()}
            onSubmitAction={fn()}
          />
          <ChatQuestionnaire question="Which tone?" options={TONE} answer="Warm and personal" />
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
