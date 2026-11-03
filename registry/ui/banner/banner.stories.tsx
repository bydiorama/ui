import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { AlertCircle, AlertTriangle, CheckCircle, InfoCircle } from "griddy-icons";

import {
  resolveThemePair,
  toStyleObject,
  THEME_ZERO,
  ZERO_AUTHORED,
  type ThemeSeed,
} from "@bydiorama/tokens";

import { Banner } from "./banner.tsx";

const meta = {
  title: "UI/Banner",
  component: Banner,
  parameters: { layout: "padded" },
  args: { children: "Exports use the template set in Brand profile." },
} satisfies Meta<typeof Banner>;

export default meta;
type Story = StoryObj<typeof meta>;

const MESSAGE = "Exports use the template set in Brand profile.";

export const Playground: Story = {};

/** Mirrors the sheet's own three rows, in order. */
export const Matrix: Story = {
  render: () => (
    <div className="flex flex-col gap-lg">
      <Banner icon={<InfoCircle size={18} aria-hidden="true" />}>{MESSAGE}</Banner>
      <Banner variant="info">{MESSAGE}</Banner>
      <Banner variant="danger" onDismiss={fn()} dismissLabel="Dismiss export notice">
        {MESSAGE}
      </Banner>
    </div>
  ),
};

/**
 * Every intent. success and warning are DERIVED from the existing intent
 * roles — the sheet draws only neutral, info and danger.
 */
export const States: Story = {
  render: () => (
    <div className="flex flex-col gap-lg">
      {(["neutral", "info", "success", "warning", "danger"] as const).map((variant) => (
        <Banner key={variant} variant={variant} icon={<InfoCircle size={18} aria-hidden="true" />}>
          {`${variant} — ${MESSAGE}`}
        </Banner>
      ))}
      <Banner variant="neutral" onDismiss={fn()} dismissLabel="Dismiss export notice">
        Dismissible. The label names what is being dismissed, since it is read out of context.
      </Banner>
      <Banner variant="warning">
        A message long enough to wrap onto a second line, so the leading glyph and the dismiss
        control stay put while the text reflows underneath them without pushing anything around.
      </Banner>
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
        <div className="flex flex-col gap-md">
          {(["neutral", "info", "danger"] as const).map((variant) => (
            <Banner key={variant} variant={variant}>
              {MESSAGE}
            </Banner>
          ))}
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
 * Title and action (#9 proposals). The action takes the banner's ROLE —
 * `Banner.Action` is the filled primary on info and an outline in the
 * banner's own ink everywhere else (the owner's Audit #9 redesign) — so the
 * five intents read as one family with one emphasis each.
 */
export const TitleAndAction: Story = {
  render: () => (
    <div className="flex max-w-180 flex-col gap-md">
      <Banner
        icon={<InfoCircle aria-hidden="true" />}
        title="Template set changed"
        action={<Banner.Action onClick={fn()}>View profile</Banner.Action>}
      >
        Exports now use the template set in the brand profile Wim Crouwel updated this morning.
      </Banner>
      <Banner
        variant="info"
        icon={<InfoCircle aria-hidden="true" />}
        title="New shared grid"
        action={<Banner.Action onClick={fn()}>Open grid</Banner.Action>}
      >
        Josef Müller-Brockmann shared “Grid systems” with the Zürich studio.
      </Banner>
      <Banner
        variant="success"
        icon={<CheckCircle aria-hidden="true" />}
        title="Published"
        action={<Banner.Action onClick={fn()}>View in archive</Banner.Action>}
      >
        Grid systems is in the archive and visible to every studio.
      </Banner>
      <Banner
        variant="warning"
        icon={<AlertTriangle aria-hidden="true" />}
        title="Layouts off-grid"
        action={<Banner.Action onClick={fn()}>Review layouts</Banner.Action>}
      >
        Two layouts drift from the 8pt baseline. Publishing will keep them as they are.
      </Banner>
      <Banner
        variant="danger"
        icon={<AlertCircle aria-hidden="true" />}
        title="Export failed"
        action={<Banner.Action onClick={fn()}>Renew licence</Banner.Action>}
        onDismiss={fn()}
        dismissLabel="Dismiss export failure"
      >
        The licence for Univers expired on 1 October. Exports will fall back to the body face until it is renewed.
      </Banner>
    </div>
  ),
};

/**
 * The same banner in a 360px container: under 480px the action moves under
 * the message, into the text column, and the dismiss stays on the title's
 * line. The banner is its own container, so this follows the space it is
 * given, not the viewport.
 */
export const Narrow: Story = {
  render: () => (
    <div className="w-90">
      <Banner
        variant="warning"
        icon={<AlertTriangle aria-hidden="true" />}
        title="Layouts off-grid"
        action={<Banner.Action onClick={fn()}>Review layouts</Banner.Action>}
        onDismiss={fn()}
        dismissLabel="Dismiss layout warning"
      >
        Two layouts drift from the 8pt baseline. Publishing will keep them as they are.
      </Banner>
    </div>
  ),
};
