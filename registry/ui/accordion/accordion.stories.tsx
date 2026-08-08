import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { InfoCircle } from "griddy-icons";

import {
  resolveThemePair,
  toStyleObject,
  THEME_ZERO,
  ZERO_AUTHORED,
  type ThemeSeed,
} from "@bydiorama/tokens";

import { Input } from "@/ui/input/input.tsx";
import { Switch } from "@/ui/switch/switch.tsx";
import { Accordion } from "./accordion.tsx";

const meta = {
  title: "UI/Accordion",
  component: Accordion,
  parameters: { layout: "padded" },
  args: { children: null },
} satisfies Meta<typeof Accordion>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Distinct copy per section, and that is not incidental.
 *
 * Base UI gives each panel `role="region"` labelled by its trigger — a
 * LANDMARK. Two panels whose triggers read the same produce two landmarks
 * with the same accessible name, which axe fails as `landmark-unique`. Three
 * copies of one FAQ on a page is a story-shaped mistake rather than a
 * component one, but it is exactly what a real page does when it repeats a
 * question, so the doc records it as a composition rule.
 */
const questions = (topic: string) =>
  [
    ["process", `What does the ${topic} process look like?`],
    ["timeline", `How long does a ${topic} project take?`],
    ["handover", `What do we get at ${topic} handover?`],
  ] as const;

const QUESTIONS = questions("brand");

const ANSWER =
  "Our process starts with discovery, where we understand your goals and vision. From research and concept development to design and implementation, we work closely with you every step of the way.";

export const Playground: Story = {
  render: () => (
    <div className="max-w-96">
      <Accordion defaultValue={["process"]} onValueChange={fn()}>
        {QUESTIONS.map(([value, question]) => (
          <Accordion.Item key={value} value={value}>
            <Accordion.Trigger icon={<InfoCircle />}>{question}</Accordion.Trigger>
            <Accordion.Panel>{ANSWER}</Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
    </div>
  ),
};

/** The sheet's three sections, in its order. */
export const Matrix: Story = {
  render: () => (
    <div className="flex max-w-96 flex-col gap-2xl">
      <section>
        <p className="pb-sm text-caption text-ink-muted">plain</p>
        <Accordion defaultValue={["process"]}>
          {questions("plain").map(([value, question]) => (
            <Accordion.Item key={value} value={value}>
              <Accordion.Trigger icon={<InfoCircle />}>{question}</Accordion.Trigger>
              <Accordion.Panel>{ANSWER}</Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      </section>

      <section>
        <p className="pb-sm text-caption text-ink-muted">card</p>
        <Accordion variant="card" defaultValue={["process"]}>
          {questions("card").map(([value, question]) => (
            <Accordion.Item key={value} value={value}>
              <Accordion.Trigger icon={<InfoCircle />}>{question}</Accordion.Trigger>
              <Accordion.Panel>{ANSWER}</Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      </section>

      <section>
        <p className="pb-sm text-caption text-ink-muted">rich content</p>
        <RichContent />
      </section>
    </div>
  ),
};

/**
 * The sheet's third section — and the case that decided the architecture.
 *
 * The panel holds real form controls, which is why a closed panel must not
 * leave focusable elements in the tab order and why the height has to be
 * measured rather than fixed. The numbered step badge is passed through the
 * `icon` slot: it is the caller's element, not a shape this component knows
 * about (see the doc's needsDesign).
 */
const StepBadge = ({ n }: { n: number }) => (
  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-sunken text-caption font-body font-medium text-ink-muted">
    {n}
  </span>
);

function RichContent() {
  return (
    <Accordion variant="card" defaultValue={["profile"]}>
      <Accordion.Item value="profile">
        <Accordion.Trigger icon={<StepBadge n={1} />}>Complete your profile</Accordion.Trigger>
        <Accordion.Panel>
          <Input label="Full name" placeholder="Steve Ditko" />
          <Input label="Email" placeholder="steve@bydiorama.com" />
          <Switch defaultIsChecked>Show email</Switch>
        </Accordion.Panel>
      </Accordion.Item>
      <Accordion.Item value="addons">
        <Accordion.Trigger icon={<StepBadge n={2} />}>Choose your add-ons</Accordion.Trigger>
        <Accordion.Panel>Pick the extras you want included in the handover.</Accordion.Panel>
      </Accordion.Item>
      <Accordion.Item value="export">
        <Accordion.Trigger icon={<StepBadge n={3} />}>Export the asset</Accordion.Trigger>
        <Accordion.Panel>Exports use the template set in your brand profile.</Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}

export const RichPanel: Story = {
  render: () => (
    <div className="max-w-96">
      <RichContent />
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div className="flex max-w-96 flex-col gap-2xl">
      <section>
        <p className="pb-sm text-caption text-ink-muted">multiple open at once</p>
        <Accordion variant="card" isMultiple defaultValue={["process", "timeline"]}>
          {questions("multiple").map(([value, question]) => (
            <Accordion.Item key={value} value={value}>
              <Accordion.Trigger icon={<InfoCircle />}>{question}</Accordion.Trigger>
              <Accordion.Panel>{ANSWER}</Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      </section>

      <section>
        <p className="pb-sm text-caption text-ink-muted">one row disabled</p>
        <Accordion variant="card">
          {questions("disabled").map(([value, question], i) => (
            <Accordion.Item key={value} value={value} isDisabled={i === 1}>
              <Accordion.Trigger icon={<InfoCircle />}>{question}</Accordion.Trigger>
              <Accordion.Panel>{ANSWER}</Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      </section>

      <section>
        <p className="pb-sm text-caption text-ink-muted">a title long enough to clamp</p>
        <Accordion variant="card">
          <Accordion.Item value="long">
            <Accordion.Trigger icon={<InfoCircle />}>
              What does your process look like when a project spans several brands, regions and
              handover formats at once?
            </Accordion.Trigger>
            <Accordion.Panel>{ANSWER}</Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </section>
    </div>
  ),
};

/**
 * THE BRAND-THEME CASE — mandatory per AGENTS.md step 4.
 *
 * The card fill, the panel ink and the focus ring are all roles, so a hostile
 * seed re-tones the whole row. Tab into a trigger in each column to compare.
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
        {/* The topic differs per column for the same landmark-uniqueness
            reason the Matrix does — two themed copies of one accordion are
            still two sets of landmarks on one page. */}
        <Accordion variant="card" defaultValue={["process"]}>
          {questions(title).map(([value, question]) => (
            <Accordion.Item key={value} value={value}>
              <Accordion.Trigger icon={<InfoCircle />}>{question}</Accordion.Trigger>
              <Accordion.Panel>{ANSWER}</Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
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
