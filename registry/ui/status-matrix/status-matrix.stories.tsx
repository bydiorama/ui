import { useEffect, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED, type ThemeSeed } from "@bydiorama/tokens";

import { StatusMatrix, type StatusMatrixStatus } from "./status-matrix.tsx";

// Discriminated-union props: the looser Meta/StoryObj form (add-component traps).
const meta: Meta<typeof StatusMatrix> = {
  title: "UI/StatusMatrix",
  component: StatusMatrix,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof StatusMatrix>;

/** A status line: the matrix and the words beside it, as every chat sheet draws it. */
function Line({ status, text, isHeld, size }: { status: StatusMatrixStatus; text: string; isHeld?: boolean; size?: "sm" | "md" }) {
  return (
    <div className="flex items-center gap-sm">
      {status === "progress" ? (
        <StatusMatrix status="progress" value={48} isHeld={isHeld ?? false} size={size ?? "md"} />
      ) : (
        <StatusMatrix status={status} isHeld={isHeld ?? false} size={size ?? "md"} />
      )}
      <span className="font-body text-body-sm text-ink-muted">{text}</span>
    </div>
  );
}

const ROWS: Array<[StatusMatrixStatus, string]> = [
  ["waiting", "Queued"],
  ["typing", "Ana is typing"],
  ["thinking", "Thinking"],
  ["working", "Running 3 tools"],
  ["progress", "Uploading · 48%"],
  ["streaming", "Writing a reply"],
  ["done", "Done in 12 s"],
  ["failed", "Couldn't reach the server"],
  ["stopped", "Stopped by you"],
];

export const Playground: Story = {
  render: () => <Line status="thinking" text="Thinking" />,
};

/** Mirrors the sheet's specimen row: every status at its key frame, held, at both sizes. */
export const Matrix: Story = {
  render: () => (
    <div className="flex gap-2xl rounded-md bg-base p-xl">
      {(["md", "sm"] as const).map((size) => (
        <div key={size} className="flex flex-col gap-md">
          {ROWS.map(([status, text]) => (
            <Line key={status} status={status} text={text} size={size} isHeld />
          ))}
        </div>
      ))}
    </div>
  ),
};

/** The live states moving, beside their held key frames — one live edge per column. */
export const States: Story = {
  render: () => (
    <div className="flex gap-2xl rounded-md bg-base p-xl">
      <div className="flex flex-col gap-md">
        {ROWS.map(([status, text]) => (
          <Line key={status} status={status} text={text} />
        ))}
      </div>
      <div className="flex flex-col gap-sm">
        <Line status="working" text="Gathering brand resources" />
        <div className="flex flex-col gap-sm ps-xl">
          <Line status="done" text="Read the brief" size="sm" isHeld />
          <Line status="working" text="Searching the archive" size="sm" isHeld />
        </div>
      </div>
    </div>
  ),
};

const TURN: Array<[Exclude<StatusMatrixStatus, "progress">, string, number]> = [
  ["waiting", "Connecting", 1500],
  ["thinking", "Thinking", 3000],
  ["working", "Reading the brand grid", 4000],
  ["streaming", "Writing a reply", 4500],
  ["done", "Done in 12 s", 3000],
];

/** One matrix through a whole turn: every change is a hand-over in place. */
export const HandOver: Story = {
  render: function HandOverStory() {
    const [step, setStep] = useState(0);
    useEffect(() => {
      const id = window.setTimeout(() => setStep((s) => (s + 1) % TURN.length), TURN[step]![2]);
      return () => window.clearTimeout(id);
    }, [step]);
    const [status, text] = TURN[step]!;
    return (
      <div className="flex items-center gap-sm rounded-md bg-base p-xl">
        <StatusMatrix status={status} />
        <span role="status" className="font-body text-body-sm text-ink-muted">{text}</span>
      </div>
    );
  },
};

const STRESS_BRAND: ThemeSeed = {
  colors: {
    bg: "#fffdf5", surface: "#ffffff", muted: "#f4ecd8",
    textPrimary: "#1a1400", textMuted: "#6b5d3f",
    border: "rgba(26, 20, 0, 0.12)", accent: "#ffe066",
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
          {ROWS.map(([status, text]) => (
            <Line key={status} status={status} text={text} isHeld />
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
