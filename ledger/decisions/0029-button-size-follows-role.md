# 0029 — A Button's size follows its role; density follows the context

**Status:** accepted · 2026-11-27 · amends CONVENTIONS §7b. Raised by the
maintainer and accepted as written on 2026-11-27, including clause 3's scope:
the gate covers live examples only, not stories. Clauses 1–3 are implemented.

## Context

New compositions keep arriving with small buttons. The maintainer noticed it
across this library's own work: the Presence example's "Add a task" and each
row's "Done", Count's "New order", Stagger's "Replay" — every one written as
`size="sm"`, every one a 24px control in a composition with room for the
default.

Nothing in the system asks for that, and nothing prevents it:

- **Button already defaults to `md`.** Every small button is an explicit
  `size="sm"` someone typed.
- **No rule says when `sm` is right.** The Button doc says what each size
  measures (44 / 32 / 24px) and tells you to reach for `lg` on primary page
  actions. It never says when to leave the default, or that `sm` is the WCAG
  2.5.8 floor (24px) rather than a "secondary" size.
- **The examples teach the habit.** The stories hold 56 `size="sm"` Buttons
  against 68 `md`, many of them legitimate size matrices; a new example
  copies the nearest one, and a secondary or utility action reads as "small"
  by instinct.
- **The right lever already exists and is not the obvious one.** ADR 0020 §4
  and ADR 0026 made density the way a screen gets tighter:
  `data-ui-density="compact"` takes every control 4px down (an `md` Button
  becomes 28px) while keeping the hierarchy between sizes. `size="sm"` used to
  make a composition "denser" shrinks one control out of its family instead.

## Decision

1. **Size expresses the control's role, never the screen's density.**
   - `md` (the default) — every action in a composition: a card's actions, a
     form's submit and cancel, a dialog footer, a list's add button, a row's
     own action in an ordinary list. Leave `size` unset.
   - `lg` — the primary action of a page or a touch surface (unchanged).
   - `sm` — a control inside a part that is ALREADY dense by design: a table
     cell, an icon toolbar, a chip or tag row, a panel header's close, a
     control set inline with caption-sized text. Not a secondary action, not
     a quiet one — `variant` says quiet (`ghost`, `secondary`), size does not.
2. **Density is the lever for a tighter screen.** A dense app or region sets
   `data-ui-density="compact"`; it does not pass `size="sm"` down.
3. **Examples are held to it by a gate.** A live example in
   `apps/site/src/examples/` is the code a consumer copies, so a
   `<Button size="sm">` there needs a `size sm:` comment on the line before it
   saying which dense part it sits in. `check:site-source` fails without one.
   Stories are not gated: their size matrices are the point of them.

## Consequences

- The four small Buttons in the motion examples become `md`, as do the
  utility buttons in the six motion components' stories.
- The Button doc gains the rule in `do` / `dont`; the `craft` skill (shipped)
  and `add-component` (authoring) carry it for agents.
- Existing component internals are untouched: their small controls sit in
  dense parts (Knowledge Graph Explorer's panel close, a toolbar), which is
  exactly the `sm` case.
- An agent that reaches for `sm` in an example meets the gate and has to name
  the dense part, which is the moment to ask whether there is one.
