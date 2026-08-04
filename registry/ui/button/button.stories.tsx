import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import {
  resolveThemePair,
  toStyleObject,
  THEME_ZERO,
  ZERO_AUTHORED,
  type ThemeSeed,
} from "@bydiorama/tokens";

import { Button } from "./button.tsx";

const meta = {
  title: "UI/Button",
  component: Button,
  parameters: { layout: "padded" },
  // Without a handler nothing observable happens on activation, which reads as
  // "the button is broken" — it is how a report of Enter not working arose.
  // Every activation path now logs to the Actions panel.
  args: { children: "Create New", onClick: fn() },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center gap-lg py-sm">
    <span className="w-40 shrink-0 text-caption text-ink-muted">{label}</span>
    <div className="flex flex-wrap items-center gap-lg">{children}</div>
  </div>
);

export const Playground: Story = {};

/**
 * Proves activation from every route — pointer, Enter and Space — because the
 * absence of a visible response is indistinguishable from a broken control.
 *
 * Worth knowing while testing by keyboard: pointer-press and Space-hold both
 * paint the `:active` press-scale, but Enter fires activation instantaneously,
 * so the UA applies `:active` for at most a frame and the scale is not
 * perceptible. That is browser behaviour, not a defect — the focus ring is the
 * static cue, and the action itself is the acknowledgement (CONVENTIONS §8:
 * motion is never the only feedback channel).
 */
export const Activation: Story = {
  render: (args) => {
    const [log, setLog] = useState<string[]>([]);
    return (
      <div className="flex flex-col gap-lg">
        <p className="text-body-sm text-ink-muted">
          Focus with Tab, then press Enter or Space. Or click.
        </p>
        <div>
          {/* Args are not spread here: under exactOptionalPropertyTypes the
              optional-and-possibly-undefined arg bag does not satisfy the
              discriminated union that makes aria-label mandatory for
              icon-only buttons. Passing what this story needs keeps that
              guarantee intact. */}
          <Button
            size="lg"
            onClick={(event) => {
              args.onClick?.(event);
              setLog((l) => [`activated ${l.length + 1}×`, ...l].slice(0, 5));
            }}
          >
            Create New
          </Button>
        </div>
        <ul className="text-body-sm text-ink-muted">
          {log.length === 0 ? <li>no activations yet</li> : log.map((l, i) => <li key={i}>{l}</li>)}
        </ul>
      </div>
    );
  },
};

/** Every variant at every size — the sheet's own layout, so a visual diff
 *  against the Paper export is a like-for-like comparison. */
export const Matrix: Story = {
  render: () => (
    <div>
      {(["primary", "secondary", "ghost", "danger"] as const).map((variant) => (
        <Row key={variant} label={variant}>
          {(["lg", "md", "sm"] as const).map((size) => (
            <Button key={size} variant={variant} size={size}>
              Create New
            </Button>
          ))}
          <Button variant={variant} size="sm" shape="rounded">
            Create New
          </Button>
        </Row>
      ))}
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div>
      <Row label="rest">
        <Button size="lg">Create New</Button>
      </Row>
      <Row label="disabled">
        <Button size="lg" isDisabled>
          Create New
        </Button>
      </Row>
      {/* isBusy is deliberately NOT disabled: it keeps focus and stays
          operable, so a keyboard user is not stranded mid-submit. */}
      <Row label="busy (keeps focus)">
        <Button size="lg" isBusy>
          Saving…
        </Button>
      </Row>
      <Row label="full width">
        <Button size="lg" isFullWidth>
          Create New
        </Button>
      </Row>
    </div>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <div>
      <Row label="leading + trailing">
        {(["lg", "md", "sm"] as const).map((size) => (
          <Button key={size} size={size} icon={<Bookmark />} iconEnd={<Chevron />}>
            Create New
          </Button>
        ))}
      </Row>
      <Row label="icon only">
        {(["lg", "md", "sm"] as const).map((size) => (
          <Button
            key={size}
            size={size}
            variant="secondary"
            isIconOnly
            aria-label={`Bookmark this brief (${size})`}
            icon={<Bookmark />}
          />
        ))}
      </Row>
    </div>
  ),
};

/**
 * THE BRAND-THEME CASE — mandatory per AGENTS.md step 4.
 *
 * The same buttons under theme zero and under a deliberately hostile brand.
 * A component that only looks right in Diorama's own colours is not finished:
 * this is the story that would have caught the previous generation's bug,
 * where atoms dropped into a brand-themed surface silently kept Diorama's
 * palette. If the right-hand column does not re-skin, the component is
 * reaching past the token layer.
 */
const STRESS_BRAND: ThemeSeed = {
  colors: {
    bg: "#fffdf5",
    surface: "#ffffff",
    muted: "#f4ecd8",
    textPrimary: "#1a1400",
    textMuted: "#6b5d3f",
    border: "rgba(26, 20, 0, 0.12)",
    // Pale yellow: a white label would vanish on it, so the resolver has to
    // pick dark ink and derive hover/active away from that ink.
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
        {(["primary", "secondary", "ghost", "danger"] as const).map((variant) => (
          <div key={variant} className="py-xs">
            <Button variant={variant} size="md">
              Create New
            </Button>
          </div>
        ))}
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

// Placeholder marks. Real icons come from griddy-icons at the call site
// (CONVENTIONS §7); these exist only so the slots are visible in Storybook.
function Bookmark() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 2h8v12l-4-3-4 3V2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function Chevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="m6 4 4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
