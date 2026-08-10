import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import {
  resolveThemePair,
  toStyleObject,
  THEME_ZERO,
  ZERO_AUTHORED,
  type ThemeSeed,
} from "@bydiorama/tokens";

import { Input } from "@/ui/input/input.tsx";
import { Textarea } from "./textarea.tsx";

const meta = {
  title: "UI/Textarea",
  component: Textarea,
  parameters: { layout: "padded" },
  args: { label: "Message", placeholder: "Your message", onChange: fn() },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-start gap-lg py-sm">
    <span className="w-40 shrink-0 pt-sm text-caption text-ink-muted">{label}</span>
    <div className="max-w-80 flex-1">{children}</div>
  </div>
);

export const Playground: Story = {};

/**
 * Mirrors the Paper sheet's own three rows, in the sheet's order, so a visual
 * diff is like-for-like. Focus the third field to see the row the sheet draws
 * focused — the indicator is a live state, not something a story can pin.
 */
export const Matrix: Story = {
  render: () => (
    <div className="flex max-w-80 flex-col gap-xl">
      <Textarea label="Company name" isLabelHidden placeholder="Company name" />
      <Textarea label="Message" placeholder="Your message" helperText="Up to 120 words" />
      <Textarea label="Message" defaultValue="My message" helperText="Up to 120 words" />
      {(["lg", "md", "sm"] as const).map((size) => (
        <Textarea key={size} label={size} size={size} rows={3} placeholder="Your message" />
      ))}
    </div>
  ),
};

/**
 * The scale, beside Input's, because the whole claim of the size prop is that
 * the two match at each step — and neither field shows that on its own.
 */
export const Sizes: Story = {
  render: () => (
    <div>
      {(["lg", "md", "sm"] as const).map((size) => (
        <Row key={size} label={size}>
          <div className="flex flex-col gap-sm">
            <Input label="Company name" size={size} placeholder="Diorama s.r.o." />
            <Textarea label="Message" size={size} rows={3} placeholder="Your message" />
          </div>
        </Row>
      ))}
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div>
      <Row label="default">
        <Textarea label="Message" placeholder="Your message" />
      </Row>
      <Row label="with value">
        <Textarea
          label="Message"
          defaultValue="We are rebranding the studio and need the guidelines refreshed before the launch in March."
        />
      </Row>
      <Row label="disabled">
        <Textarea label="Message" placeholder="Your message" isDisabled />
      </Row>
      <Row label="required">
        <Textarea label="Message" placeholder="Your message" isRequired />
      </Row>
      <Row label="helper text">
        <Textarea label="Message" placeholder="Your message" helperText="Up to 120 words" />
      </Row>
      <Row label="error">
        <Textarea label="Message" placeholder="Your message" errorText="This field is required" />
      </Row>
      <Row label="error + helper">
        <Textarea
          label="Message"
          placeholder="Your message"
          helperText="Up to 120 words"
          errorText="This field is required"
        />
      </Row>
      <Row label="label hidden">
        <Textarea label="Notes" isLabelHidden placeholder="Notes…" />
      </Row>
    </div>
  ),
};

/**
 * The two height knobs, side by side, because neither is visible from a
 * single field. `rows` sets the box; `isResizable` decides whether the user
 * may change it. The last row is the case the prop exists for — a field in a
 * surface that cannot reflow.
 */
export const HeightAndResize: Story = {
  render: () => (
    <div>
      <Row label="rows=2">
        <Textarea label="Summary" rows={2} placeholder="One or two lines" />
      </Row>
      <Row label="rows=6 (default)">
        <Textarea label="Message" placeholder="Your message" />
      </Row>
      <Row label="rows=12">
        <Textarea label="Brief" rows={12} placeholder="The long version" />
      </Row>
      <Row label="not resizable">
        <Textarea
          label="Message"
          isResizable={false}
          placeholder="Fixed height"
          helperText="isResizable={false} — the grip is gone"
        />
      </Row>
      <Row label="scrolls when full">
        <Textarea
          label="Message"
          rows={3}
          defaultValue={Array.from({ length: 8 }, (_, i) => `Line ${i + 1} of the message.`).join("\n")}
        />
      </Row>
    </div>
  ),
};

/**
 * The claim the browser test makes, made visible: the control surface here is
 * Input's, so the two stack in one form without a seam. Look along the left
 * and right edges — same radius, same hairline, same fill, same inset.
 */
export const BesideInput: Story = {
  render: () => (
    <div className="flex max-w-80 flex-col gap-lg">
      <Input label="Company name" placeholder="Diorama s.r.o." />
      <Input label="Work email" placeholder="name@company.com" />
      <Textarea label="Message" placeholder="Your message" helperText="Up to 120 words" />
    </div>
  ),
};

/**
 * THE BRAND-THEME CASE — mandatory per AGENTS.md step 4.
 *
 * The stress brand's accent is a pale yellow that no white ink survives, so
 * the resolver must re-tone the focus ring and error ink rather than hand the
 * component Diorama's blue. Focus one field in each column to compare.
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
          <Textarea label="Message" rows={3} placeholder="Your message" helperText="Tab in to see focus" />
          <Textarea label="Notes" rows={3} defaultValue="Nope" errorText="This field is required" />
          <Textarea label="Disabled" rows={3} placeholder="Your message" isDisabled />
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

/**
 * The two GROUNDS a field can be cut from (ADR 0017), each with its disabled
 * state beside it — which is the only way to see what the pair is for.
 *
 * The page's disabled fill and chrome's enabled fill are the SAME COLOUR in
 * theme zero. Read down the columns and that stops being a coincidence: what
 * makes one of them "unavailable" and the other "a well you can type into" is
 * the floor underneath, not the fill. Picking the two independently is exactly
 * how an editor panel came to draw its recessed field in the disabled fill.
 */
export const OnEachGround: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex gap-xl">
      <div className="flex w-72 flex-col gap-md rounded-lg bg-base p-lg">
        <p className="text-caption font-body text-ink-muted">on the page — bg-base</p>
        <Textarea label="Enabled" defaultValue="Josef Müller-Brockmann" />
        <Textarea label="Disabled" defaultValue="Josef Müller-Brockmann" isDisabled />
      </div>
      <div className="flex w-72 flex-col gap-md rounded-lg bg-elevated p-lg">
        <p className="text-caption font-body text-ink-muted">on chrome — bg-elevated</p>
        <Textarea label="Enabled" surface="chrome" defaultValue="Josef Müller-Brockmann" />
        <Textarea label="Disabled" surface="chrome" defaultValue="Josef Müller-Brockmann" isDisabled />
      </div>
    </div>
  ),
};
