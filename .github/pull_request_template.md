<!--
Title pattern: <Area>: <specific change or visible outcome>
Use the component or layer a reviewer would search for, such as Tabs, Site,
CLI, Docs, fx or ADR 0028. Include an ADR number when it explains the change.

Examples from merged PRs:
  Site: the box's strip steps by centred arrows alone
  CLI: send GITHUB_TOKEN to the GitHub API and explain a rate limit

For a small site, docs or tooling PR, keep “What changed and why” and “Gates”.
Keep the other sections where they help a consumer or reviewer.
-->

## What changed and why

<!-- Describe what someone encountered, why it happened, and what they will see now. Link the issue, design or earlier PR when it explains the decision. -->

## Consumers affected and migration

<!-- For distributed changes, name the manifest items and what an app with a source copy needs to do. Call out breaking prop, token and slot changes. -->

| Item | Change | What a consumer does |
| --- | --- | --- |
| | | |

## Ledger entries

<!-- Link the entries for distributed changes. Check that each entry names the items it affects. -->

## Visual baselines

<!-- For changed registry visuals, identify the cases and schemes reviewed on macOS and Linux. Link the Generate visual baselines workflow run for Linux. For site visuals, describe the viewport, theme and interaction you checked. -->

## Design spec and geometry

<!-- Link the Paper node, geometry spec and matching browser case where applicable. State which geometry is still unmeasured and record unresolved design questions in needsDesign. -->

## Gates

<!-- List the exact commands run, with results. Include pnpm verify and the relevant type, lint, browser, site or visual checks. Describe scoped runs and outstanding checks explicitly. For a new gate, give the probe that made it fail. -->

## Notes for the reviewer

<!-- Give a short path to reproduce the original issue or inspect a design decision. Include measurements, screenshots or a known limitation when they help the reviewer decide. -->
