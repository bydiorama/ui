# 0004 — Griddy Icons only

**Status:** accepted · **Date:** 2026-08-02

## Context

Icon sets leak. A single foreign icon imported "just this once" produces two
visual languages in the same interface, and coding agents reproduce whatever
they find in the codebase — so one exception becomes the new convention.

## Decision

`griddy-icons` is the only icon library, for this system and every project that
consumes it. It is a **peer dependency** of the items that need it, installed
once per consumer rather than bundled per component.

Components take icons as **slots** (`icon={<GriddyChevron />}`) wherever
feasible, so icon usage stays visible at the call site instead of buried in the
component.

A missing glyph is a gap filed against the icon set — never a reason to import
lucide, heroicons, radix-icons or a raw inline SVG.

## Enforcement

An ESLint `no-restricted-imports` rule, shipped in the registry's lint config so
consumers inherit it. Docs and examples only ever show Griddy icons, so agents
never learn the wrong pattern from our own material.
