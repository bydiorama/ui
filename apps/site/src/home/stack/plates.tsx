import { ArrowDown, ArrowUp, Check, Lock } from "griddy-icons";
import type { ReactNode } from "react";
import type { LayerKey } from "./layers";
import { Label, Part, disc, inOrder, paint, rect, role, type Shape } from "./parts";

/*
 * Each layer is a schematic of flat parts, composed edge to edge on
 * the plate's own plane (-104..104 on both axes; Paper: "Stack — Layer assets
 * (top down)", where one unit is two pixels). Parts are neutral and each
 * layer spends the accent once. Fills and strokes are theme roles only, so a
 * plate repaints with whatever brand it sits in.
 */
const A = -104;
const seedRoles = ["bg-base", "bg-surface", "bg-muted", "text-primary", "text-muted", "border-subtle", "bg-accent"];
const derivedRoles = [
  "text-primary", "text-secondary", "text-muted", "text-disabled",
  "text-inverse", "text-link", "text-on-accent", "text-on-emphasis",
  "bg-base", "bg-surface", "bg-elevated", "bg-sunken",
  "bg-field", "bg-muted", "bg-hover", "bg-selected",
  "bg-accent", "bg-accent-hover", "bg-accent-active", "bg-accent-subtle",
  "bg-emphasis", "bg-inverse", "border-subtle", "border-default",
  "border-control", "border-strong", "border-focus", "intent-success-fg",
];

/** Seven swatch bars fill the plate; the knobs sit in a strip behind them. */
function Seed() {
  const items: [number, ReactNode][] = [];
  for (const [cx, turn] of [[-88, 40], [-56, 150], [-24, 250], [8, 320]] as const) {
    const angle = turn * Math.PI / 180;
    items.push([cx - 200, <Part shape={disc(cx, -88, 12)}><path className="stack-ln" d={`M${cx} -88l${(9 * Math.cos(angle)).toFixed(1)} ${(9 * Math.sin(angle)).toFixed(1)}`} /></Part>]);
  }
  items.push([-150, <><path className="stack-ln" d="M34 -88H104" /><Part shape={rect(62, -97, 10, 18)} /></>]);
  seedRoles.forEach((name, index) => {
    const x = A + index * 30.33;
    items.push([x, <Part fill={name} isInk shape={rect(x, -64, 26, 168)} />]);
  });
  return <>{inOrder(items)}</>;
}

/** A chip: seven inputs, one core, and every derived role as a light and a dark pad. */
function Resolver() {
  const y = (row: number) => -84 + row * 28;
  const tap = (row: number) => -36 + row * 12;
  const items: [number, ReactNode][] = [];
  const traces: string[] = [];
  seedRoles.forEach((name, row) => {
    items.push([A + y(row), <Part fill={name} isInk shape={rect(A, y(row) - 6, 12, 12)} />]);
    traces.push(`M-92 ${y(row)}H-80L-70 ${tap(row)}H-60M-12 ${tap(row)}H-2L8 ${y(row)}H16`);
  });
  items.push([-36, (
    <Part fill="bg-accent" isInk shape={rect(-60, -46, 48, 92, 3)}>
      <rect className="stack-ln" x={-50} y={-36} width={28} height={72} rx={1.5} style={{ stroke: role("text-on-accent") }} />
      <path className="stack-ln" d="M-50 -24l10 -12" style={{ stroke: role("text-on-accent") }} />
    </Part>
  )]);
  derivedRoles.forEach((name, index) => {
    const x = 16 + (index % 4) * 24;
    const cy = y(Math.floor(index / 4));
    // One role, read once in each scheme: the pad on the left is its light value.
    const pair: Shape = (className, fill) => <>
      <rect className={`stack-f ${className} stack-light`.trim()} x={x} y={cy - 5} width={8} height={10} rx={1} style={paint(fill)} />
      <rect className={`stack-f ${className} stack-dark`.trim()} x={x + 8} y={cy - 5} width={8} height={10} rx={1} style={paint(fill)} />
    </>;
    items.push([x + cy, <Part fill={name} isInk shape={pair} />]);
  });
  return <><path className="stack-ln" d={traces.join("")} style={{ stroke: role("border-default") }} />{inOrder(items)}</>;
}

