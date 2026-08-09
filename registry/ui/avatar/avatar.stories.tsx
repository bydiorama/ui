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

/** Mirrors the sheet's own four tiles: photo and initials, soft and full. */
export const Matrix: Story = {
  render: () => (
    <div>
      <Row label="soft">
        <Avatar name="Miroslava Vrbová" src={PHOTO} shape="soft" />
        <Avatar name="Miroslava Vrbová" shape="soft" />
      </Row>
      <Row label="full">
        <Avatar name="Miroslava Vrbová" src={PHOTO} shape="full" />
        <Avatar name="Miroslava Vrbová" shape="full" />
      </Row>
    </div>
  ),
};

/**
 * The sheet's second section. The counter is the same tile as an avatar with
 * no photo, so a stack reads as one object rather than as avatars plus a chip.
 */
export const Group: Story = {
  render: () => (
    <div>
      <Row label="stack">
        <Avatar.Group>
          <Avatar name="Miroslava Vrbová" src={PHOTO} />
          <Avatar name="Peter Roth" />
          <Avatar name="Dana Ilic" />
        </Avatar.Group>
      </Row>
      <Row label="stack + counter">
        <Avatar.Group max={3} overflowLabel="4 more people">
          <Avatar name="Miroslava Vrbová" src={PHOTO} />
          <Avatar name="Peter Roth" />
          <Avatar name="Dana Ilic" />
          <Avatar name="Anna Kis" />
          <Avatar name="Bo Lin" />
          <Avatar name="Cy Ray" />
          <Avatar name="Eve Novak" />
        </Avatar.Group>
      </Row>
      <Row label="full, lg">
        <Avatar.Group max={2} overflowLabel="2 more people" size="lg" shape="full">
          <Avatar name="Miroslava Vrbová" src={PHOTO} size="lg" shape="full" />
          <Avatar name="Peter Roth" size="lg" shape="full" />
          <Avatar name="Dana Ilic" size="lg" shape="full" />
          <Avatar name="Anna Kis" size="lg" shape="full" />
        </Avatar.Group>
      </Row>
    </div>
  ),
};

/**
 * The sheet's third section. Every dot carries a LABEL as well as a colour —
 * the type insists, because a colour on its own is not a message.
 */
export const Status: Story = {
  render: () => (
    <div>
      {(["soft", "full"] as const).map((shape) => (
        <Row key={shape} label={shape}>
          <Avatar name="Miroslava Vrbová" src={PHOTO} shape={shape} status="success" statusLabel="Online" />
          <Avatar name="Peter Roth" shape={shape} status="neutral" statusLabel="Away" />
          <Avatar name="Dana Ilic" shape={shape} status="danger" statusLabel="Do not disturb" />
        </Row>
      ))}
      <Row label="sizes">
        {(["lg", "md", "sm"] as const).map((size) => (
          <Avatar key={size} name="Miroslava Vrbová" src={PHOTO} size={size} status="success" statusLabel="Online" />
        ))}
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

/**
 * The composition that found the defect, and the answer to it.
 *
 * An avatar used to carry a full-perimeter hairline in the page's colour —
 * which is what shadcn, MUI, Atlassian and Flowbite all ship, and what MUI has
 * on file as #21700. Three of that ring's four sides never touch another
 * avatar: they sit on the ground claiming to BE the ground, so the moment an
 * avatar is on a card, a menu panel or a table row it wears a visible
 * mismatched rim. A lone avatar wore it for nothing at all.
 *
 * Now nothing is painted except the seam, on the leading edge of a stacked
 * child, where it lands on the avatar beneath it. Every ground below is
 * unbound — there is nothing left to reconcile.
 */
export const OnOtherGrounds: Story = {
  render: () => {
    const GROUNDS = [
      { label: "bg-surface — the seam's default colour", ground: "bg-surface" },
      { label: "bg-elevated — a card, a menu panel", ground: "bg-elevated" },
      { label: "bg-sunken — a well", ground: "bg-sunken" },
      { label: "bg-accent-subtle — a selected table row", ground: "bg-accent-subtle" },
    ] as const;
    return (
      <div className="flex flex-col gap-md">
        {GROUNDS.map(({ label, ground }) => (
          <div key={label} className={`rounded-lg p-lg ${ground}`}>
            <p className="pb-sm text-caption text-ink-muted">{label}</p>
            <div className="flex items-center gap-xl">
              {(["soft", "full"] as const).map((shape) => (
                <div key={shape} className="flex items-center gap-md">
                  {/* Lone — no edge of its own, so no ground to be wrong about. */}
                  <Avatar name="Miroslava Vrbová" src={PHOTO} shape={shape} status="success" statusLabel="Online" />
                  {/* Stacked — the seam, and only where it does work. */}
                  <Avatar.Group max={3} overflowLabel="2 more people" shape={shape}>
                    <Avatar name="Mira Vance" src={PHOTO} shape={shape} />
                    <Avatar name="Peter Roth" shape={shape} />
                    <Avatar name="Dana Ilic" shape={shape} />
                    <Avatar name="Anna Kis" shape={shape} />
                    <Avatar name="Bo Lin" shape={shape} />
                  </Avatar.Group>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  },
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
          <div className="flex items-center gap-md">
            <Avatar name="Miroslava Vrbová" src={PHOTO} />
            <Avatar name="Miroslava Vrbová" />
            <Avatar name="Diorama" shape="full" />
          </div>
          {/* The dots are inside the themed subtree on purpose: their fills are
              intent roles, and a brand seed re-tones them. */}
          <div className="flex items-center gap-md">
            <Avatar name="Mira Vance" status="success" statusLabel="Online" />
            <Avatar name="Peter Roth" status="neutral" statusLabel="Away" />
            <Avatar name="Dana Ilic" status="danger" statusLabel="Do not disturb" />
          </div>
          <Avatar.Group max={2} overflowLabel="2 more people">
            <Avatar name="Mira Vance" src={PHOTO} />
            <Avatar name="Peter Roth" />
            <Avatar name="Dana Ilic" />
            <Avatar name="Anna Kis" />
          </Avatar.Group>
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
