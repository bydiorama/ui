"use client";

import { Popover as BasePopover } from "@base-ui/react/popover";
import { Slider as BaseSlider } from "@base-ui/react/slider";
import { ChevronDown, ChevronUp } from "griddy-icons";
import {
  useId,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

import { cn } from "@/lib/cn";
import { motionMicro } from "@/lib/motion";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { useControllableState } from "@/hooks/use-controllable-state";

/** See the identical note in date-picker.tsx — one shim, one file. */
const forBaseUI = <T,>(props: object) => props as T;

export type ColorPickerSize = "lg" | "md" | "sm";

/**
 * `field` is a form field: a chip, the hex and a chevron, on Select's ladder.
 * `swatch` is a toolbar action: the chip alone inside Button's icon-only box.
 */
export type ColorPickerVariant = "field" | "swatch";

/** A preset colour. `label` is its accessible name — "Brand blue", not "#1B6C84". */
export interface ColorSwatch {
  value: string;
  label: string;
}

/* -------------------------------------------------------------------------- */
/*  Colour maths                                                              */
/*                                                                            */
/*  HSV, not HSL: the area IS saturation × value — x is saturation, y is      */
/*  brightness — so the model the thumb moves in is the model the state is    */
/*  kept in. Hue is held separately from the hex for one reason: at s = 0 or  */
/*  v = 0 every hue produces the same hex, and re-deriving the hue from the   */
/*  value would throw the area's ground back to red the moment a thumb        */
/*  touched an edge.                                                          */
/* -------------------------------------------------------------------------- */

interface Hsva {
  /** 0–360 */
  h: number;
  /** 0–100 */
  s: number;
  /** 0–100 */
  v: number;
  /** 0–1 */
  a: number;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const hex2 = (n: number) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, "0").toUpperCase();

/** Parses #RGB, #RGBA, #RRGGBB and #RRGGBBAA, the `#` optional. Anything else is null. */
export function parseHex(input: string): { r: number; g: number; b: number; a: number } | null {
  const raw = input.trim().replace(/^#/, "");
  if (!/^[0-9a-f]+$/i.test(raw)) return null;
  const full =
    raw.length === 3 || raw.length === 4
      ? [...raw].map((c) => c + c).join("")
      : raw.length === 6 || raw.length === 8
        ? raw
        : null;
  if (!full) return null;
  const n = (i: number) => parseInt(full.slice(i, i + 2), 16);
  return { r: n(0), g: n(2), b: n(4), a: full.length === 8 ? n(6) / 255 : 1 };
}

function rgbToHsv(r: number, g: number, b: number): Omit<Hsva, "a"> {
  const [rr, gg, bb] = [r / 255, g / 255, b / 255];
  const max = Math.max(rr, gg, bb);
  const d = max - Math.min(rr, gg, bb);
  let h = 0;
  if (d !== 0) {
    if (max === rr) h = ((gg - bb) / d) % 6;
    else if (max === gg) h = (bb - rr) / d + 2;
    else h = (rr - gg) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return { h, s: max === 0 ? 0 : (d / max) * 100, v: max * 100 };
}

function hsvToRgb({ h, s, v }: Omit<Hsva, "a">): [number, number, number] {
  const ss = s / 100;
  const vv = v / 100;
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return (vv - vv * ss * Math.max(0, Math.min(k, 4 - k, 1))) * 255;
  };
  return [f(5), f(3), f(1)];
}

/** Upper-case `#RRGGBB`, or `#RRGGBBAA` when `withAlpha`. */
function toHex(c: Hsva, withAlpha: boolean): string {
  const [r, g, b] = hsvToRgb(c);
  return `#${hex2(r)}${hex2(g)}${hex2(b)}${withAlpha ? hex2(c.a * 255) : ""}`;
}

/** Normalises any accepted hex to the form this picker emits, or null. */
export function normalizeHex(input: string, withAlpha: boolean): string | null {
  const p = parseHex(input);
  if (!p) return null;
  return `#${hex2(p.r)}${hex2(p.g)}${hex2(p.b)}${withAlpha ? hex2(p.a * 255) : ""}`;
}

/**
 * The HSV for a hex, keeping `previous`'s hue (and saturation) where the hex
 * cannot say what they were. Black has no hue and no saturation; grey has no
 * hue. Without this, dragging to the bottom edge of the area would reset the
 * area's ground to red and jump the thumb to the left edge.
 */
function hexToHsva(input: string, previous: Hsva): Hsva | null {
  const p = parseHex(input);
  if (!p) return null;
  const next = { ...rgbToHsv(p.r, p.g, p.b), a: p.a };
  if (next.v === 0) return { ...next, h: previous.h, s: previous.s };
  if (next.s === 0) return { ...next, h: previous.h };
  return next;
}

/** What an empty picker shows when it opens: white, hue 0. Nothing is emitted until a control moves. */
const EMPTY: Hsva = { h: 0, s: 0, v: 100, a: 1 };

/* -------------------------------------------------------------------------- */
/*  Geometry                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The field trigger, on Select's ladder (h-field-lg / md / sm — 48 / 40 / 32),
 * transcribed from the sheet's Sizes rows. md and sm add `ps-xs` on the value
 * because their gap is 4 and the chip-to-hex pair reads at 8 on the sheet.
 */
const FIELD = {
  lg: { control: "h-field-lg gap-sm px-field-inset-lg py-sm text-body-md", chip: "size-5", value: "" },
  md: { control: "h-field-md gap-xs px-field-inset-md py-sm text-body-md", chip: "size-5", value: "ps-xs" },
  sm: { control: "h-field-sm gap-xs px-field-inset-sm py-xs text-caption", chip: "size-4", value: "ps-xs" },
} as const satisfies Record<ColorPickerSize, { control: string; chip: string; value: string }>;

/** The chip inside Button's icon-only box (44 / 32 / 24): 24 / 20 / 16. */
const SWATCH_CHIP = { lg: "size-6", md: "size-5", sm: "size-4" } as const satisfies Record<ColorPickerSize, string>;

/**
 * The thumb shared by the area and both tracks.
 *
 * NOT Slider's thumb. Slider's is a white disc with an accent ring, which is
 * legible because it always sits on Slider's own track. These sit on DATA —
 * any colour at all — so no single ink can carry them. Two rings instead: a
 * 2px `--ui-text-on-media` inner ring and a 1px `--ui-bg-media` outer one,
 * the contract's only scheme-invariant light/dark pair (19:1 against black,
 * 17.2:1 against white at the extremes). Whatever the ground, one of the two
 * rings clears it. The fill is the colour the thumb picks.
 */
const THUMB = "size-4 rounded-full border-thick border-ink-on-media shadow-[0_0_0_1px_var(--ui-bg-media)]";

/**
 * Stops for a track gradient, placed on the range the thumb's CENTRE travels.
 *
 * The thumbs stay inside their tracks (Base UI `thumbAlignment: "edge"`), so
 * a centre travels from 8px to the track's width minus 8 — not 0 to 100%.
 * A gradient laid across the full width would sit up to half a thumb out of
 * step with the value: at hue 0 the thumb's centre would be over 10° of
 * orange-red on the sheet's 288px track. Each stop is placed at
 * `8px + (100% − 16px) × k` instead, so the colour under the centre is the
 * colour the thumb reports. The 8px at each end takes the end colour.
 */
function trackGradient(stops: readonly string[]): string {
  const last = stops.length - 1;
  const at = (i: number) => `calc(var(--ui-space-sm) + (100% - 2 * var(--ui-space-sm)) * ${i / last})`;
  return `linear-gradient(to right, ${stops.map((c, i) => `${c} ${at(i)}`).join(", ")})`;
}

// Interpolated in sRGB, the space HSV is defined in. A hue track drawn in
// oklab (Paper's default) passes through colours no hue on it can pick.
const HUE_STOPS = ["#FF0000", "#FFFF00", "#00FF00", "#00FFFF", "#0000FF", "#FF00FF", "#FF0000"] as const;

/**
 * The alpha checker: 8px squares of `--ui-border-subtle` on `--ui-bg-base`.
 * Decorative — 1.47:1 light, 1.34:1 dark — a texture that makes "see-through"
 * legible, not a boundary (SC 1.4.11 does not apply to it).
 */
const CHECKER: CSSProperties = {
  backgroundImage:
    "repeating-conic-gradient(var(--ui-border-subtle) 0 25%, var(--ui-bg-base) 0 50%)",
  backgroundSize: "calc(2 * var(--ui-space-sm)) calc(2 * var(--ui-space-sm))",
};

/* -------------------------------------------------------------------------- */

export interface ColorPickerProps {
  /**
   * Required — a placeholder is not a label (§10). The swatch variant shows no
   * text at all, so the label becomes its accessible name, with the value.
   */
  label: string;
  isLabelHidden?: boolean;
  /**
   * Controlled value: `#RRGGBB`, or `#RRGGBBAA` with `hasAlpha`. Upper-case on
   * the way out; any of #RGB / #RRGGBB / #RRGGBBAA accepted on the way in.
   * `null` means empty.
   */
  value?: string | null;
  defaultValue?: string | null;
  /** Fires on EVERY move — a preview can follow the thumb. Never onChange (§1). */
  onValueChange?: (value: string | null) => void;
  isOpen?: boolean;
  defaultIsOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  /** Defaults to `field`. */
  variant?: ColorPickerVariant;
  /** Defaults to `lg` — the size a form draws. The panel has one size. */
  size?: ColorPickerSize;
  /** Adds the opacity track and field; the value gains two hex digits. */
  hasAlpha?: boolean;
  /** Preset colours, shown as a radio group under the editor. */
  swatches?: readonly ColorSwatch[];
  /** The swatch group's visible name. Defaults to "Swatches". */
  swatchesLabel?: string;
  /**
   * Palette only: no area, tracks or hex — a free colour is the wrong answer
   * here (brand settings, tags). Needs `swatches`.
   */
  isPaletteOnly?: boolean;
  /** What the empty field shows. Not the accessible name. */
  placeholder?: string;
  isDisabled?: boolean;
  helperText?: string;
  /** The error message. Its presence marks the field invalid. */
  errorText?: string;
  /** Where to portal the panel — see the note on DatePicker's `container`. */
  container?: HTMLElement | null;
  className?: string;
}

/**
 * A colour field that opens an editor: a saturation × brightness area, a hue
 * track, an optional opacity track, a hex field and optional preset swatches.
 *
 * The value is LIVE. There is no Save / Cancel — every move emits, and a
 * consumer that needs confirmation holds the value in its own dialog.
 *
 * Composed from what the system already owns: the trigger is Select's field
 * (or Button's icon-only box), the panel is Popover's surface, the tracks are
 * Base UI's slider behaviour, the hex and opacity fields are Input. The 2D
 * area is the one new control, and its keyboard contract is ours.
 */
export function ColorPicker({
  label,
  isLabelHidden = false,
  value,
  defaultValue = null,
  onValueChange,
  isOpen,
  defaultIsOpen,
  onOpenChange,
  variant = "field",
  size = "lg",
  hasAlpha = false,
  swatches,
  swatchesLabel = "Swatches",
  isPaletteOnly = false,
  placeholder = "Pick a colour",
  isDisabled = false,
  helperText,
  errorText,
  container,
  className,
}: ColorPickerProps) {
  const labelId = useId();
  const helperId = useId();
  const errorId = useId();
  const swatchesId = useId();
  const swatchName = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const invalid = Boolean(errorText);

  const [selected, setSelected] = useControllableState<string | null>({
    ...(value !== undefined ? { value } : {}),
    defaultValue,
    ...(onValueChange ? { onChange: onValueChange } : {}),
  });

  const [open, setOpen] = useControllableState<boolean>({
    ...(isOpen !== undefined ? { value: isOpen } : {}),
    defaultValue: defaultIsOpen ?? false,
    ...(onOpenChange ? { onChange: onOpenChange } : {}),
  });

  // The HSV the controls move in. Re-derived when the VALUE changes from
  // outside (a controlled parent, a reset) — but not when the change is the
  // one this picker just emitted, or the hue would be lost at every grey.
  const [hsva, setHsva] = useState<Hsva>(() => (selected ? hexToHsva(selected, EMPTY) : null) ?? EMPTY);
  const [seen, setSeen] = useState(selected);
  if (selected !== seen) {
    setSeen(selected);
    if (selected && normalizeHex(selected, true) !== toHex(hsva, true)) {
      const next = hexToHsva(selected, hsva);
      if (next) setHsva(next);
    }
  }

  const commit = (next: Hsva) => {
    setHsva(next);
    setSelected(toHex(next, hasAlpha));
  };

  const display = selected ? normalizeHex(selected, hasAlpha) : null;
  const hueColor = `hsl(${hsva.h} 100% 50%)`;
  const opaque = toHex({ ...hsva, a: 1 }, false);

  // The hex field edits a DRAFT: a half-typed "#1B6" is not a colour yet.
  // Enter or blur commits; anything unparseable reverts.
  const [draft, setDraft] = useState<string | null>(null);
  const commitHex = () => {
    if (draft === null) return;
    const next = hexToHsva(draft, hsva);
    if (next) commit(hasAlpha && !/^#?([0-9a-f]{4}|[0-9a-f]{8})$/i.test(draft.trim()) ? { ...next, a: hsva.a } : next);
    setDraft(null);
  };
  const [alphaDraft, setAlphaDraft] = useState<string | null>(null);
  const commitAlpha = () => {
    if (alphaDraft === null) return;
    const n = parseFloat(alphaDraft.replace("%", ""));
    if (!Number.isNaN(n)) commit({ ...hsva, a: clamp(Math.round(n), 0, 100) / 100 });
    setAlphaDraft(null);
  };

  const describedBy =
    [errorText ? errorId : null, helperText ? helperId : null].filter(Boolean).join(" ") || undefined;

  const selectedKey = display ? normalizeHex(display, true) : null;
  const checkedSwatch = swatches?.find((s) => normalizeHex(s.value, true) === selectedKey);

  const chip = (chipSize: string) => (
    <span
      data-slot="color-picker-chip"
      aria-hidden="true"
      className={cn("relative shrink-0 overflow-hidden rounded-sm", chipSize, !display && "bg-sunken")}
      style={display && hasAlpha ? CHECKER : undefined}
    >
      {display && (
        // The chip's edge is DECORATIVE: the hex beside it names the colour,
        // so it keeps --ui-border-default (1.94:1) where a swatch, whose edge
        // is its only boundary, needs --ui-border-strong.
        <span className="absolute inset-0 rounded-sm ring ring-inset ring-edge-default" style={{ backgroundColor: display }} />
      )}
    </span>
  );

  const field = FIELD[size];

  return (
    <BasePopover.Root
      {...forBaseUI<ComponentPropsWithoutRef<typeof BasePopover.Root>>({
        open,
        onOpenChange: (next: boolean) => setOpen(next),
      })}
    >
      <div
        data-slot="color-picker"
        data-variant={variant}
        data-size={size}
        className={cn("flex flex-col gap-sm", variant === "field" && "w-full min-w-56", className)}
      >
        <span
          id={labelId}
          data-slot="color-picker-label"
          className={cn(
            "text-label-md font-body text-ink-secondary",
            // The swatch variant has no visible text; its label is the
            // trigger's aria-label, so the visible one would be a duplicate.
            isLabelHidden || variant === "swatch" ? "sr-only" : "px-sm",
          )}
        >
          {label}
        </span>

        {variant === "swatch" ? (
          <BasePopover.Trigger
            {...forBaseUI<ComponentPropsWithoutRef<typeof BasePopover.Trigger>>({
              "data-slot": "color-picker-trigger",
              ...(describedBy ? { "aria-describedby": describedBy } : {}),
              ...(invalid ? { "aria-invalid": true } : {}),
              disabled: isDisabled,
              // Button's own icon-only box and secondary edge, not a copy of
              // them: a swatch trigger is an ACTION in a toolbar.
              render: (
                <Button
                  variant="secondary"
                  size={size}
                  isIconOnly
                  isDisabled={isDisabled}
                  aria-label={`${label}, ${display ?? placeholder}`}
                  icon={chip(SWATCH_CHIP[size])}
                />
              ),
            })}
          />
        ) : (
          <BasePopover.Trigger
            {...forBaseUI<ComponentPropsWithoutRef<typeof BasePopover.Trigger>>({
              "data-slot": "color-picker-trigger",
              "aria-labelledby": `${labelId} ${labelId}-value`,
              ...(describedBy ? { "aria-describedby": describedBy } : {}),
              ...(invalid ? { "aria-invalid": true } : {}),
              disabled: isDisabled,
              className: cn(
                "flex w-full items-center rounded-md",
                field.control,
                "border-hairline bg-field border-edge-subtle font-body text-ink-primary",
                "transition-[border-color,box-shadow]", motionMicro,
                "enabled:hover:border-edge-default enabled:cursor-pointer",
                // Open holds the hover edge, as Combobox's does.
                "data-[popup-open]:border-edge-default",
                "[&_svg]:size-4 [&_svg]:shrink-0",
                invalid && "border-danger data-[popup-open]:border-danger",
                "focus-visible:border-edge-focus focus-visible:shadow-(--ui-focus-ring) focus-visible:forced-colors:outline focus-visible:forced-colors:outline-focus focus-visible:outline-none",
                "disabled:cursor-not-allowed disabled:bg-field-disabled disabled:text-ink-disabled",
              ),
            })}
          >
            {chip(field.chip)}
            <span
              id={`${labelId}-value`}
              data-slot="color-picker-value"
              className={cn("min-w-0 flex-1 truncate text-left font-medium tracking-tight tabular-nums", field.value)}
            >
              {display ?? <span className="font-regular tracking-normal text-ink-placeholder">{placeholder}</span>}
            </span>
            <span data-slot="color-picker-icon" className={cn("shrink-0", isDisabled ? "text-ink-disabled" : "text-ink-muted")}>
              {open ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
            </span>
          </BasePopover.Trigger>
        )}

        <BasePopover.Portal {...forBaseUI<ComponentPropsWithoutRef<typeof BasePopover.Portal>>(container ? { container } : {})}>
          <BasePopover.Positioner
            {...forBaseUI<ComponentPropsWithoutRef<typeof BasePopover.Positioner>>({
              side: "bottom",
              align: "start",
              sideOffset: 8,
              collisionPadding: 8,
              className: "z-(--ui-z-dropdown)",
            })}
          >
            <BasePopover.Popup
              {...forBaseUI<ComponentPropsWithoutRef<typeof BasePopover.Popup>>({
                "data-slot": "color-picker-panel",
                "aria-label": label,
                className: cn(
                  // Popover's surface, at gap-md: the parts are one control,
                  // so they stack tighter than Popover's gap-lg between
                  // separate children.
                  "flex w-80 flex-col gap-md rounded-lg p-lg",
                  "max-h-(--available-height) max-w-(--available-width) overflow-y-auto",
                  "bg-elevated border border-edge-subtle shadow-md text-ink-primary",
                  "transition-[opacity,scale]", motionMicro,
                  "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
                  "data-[starting-style]:scale-98 data-[ending-style]:scale-98",
                  "origin-(--transform-origin)",
                ),
              })}
              ref={panelRef}
              initialFocus={() => {
                const panel = panelRef.current;
                if (!panel) return true;
                if (!isPaletteOnly) return panel.querySelector<HTMLElement>('[data-slot="color-picker-area"]') ?? true;
                // Two queries, not a selector list: a list matches whichever
                // radio comes first in the DOM, not the checked one.
                return (
                  panel.querySelector<HTMLElement>('input[type="radio"]:checked') ??
                  panel.querySelector<HTMLElement>('input[type="radio"]') ??
                  true
                );
              }}
            >
              {!isPaletteOnly && (
                <>
                  <ColorArea hsva={hsva} hueColor={hueColor} onChange={commit} />

                  <ColorTrack
                    label="Hue"
                    slot="color-picker-hue"
                    min={0}
                    max={360}
                    value={Math.round(hsva.h)}
                    valueText={(v) => `${v}°`}
                    background={{ backgroundImage: trackGradient(HUE_STOPS) }}
                    thumbColor={hueColor}
                    onChange={(h) => commit({ ...hsva, h })}
                  />

                  {hasAlpha && (
                    <ColorTrack
                      label="Opacity"
                      slot="color-picker-alpha"
                      min={0}
                      max={100}
                      value={Math.round(hsva.a * 100)}
                      valueText={(v) => `${v}%`}
                      background={CHECKER}
                      overlay={trackGradient([`${opaque}00`, opaque])}
                      thumbColor={toHex(hsva, true)}
                      onChange={(a) => commit({ ...hsva, a: a / 100 })}
                    />
                  )}

                  <div data-slot="color-picker-fields" className="flex gap-sm">
                    <Input
                      label="Hex"
                      isLabelHidden
                      size="sm"
                      surface="chrome"
                      className="min-w-0 flex-1"
                      data-slot="color-picker-hex"
                      spellCheck={false}
                      autoComplete="off"
                      value={draft ?? toHex(hsva, false)}
                      onChange={(e) => setDraft(e.currentTarget.value)}
                      onBlur={commitHex}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          commitHex();
                        } else if (e.key === "Escape" && draft !== null) {
                          // First Escape restores the text; the panel stays.
                          // A second one reaches the popover and closes it.
                          e.preventDefault();
                          e.stopPropagation();
                          setDraft(null);
                        }
                      }}
                    />
                    {hasAlpha && (
                      <Input
                        label="Opacity"
                        isLabelHidden
                        size="sm"
                        surface="chrome"
                        className="w-16 shrink-0"
                        data-slot="color-picker-alpha-field"
                        inputMode="numeric"
                        autoComplete="off"
                        value={alphaDraft ?? `${Math.round(hsva.a * 100)}%`}
                        onChange={(e) => setAlphaDraft(e.currentTarget.value)}
                        onBlur={commitAlpha}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            commitAlpha();
                          } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                            e.preventDefault();
                            const step = (e.shiftKey ? 10 : 1) * (e.key === "ArrowUp" ? 1 : -1);
                            setAlphaDraft(null);
                            commit({ ...hsva, a: clamp(Math.round(hsva.a * 100) + step, 0, 100) / 100 });
                          } else if (e.key === "Escape" && alphaDraft !== null) {
                            e.preventDefault();
                            e.stopPropagation();
                            setAlphaDraft(null);
                          }
                        }}
                      />
                    )}
                  </div>
                </>
              )}

              {swatches && swatches.length > 0 && (
                <div data-slot="color-picker-swatches" className={cn("flex flex-col gap-sm", !isPaletteOnly && "pt-xs")}>
                  <span id={swatchesId} className="text-label-sm font-body text-ink-muted">
                    {swatchesLabel}
                  </span>
                  {/* A NATIVE radio group: one tab stop, arrows move AND
                      select, Space selects — the platform's contract, so the
                      focused swatch is the selected one and the focus ring
                      can replace the selected ring without hiding anything. */}
                  <div role="radiogroup" aria-labelledby={swatchesId} className="flex flex-wrap gap-sm">
                    {swatches.map((swatch) => {
                      const isChecked = swatch === checkedSwatch;
                      return (
                        <label
                          key={swatch.value}
                          data-slot="color-picker-swatch"
                          title={swatch.label}
                          className={cn(
                            "relative size-6 shrink-0 cursor-pointer rounded-sm",
                            // The resting edge is the ONLY boundary a swatch
                            // the colour of the panel has: --ui-border-strong,
                            // 5.36:1 light / 5.68:1 dark on --ui-bg-elevated.
                            "ring ring-inset ring-edge-strong",
                            "transition-[box-shadow]", motionMicro,
                            // Every state is a ring OUTSIDE the swatch — 2px
                            // of the panel, then 2px of a role — because the
                            // fill is the data. Exclusive by construction:
                            // focus wins, then checked, then hover.
                            "has-focus-visible:shadow-(--ui-focus-ring)",
                            "has-focus-visible:forced-colors:outline has-focus-visible:forced-colors:outline-focus",
                            "not-has-focus-visible:has-checked:shadow-[0_0_0_2px_var(--ui-bg-elevated),0_0_0_4px_var(--ui-text-primary)]",
                            "not-has-focus-visible:not-has-checked:hover:shadow-[0_0_0_2px_var(--ui-bg-elevated),0_0_0_4px_var(--ui-border-strong)]",
                          )}
                          style={{ backgroundColor: normalizeHex(swatch.value, true) ?? swatch.value }}
                        >
                          <input
                            type="radio"
                            name={swatchName}
                            value={swatch.value}
                            aria-label={swatch.label}
                            checked={isChecked}
                            onChange={() => {
                              const next = hexToHsva(swatch.value, hsva);
                              if (next) commit(next);
                            }}
                            className="sr-only"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </BasePopover.Popup>
          </BasePopover.Positioner>
        </BasePopover.Portal>

        {errorText && (
          <p data-slot="color-picker-error" id={errorId} className="px-sm text-caption font-body text-danger">
            {errorText}
          </p>
        )}
        {helperText && (
          <p data-slot="color-picker-helper" id={helperId} className="px-sm text-caption font-body text-ink-muted">
            {helperText}
          </p>
        )}
      </div>
    </BasePopover.Root>
  );
}

/* -------------------------------------------------------------------------- */
/*  The area — the one control this system did not already own                */
/* -------------------------------------------------------------------------- */

function ColorArea({ hsva, hueColor, onChange }: { hsva: Hsva; hueColor: string; onChange: (next: Hsva) => void }) {
  const fromPointer = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    onChange({
      ...hsva,
      s: clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100),
      v: clamp(100 - ((e.clientY - rect.top) / rect.height) * 100, 0, 100),
    });
  };

  /**
   * The keyboard path. x is saturation and y is brightness, so the arrows map
   * onto the axes they move along; Shift is ten. Home / End are the
   * saturation extremes and PageUp / PageDown the brightness steps, which is
   * how a 2D control spends the keys a 1D slider uses for its own ends.
   */
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 10 : 1;
    const move: Partial<Record<string, Partial<Hsva>>> = {
      ArrowLeft: { s: hsva.s - step },
      ArrowRight: { s: hsva.s + step },
      ArrowUp: { v: hsva.v + step },
      ArrowDown: { v: hsva.v - step },
      Home: { s: 0 },
      End: { s: 100 },
      PageUp: { v: hsva.v + 10 },
      PageDown: { v: hsva.v - 10 },
    };
    const delta = move[e.key];
    if (!delta) return;
    e.preventDefault();
    const next = { ...hsva, ...delta };
    onChange({ ...next, s: clamp(Math.round(next.s), 0, 100), v: clamp(Math.round(next.v), 0, 100) });
  };

  const s = Math.round(hsva.s);
  const v = Math.round(hsva.v);

  return (
    <div
      data-slot="color-picker-area"
      role="slider"
      tabIndex={0}
      aria-label="Saturation and brightness"
      // A 2D slider has no single number; valuenow carries saturation (the
      // horizontal axis) and valuetext says both.
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={s}
      aria-valuetext={`Saturation ${s}%, brightness ${v}%`}
      onKeyDown={onKeyDown}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        e.currentTarget.focus({ preventScroll: true });
        fromPointer(e);
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) fromPointer(e);
      }}
      className={cn(
        "group/area relative h-40 w-full shrink-0 cursor-crosshair touch-none rounded-md select-none",
        // The ring belongs to the THUMB — it marks where the arrows act — so
        // the area itself draws none. Safe here and only here: nothing on
        // this element reads the outline (see add-component §3).
        "outline-none",
      )}
      style={{
        backgroundColor: hueColor,
        backgroundImage:
          "linear-gradient(to top, #000000, rgb(0 0 0 / 0)), linear-gradient(to right, #FFFFFF, rgb(255 255 255 / 0))",
      }}
    >
      <span
        data-slot="color-picker-area-thumb"
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -translate-x-1/2 -translate-y-1/2",
          THUMB,
          "transition-[box-shadow]", motionMicro,
          "group-focus-visible/area:shadow-(--ui-focus-ring)",
          "group-focus-visible/area:forced-colors:outline group-focus-visible/area:forced-colors:outline-focus",
        )}
        style={{ left: `${hsva.s}%`, top: `${100 - hsva.v}%`, backgroundColor: toHex({ ...hsva, a: 1 }, false) }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Hue and opacity tracks — Base UI's slider behaviour, our paint            */
/* -------------------------------------------------------------------------- */

function ColorTrack({
  label,
  slot,
  min,
  max,
  value,
  valueText,
  background,
  overlay,
  thumbColor,
  onChange,
}: {
  label: string;
  slot: string;
  min: number;
  max: number;
  value: number;
  valueText: (value: number) => string;
  background: CSSProperties;
  overlay?: string;
  thumbColor: string;
  onChange: (value: number) => void;
}) {
  return (
    <BaseSlider.Root
      {...forBaseUI<ComponentPropsWithoutRef<typeof BaseSlider.Root>>({
        "data-slot": slot,
        min,
        max,
        step: 1,
        largeStep: 10,
        value,
        // The thumb stays inside the track, so at 0 and at max it sits flush
        // in the rounded end rather than overhanging the panel's padding.
        thumbAlignment: "edge",
        onValueChange: (next: number | readonly number[]) =>
          onChange(typeof next === "number" ? next : (next[0] ?? min)),
        className: "w-full",
      })}
    >
      <BaseSlider.Control
        {...forBaseUI<ComponentPropsWithoutRef<typeof BaseSlider.Control>>({
          // 16px rows at the panel's 12px rhythm: a 24px circle on any thumb
          // clears the next row by 4px, so SC 2.5.8's spacing exception holds
          // without padding the row (16 + 12 - 24 = 4).
          className: "relative flex h-4 w-full cursor-pointer touch-none items-center select-none",
        })}
      >
        <BaseSlider.Track
          {...forBaseUI<ComponentPropsWithoutRef<typeof BaseSlider.Track>>({
            className: "relative h-4 w-full overflow-visible rounded-full",
            style: background,
          })}
        >
          {overlay && (
            <span aria-hidden="true" className="absolute inset-0 rounded-full" style={{ backgroundImage: overlay }} />
          )}
          <BaseSlider.Thumb
            {...forBaseUI<ComponentPropsWithoutRef<typeof BaseSlider.Thumb>>({
              "data-slot": `${slot}-thumb`,
              // Names the native input inside the thumb, which is the control.
              "aria-label": label,
              getAriaValueText: (_formatted: string, next: number) => valueText(next),
              className: cn(
                THUMB,
                "transition-[box-shadow]", motionMicro,
                "has-focus-visible:shadow-(--ui-focus-ring)",
                "has-focus-visible:forced-colors:outline has-focus-visible:forced-colors:outline-focus",
              ),
              style: { backgroundColor: thumbColor },
            })}
          />
        </BaseSlider.Track>
      </BaseSlider.Control>
    </BaseSlider.Root>
  );
}
