import test from "node:test";
import assert from "node:assert/strict";

import { cn } from "./cn.ts";

const has = (result: string, cls: string) => result.split(" ").includes(cls);

/**
 * The merge config is the least visible load-bearing thing in the library: when
 * it is wrong, a class is simply absent from the DOM — no build error, no
 * missing CSS, nothing to grep. Two shipped bugs lived here and there were no
 * tests at all until this file.
 */

test("a type role and an ink role coexist — they are different properties", () => {
  // Shipped once: every md/sm button label rendered at 16px because the
  // variant's colour merged the size away.
  const result = cn("text-button-sm", "text-ink-primary");
  assert.ok(has(result, "text-button-sm"), `size was dropped: ${result}`);
  assert.ok(has(result, "text-ink-primary"), `colour was dropped: ${result}`);
});

test("a type role does NOT clear a leading role", () => {
  // Shipped once: `leading-flat` then `text-label-sm` produced a Badge with
  // the font's normal leading, so md and sm were both 28px tall. Stock
  // Tailwind sizes bundle a line-height; ours never do (ADR 0009).
  const result = cn("leading-flat", "text-label-sm");
  assert.ok(has(result, "leading-flat"), `leading was dropped: ${result}`);
  assert.ok(has(result, "text-label-sm"), `size was dropped: ${result}`);
});

test("two type roles still merge — the last one wins", () => {
  const result = cn("text-body-md", "text-label-sm");
  assert.ok(!has(result, "text-body-md"), `both sizes survived: ${result}`);
  assert.ok(has(result, "text-label-sm"));
});

test("two leadings merge, including the custom step", () => {
  const result = cn("leading-flat", "leading-snug");
  assert.ok(!has(result, "leading-flat"), `both leadings survived: ${result}`);
  assert.ok(has(result, "leading-snug"));
});

test("two ink roles merge", () => {
  const result = cn("text-ink-muted", "text-ink-primary");
  assert.ok(!has(result, "text-ink-muted"));
  assert.ok(has(result, "text-ink-primary"));
});

test("a consumer's spacing displaces the component's own — §5 forwarding", () => {
  // Shipped once: `px-6` failed to displace `px-md`, so both survived and the
  // winner fell to stylesheet order — the exact thing cn() exists to prevent.
  const result = cn("px-md", "px-6");
  assert.ok(!has(result, "px-md"), `component default survived: ${result}`);
  assert.ok(has(result, "px-6"));

  const named = cn("gap-sm", "gap-xl");
  assert.ok(!has(named, "gap-sm"));
  assert.ok(has(named, "gap-xl"));
});

test("the purpose-named chrome dimensions merge like any spacing step", () => {
  // The emitter mints nav / nav-rail / dialog-md / dialog-lg into
  // `--spacing-*` (emit/tailwind.ts, Chrome dimensions), so `w-dialog-md` is
  // a real utility — Toast ships it. They were omitted from the merge config
  // at first, so a consumer's `w-full` could not displace it: both classes
  // survived and the winner fell to stylesheet order, the px-md failure one
  // namespace over. Every minted name is pinned here so the emitter and the
  // merge config cannot drift apart silently.
  for (const name of ["nav", "nav-rail", "dialog-md", "dialog-lg"]) {
    const width = cn(`w-${name}`, "w-full");
    assert.ok(!has(width, `w-${name}`), `component default survived: ${width}`);
    assert.ok(has(width, "w-full"));

    const cap = cn("max-w-full", `max-w-${name}`);
    assert.ok(!has(cap, "max-w-full"));
    assert.ok(has(cap, `max-w-${name}`));

    // The ARBITRARY form too, which is what a consumer reaches for when the
    // named steps do not fit and what Sheet's and Modal's comments now
    // promise. Both directions, because "the last one wins" is only true if
    // the merger classifies BOTH — and the bug was that it classified
    // neither, kept both classes, and let stylesheet order decide.
    const overridden = cn(`max-w-${name}`, "max-w-[40rem]");
    assert.ok(!has(overridden, `max-w-${name}`), `size survived an override: ${overridden}`);
    assert.ok(has(overridden, "max-w-[40rem]"));

    const capped = cn("max-w-[calc(100vw-3rem)]", `max-w-${name}`);
    assert.ok(!has(capped, "max-w-[calc(100vw-3rem)]"), `cap survived the size: ${capped}`);
    assert.ok(has(capped, `max-w-${name}`));
  }

  // Different properties still coexist — registration must not overreach.
  const kept = cn("w-nav", "h-12");
  assert.ok(has(kept, "w-nav") && has(kept, "h-12"));
});

test("custom font weights merge against stock ones", () => {
  const result = cn("font-book", "font-bold");
  assert.ok(!has(result, "font-book"), `both weights survived: ${result}`);
  assert.ok(has(result, "font-bold"));
});

test("the knowing trade: a stock font size no longer clears a stock leading", () => {
  // Documented here so the trade stays deliberate rather than becoming a
  // surprise. Removing the font-size→leading conflict is what stops our own
  // roles from deleting their leading; the cost is that stock `text-sm` keeps
  // a preceding `leading-6` and the cascade decides. This library emits no
  // stock font sizes, so nothing here is affected — only consumer code.
  const result = cn("leading-6", "text-sm");
  assert.ok(has(result, "leading-6"), `expected the documented trade: ${result}`);
  assert.ok(has(result, "text-sm"));
});

// ── Stroke widths (ADR 0020 §2) ────────────────────────────────────────────
//
// tailwind-merge reads an unknown `border-<word>` as a COLOUR — its default
// colour scale accepts any value. So without registering the width names,
// `border-hairline` and `border-edge-subtle` land in the same group and the
// merger deletes one: a field with no edge, or an edge with no colour.

test("a stroke width and a stroke colour coexist — border, ring and outline", () => {
  for (const [width, colour] of [
    ["border-hairline", "border-edge-subtle"],
    ["border-thick", "border-edge-strong"],
    ["ring-hairline", "ring-edge-control"],
    ["ring-thick", "ring-edge-focus"],
    ["outline-hairline", "outline-edge-default"],
    ["outline-focus", "outline-edge-focus"],
  ]) {
    const result = cn(width!, colour!);
    assert.ok(has(result, width!), `width ${width} was dropped by ${colour}: ${result}`);
    assert.ok(has(result, colour!), `colour ${colour} was dropped by ${width}: ${result}`);
  }
});

test("two stroke widths merge — a consumer's width displaces the component's", () => {
  for (const [a, b] of [
    ["border-hairline", "border-thick"],
    ["ring-hairline", "ring-thick"],
    ["outline-focus", "outline-hairline"],
    ["border-thick", "border-0"],
  ]) {
    const result = cn(a!, b!);
    assert.ok(!has(result, a!), `both widths survived (${a}, ${b}): ${result}`);
    assert.ok(has(result, b!));
  }
});

test("the focus offset merges against a stock offset", () => {
  const result = cn("outline-offset-focus", "outline-offset-0");
  assert.ok(!has(result, "outline-offset-focus"), `both offsets survived: ${result}`);
});