/** A specimen board in four bands: colour, space, radius, then stroke and motion. */
function Tokens() {
  const items: [number, ReactNode][] = [];
  ["bg-surface", "bg-elevated", "bg-sunken", "border-default", "border-strong", "text-muted", "text-primary", "bg-accent"].forEach((name, index) => {
    const x = A + index * 26.57;
    items.push([x - 93, <Part fill={name} isInk shape={rect(x, A, 22, 22)} />]);
  });
  let x = A;
  [4, 8, 12, 16, 24, 32, 48].forEach(width => {
    items.push([x - 46, <Part shape={rect(x, -66, width, 40)} />]);
    x += width + 10.67;
  });
  [2, 5, 9, 13, 17].forEach((radius, index) => {
    const left = A + index * 43.5;
    items.push([left + 5, <Part shape={rect(left, -12, 34, 34, radius)} />]);
  });
  for (const [thickness, top] of [[2, 42], [3.5, 60], [5, 79]] as const) {
    items.push([-56 + top, <Part fill="text-primary" isInk shape={rect(A, top, 96, thickness, 1)} />]);
  }
  items.push([60, <><rect className="stack-ln2" x={8} y={36} width={96} height={68} rx={1.5} /><path className="stack-ln" d="M14 98C30.8 98 14 42 98 42" /></>]);
  items.push([112, <Part shape={disc(14, 98, 3)} />]);
  items.push([140, <Part fill="bg-accent" isInk shape={disc(98, 42, 4.5)} />]);
  return <>{inOrder(items)}</>;
}

/** A list with one row in focus, the keys that move it, and an anchored
 *  panel. Shapes only: no placeholder lines and no pointer. */
function Behaviour() {
  const keys: [number, number, ReactNode][] = [
    [36, A, <ArrowUp x={44} y={-96} size={16} style={{ fill: role("text-primary") }} />],
    [72, A, <ArrowDown x={80} y={-96} size={16} style={{ fill: role("text-primary") }} />],
    [36, -68, <Label x={52} y={-48.5} size={10} weight={600} fill="text-primary" anchor="middle">esc</Label>],
    [72, -68, <Label x={88} y={-48.5} size={10} weight={600} fill="text-primary" anchor="middle">tab</Label>],
  ];
  return <>
    <Part shape={rect(A, A, 124, 208, 3)} />
    {Array.from({ length: 6 }, (_, row) => {
      const isFocused = row === 2;
      return <Part key={row} fill={isFocused ? "bg-accent" : "bg-surface"} isInk={isFocused} shape={rect(-96, -96 + row * 33, 108, 26, 2)} />;
    })}
    {keys.map(([x, y, face], index) => <Part key={index} shape={rect(x, y, 32, 32, 3)}>{face}</Part>)}
    <rect className="stack-ln2" x={36} y={78} width={68} height={26} rx={1.5} />
    <Part shape={rect(36, -14, 68, 18, 2)} />
    <Part shape={rect(36, 8, 68, 66, 3)} />
  </>;
}

/** A kit laid out as a board: field, choice controls, a card, and the actions. */
function Components() {
  const items: [number, ReactNode][] = [
    [-190, (
      <Part fill="bg-field" shape={rect(A, A, 208, 34, 3, " stack-ctl")}>
        <Label x={-90} y={-82.5} size={12} weight={400} fill="text-primary">Cipe Pineles</Label>
        <path className="stack-ln" d="M-13 -95v16" />
      </Part>
    )],
    [-132, <Part fill="bg-emphasis" isInk shape={rect(A, -56, 28, 28, 3)}><Check x={-99} y={-51} size={18} style={{ fill: role("text-on-emphasis") }} /></Part>],
    [-92, <Part shape={disc(-50, -42, 14)}><circle cx={-50} cy={-42} r={5.5} style={{ fill: role("text-primary") }} /></Part>],
    [-38, <Part fill="bg-accent-legible" isInk shape={rect(-22, -56, 52, 28, 14)} />],
    [-26, <Part fill="bg-base" shape={disc(16, -42, 10.5)} />],
    [30, <Part fill="bg-sunken" shape={rect(44, -44, 60, 4, 2)} />],
    [38, <Part shape={disc(82, -42, 9)} />],
    [-8, (
      <Part shape={rect(A, -12, 100, 116, 3)}>
        <rect className="stack-edge" x={-96} y={-4} width={84} height={46} rx={1.5} style={{ fill: role("bg-sunken") }} />
      </Part>
    )],
    [28, <Part fill="bg-accent-subtle" shape={rect(8, -12, 44, 20, 10)} />],
    [79, <Part shape={rect(58, -12, 46, 20, 10)} />],
    [95, <Part shape={rect(8, 22, 96, 34, 3, " stack-ctl")}><Label x={56} y={43.5} size={12} weight={600} fill="text-muted" anchor="middle">Cancel</Label></Part>],
    [143, <Part fill="bg-accent" isInk shape={rect(8, 70, 96, 34, 3, " stack-ctl")}><Label x={56} y={91.5} size={12} weight={600} fill="text-on-accent" anchor="middle">Publish</Label></Part>],
  ];
  return <>{inOrder(items)}</>;
}

