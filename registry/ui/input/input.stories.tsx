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

import { Input } from "./input.tsx";

const meta = {
  title: "UI/Input",
  component: Input,
  parameters: { layout: "padded" },
  args: { label: "Company name", placeholder: "Company name", onChange: fn() },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-start gap-lg py-sm">
    <span className="w-40 shrink-0 pt-sm text-caption text-ink-muted">{label}</span>
    <div className="max-w-80 flex-1">{children}</div>
  </div>
);

export const Playground: Story = {};

/** Mirrors the Paper sheet's own layout, so a visual diff is like-for-like. */
export const Matrix: Story = {
  render: () => (
    <div>
      {(["lg", "md", "sm"] as const).map((size) => (
        <Row key={size} label={size}>
          <Input label="Task title" size={size} placeholder="Task title" />
        </Row>
      ))}
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div>
      <Row label="default">
        <Input label="Company name" placeholder="Company name" />
      </Row>
      <Row label="with value">
        <Input label="Company name" defaultValue="Diorama s.r.o." />
      </Row>
      <Row label="disabled">
        <Input label="Company name" placeholder="Company name" isDisabled />
      </Row>
      <Row label="required">
        <Input label="Company name" placeholder="Company name" isRequired />
      </Row>
      <Row label="helper text">
        <Input
          label="Company name"
          placeholder="Company name"
          helperText="Enter your registered company name"
        />
      </Row>
      <Row label="error">
        <Input label="Company name" placeholder="Company name" errorText="This field is required" />
      </Row>
      <Row label="error + helper">
        <Input
          label="Company name"
          placeholder="Company name"
          helperText="Enter your registered company name"
          errorText="This field is required"
        />
      </Row>
      <Row label="label hidden">
        <Input label="Search" isLabelHidden placeholder="Search…" />
      </Row>
    </div>
  ),
};

/**
 * The trailing slot carries its own button, which needs its own accessible
 * name — the field's label does not describe "reveal password".
 */
export const WithSlots: Story = {
  render: () => {
    const [revealed, setRevealed] = useState(false);
    return (
      <div>
        <Row label="leading icon">
          <Input label="Search" isLabelHidden placeholder="Search…" icon={<SearchIcon />} />
        </Row>
        <Row label="trailing action">
          <Input
            label="Password"
            type={revealed ? "text" : "password"}
            defaultValue="correct-horse"
            iconEnd={
              <button
                type="button"
                onClick={() => setRevealed((v) => !v)}
                aria-label={revealed ? "Hide password" : "Show password"}
                className="flex cursor-pointer items-center justify-center rounded-sm p-xs text-ink-muted hover:text-ink-secondary"
              >
                <EyeIcon />
              </button>
            }
          />
        </Row>
      </div>
    );
  },
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
          <Input label="Company name" placeholder="Company name" helperText="Tab in to see focus" />
          <Input label="Work email" placeholder="name@company.com" errorText="This field is required" />
          <Input label="Disabled" placeholder="Company name" isDisabled />
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

// Placeholder marks. Real icons come from griddy-icons at the call site
// (CONVENTIONS §7); these exist only so the slots are visible in Storybook.
function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M1.5 8s2.5-4 6.5-4 6.5 4 6.5 4-2.5 4-6.5 4-6.5-4-6.5-4Z" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8" cy="8" r="1.75" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
