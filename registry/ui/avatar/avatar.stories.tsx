import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  resolveThemePair,
  toStyleObject,
  THEME_ZERO,
  ZERO_AUTHORED,
  type ThemeSeed,
} from "@bydiorama/tokens";

import { Avatar } from "./avatar.tsx";

const meta = {
  title: "UI/Avatar",
  component: Avatar,
  parameters: { layout: "padded" },
  args: { name: "Miroslava Vrbová" },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center gap-lg py-sm">
    <span className="w-40 shrink-0 text-caption text-ink-muted">{label}</span>
    <div className="flex items-center gap-md">{children}</div>
  </div>
);

// A data URI keeps the story self-contained — no network, no broken image in CI.
const PHOTO =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="%231D1B19"/><circle cx="48" cy="38" r="16" fill="%23DAD4CE"/><ellipse cx="48" cy="84" rx="28" ry="24" fill="%23DAD4CE"/></svg>',
  );

export const Playground: Story = {};

/** Mirrors the sheet: photo and initials, rounded and circle. */
export const Matrix: Story = {
  render: () => (
    <div>
      <Row label="rounded">
        <Avatar name="Miroslava Vrbová" src={PHOTO} shape="rounded" />
        <Avatar name="Miroslava Vrbová" shape="rounded" />
      </Row>
      <Row label="circle">
        <Avatar name="Miroslava Vrbová" src={PHOTO} shape="circle" />
        <Avatar name="Miroslava Vrbová" shape="circle" />
      </Row>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div>
      {(["lg", "md", "sm"] as const).map((size) => (
        <Row key={size} label={`${size}${size === "md" ? " (drawn)" : " (derived)"}`}>
          <Avatar name="Miroslava Vrbová" src={PHOTO} size={size} />
          <Avatar name="Miroslava Vrbová" size={size} />
        </Row>
      ))}
    </div>
  ),
};

export const NameHandling: Story = {
  render: () => (
    <div>
      <Row label="two words">
        <Avatar name="Miroslava Vrbová" />
      </Row>
      <Row label="mononym">
        <Avatar name="Diorama" />
      </Row>
      <Row label="explicit override">
        <Avatar name="Миросла́ва Врбова́" initials="МВ" />
      </Row>
      <Row label="broken src → alt text">
        <Avatar name="Miroslava Vrbová" src="/definitely-missing.png" />
      </Row>
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
        <div className="flex items-center gap-md">
          <Avatar name="Miroslava Vrbová" src={PHOTO} />
          <Avatar name="Miroslava Vrbová" />
          <Avatar name="Diorama" shape="rounded" />
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