/**
 * A film of measurements, registered over the Components board below it, so
 * every mark sits on the thing it measures. Layout: two dimension lines in
 * the gaps between components, in the design sheet's pixels. Contrast: a
 * reading on the field. Visual diff: a reading on the card's image, beside
 * the two schemes it was compared in. Focus: the outline around Publish.
 */
function Proof() {
  const ink = { stroke: role("text-secondary") };
  const schemes: Shape = (className, fill) => <>
    <rect className={`stack-f ${className} stack-light`.trim()} x={-40} y={11} width={8} height={16} rx={1} style={paint(fill)} />
    <rect className={`stack-f ${className} stack-dark`.trim()} x={-32} y={11} width={8} height={16} rx={1} style={paint(fill)} />
  </>;
  return <>
    <path className="stack-ln" d="M-104 -63H-18M18 -63H104M-104 -67v8M104 -67v8" style={ink} />
    <Label x={0} y={-59.8} size={9} weight={600} fill="text-secondary" anchor="middle" isNumeric>416</Label>
    <path className="stack-ln" d="M8 15H40M72 15H104M8 11v8M104 11v8" style={ink} />
    <Label x={56} y={18.2} size={9} weight={600} fill="text-secondary" anchor="middle" isNumeric>192</Label>
    <Part fill="bg-inverse" isInk shape={rect(36, -97, 62, 20, 10)}><Label x={67} y={-83.5} size={10} weight={600} fill="text-inverse" anchor="middle" isNumeric>AA 4.5:1</Label></Part>
    <Part shape={rect(-90, 9, 44, 20, 10)}><Label x={-68} y={22.5} size={10} weight={600} fill="text-primary" anchor="middle" isNumeric>0 px</Label></Part>
    <Part fill="bg-base" isInk shape={schemes} />
    <rect x={3} y={65} width={106} height={44} rx={6} fill="none" strokeWidth={2} style={{ stroke: role("border-focus") }} />
  </>;
}

/** A project: a title bar, the three files that arrived, and the lockfile under them. */
function App() {
  return <>
    <Part fill="bg-sunken" shape={rect(A, A, 208, 18, 3)} />
    {["ui/button.tsx", "ui/button.doc.ts", "lib/cn.ts"].map((file, index) => {
      const y = -70 + index * 42;
      return (
        <Part key={file} fill="bg-base" shape={rect(A, y, 208, 34, 3)}>
          <rect className="stack-ln" x={-94} y={y + 11} width={12} height={12} rx={1.5} />
          <Label x={-72} y={y + 21} size={11} weight={500} fill="text-primary">{file}</Label>
          <Check x={82} y={y + 9} size={16} style={{ fill: role("intent-success-fg") }} />
        </Part>
      );
    })}
    <Part fill="bg-base" shape={rect(A, 64, 208, 40, 3)}>
      <Lock x={-96} y={75} size={18} style={{ fill: role("text-primary") }} />
      <Label x={-72} y={88.5} size={12.5} weight={600} fill="text-primary">ui.lock.json</Label>
    </Part>
    <Part fill="bg-accent" isInk shape={rect(42, 74, 54, 20, 10)}><Label x={69} y={87.5} size={9.5} weight={600} fill="text-on-accent" anchor="middle">current</Label></Part>
  </>;
}

export const plates: Record<LayerKey, () => ReactNode> = { seed: Seed, resolver: Resolver, tokens: Tokens, behaviour: Behaviour, components: Components, proof: Proof, app: App };
