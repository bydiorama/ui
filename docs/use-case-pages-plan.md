# Use case landing pages plan

Date: 2026-11-13. Status: design prototype; implementation is future work.

Create a public page family that helps product teams evaluate Diorama UI in
the context of their own work. Start with AI workspaces, then finance operations
and SaaS dashboards. Each page earns its place through distinct examples built
from existing registry items. This proposal does not change the library build
order in PLAN.md or add a component, theme, or runtime integration.

Paper destination: [Public Page Examples](https://app.paper.design/file/01M5D1CCKC5MQZ9JZJ83G954CR/p-8-0).

## Audience and conversion

The primary visitor is a product designer or frontend engineer evaluating a
library for a real application. The internal champion needs a concrete example
to share with a technical lead. A prospective Diorama client needs to see the
quality and range of the work before considering a conversation.

The main conversion is from a relevant example to its component references and
working source distribution path. A secondary path to bydiorama.com can serve
services prospects. Keep it below the useful examples; do not introduce a demo
form or email gate into the library's main adoption path.

## Page architecture

Use `/use-cases/` as the directory and `/use-cases/<slug>/` for editorial
landing pages. Keep `/examples/<slug>/` for focused runnable compositions when
those exist. Use Cases is a navigation destination; Examples remains a separate
destination with a different job. Link the hub from the current Examples area
before expanding the top navigation. Do not publish links to unbuilt pages.

Each use-case page contains:

1. Breadcrumb, a domain-specific H1, a short promise grounded in the library,
   an Explore patterns anchor and Browse components link.
2. A substantial, readable product composition using registry components,
   with appearance controls, sample-data caption and clear composition status.
3. Two further workflow examples that answer different product questions.
4. A short explanation of source ownership and the application responsibilities.
5. A component map with links to references and explicit experimental labels.
6. Domain-specific questions answered with Accordion.
7. Related use cases with distinct examples, plus a final component adoption link.

Keep the directory distinct from a component gallery. It answers “what can I
build?”; the gallery answers “which primitive do I need?”. Avoid interchangeable
pages differing only by an industry noun.

## Domain sequence

Priority is editorial judgment based on component fit and how distinct an example
can be today. Search phrases below are hypotheses, not search-volume findings.
“Domain” here means product category on the existing library website, not a new
internet domain or microsite.

| Order | Domain and proposed slug | Example workflows | Existing items | Search intent hypothesis and champion |
| --- | --- | --- | --- | --- |
| 1 | AI workspaces `ai-workspaces` | Guided conversation; visible agent progress and recovery; review an output before acting | Header, Sidebar, ChatComposer, ChatMessage, ChatProgress, ChatQuestionnaire, Table, Badge, Button, Card | React AI workspace UI; agent chat interface components. AI product designer or frontend lead |
| 2 | Finance operations `finance-operations` | Transaction review; invoice approval; reconcile a filtered exception list | Table, DatePicker, Select, Input, Badge, Card, Modal, Button | React finance dashboard UI; transaction table example. Fintech product lead |
| 3 | SaaS dashboards `saas-dashboards` | Account overview; activity exploration; empty and loading states | Card, Table, Tabs, Progress, Skeleton, EmptyState; Chart and Sparkline are experimental | React SaaS dashboard components. Startup engineer or design lead |
| 4 | Customer support `customer-support` | Ticket queue; conversation detail; assisted reply | Table, Sidebar, ChatMessage, ChatComposer, Badge, Select, Sheet | Support dashboard UI; customer service inbox components. Support product owner |
| 5 | Client portals `client-portals` | File collection; review request; project status | ImageUpload, Thumbnail, Card, Avatar, Progress, DatePicker, Table | React client portal UI; approval workflow UI. Agency or professional services lead |
| 6 | Revenue operations `revenue-operations` | Account list; lead qualification; approval of a next step | Table, Input, Select, Badge, Accordion, Modal | CRM dashboard components; sales operations UI. Revenue tooling lead |
| 7 | Team administration `team-administration` | Invite members; permissions form; workspace preferences | Table, Avatar, Checkbox, Switch, Select, Modal, Input | React admin UI; team management interface. Platform frontend lead |
| 8 | Research and knowledge `research-workspaces` | Search results; source review; related information | Input, Tabs, Table, Card; ChatSources and KnowledgeGraphExplorer are experimental | Knowledge workspace UI; research assistant interface. Knowledge product designer |

Finance stays focused on operational interfaces. Trading terminals and medical
workflows would need distinct behavior and domain validation not supplied by
this library. Do not make regulatory or financial correctness claims.

## Reference research

Mobbin MCP searches were scoped to a marketing hero, an industry feature section,
an AI workspace and a finance screen. The observations below describe visible
structure, not conversion results or reasons the products chose it.

| Reference | Visible pattern | Application here |
| --- | --- | --- |
| [Frontify developer hero](https://mobbin.com/sites/sections/67380933-75aa-40ed-b13c-617db6250c9c) | Specific developer headline beside a large product image | Put a real composition directly after the promise; use our own components and brand |
| [1Password developer hero](https://mobbin.com/sites/sections/330752c2-0212-49ba-a09a-ea977cbab9b7) | Audience named in headline; documentation and trial actions | Pair a workflow anchor with a component reference path |
| [Deel industry directory](https://mobbin.com/sites/sections/6b61f809-2362-4009-9fec-a87b443ebf06) | Industry destinations are individually titled | Give each domain a legible destination with a different composition |
| [Heron AI use cases](https://mobbin.com/sites/sections/7fb39024-7787-4326-9985-98fa69c6b46b) | Roles are presented as an expandable list beside a large visual | Explain the workflow and intended builder rather than listing generic capabilities |
| [Searchable agent workspace](https://mobbin.com/screens/dd0457c4-ff95-4fdf-97b3-65c7ed61e212) | Narrow persistent navigation and a dominant conversation composer | Keep the thread dominant and context visible |
| [Plane AI workspace](https://mobbin.com/screens/567b285a-8208-4b65-b8fb-fd37b2c11237) | Workspace context, suggestions and composer in the central work area | Show a concrete task with realistic context |
| [Revolut account screen](https://mobbin.com/screens/7f180f45-c28a-4159-b8e2-45b1032b3eff) | Transactions and account actions occupy the main area | Make the future finance page about reviewing transactions rather than decorative charts |

Fresha and Meetup appeared in the finance pull but are not finance-product
evidence. Rox's returned feature section did not show a readable product preview;
it is not a model for the primary specimen.

## First prototype

Working title: **Build AI workspaces people can follow.**

The main specimen is a fictional launch-review workspace. A user asks the agent
to compare launch risks, the answer stays readable on the page, and a separate
review surface names decisions and owners. All content and statuses are sample
data. The two supporting examples show a failed retrieval with a retry path and
a review handoff. These demonstrate visible behavior already represented by the
library without implying an agent backend or a ready-made app.

Use the existing SiteHeader and footer language, Aspekta only, theme-zero roles,
the existing 4px spacing rhythm and current control geometry. Build a 1280px
desktop and a 320px minimum-width mobile page in both schemes. A stress-brand
specimen checks that the main workflow is not dependent on blue. Keep effects
off for the first prototype.

At 320px, replace the app sidebar with the existing Header menu control, collapse
the review area into the document flow, stack supporting examples, and keep
controls at their actual size. Never scale down the desktop application. In the
future interactive example, the mobile menu opens Sheet containing Sidebar;
the static page only illustrates the closed state.

The mobile composer uses the existing `body-lg` role at 16px through the
component's existing `className` and `data-slot` styling surface. Its default
body role is smaller. Keep this explicit composition override in the authored
example; it is not a new prop or a change to the distributed component.

This is a site composition, not a new registry component or an installable block.
Do not draw Copy app or Install workspace actions. Component references are the
working adoption destination. Component examples already in the site remain
the current source to inspect until these compositions are implemented.

## Motion direction

Motion communicates an application state; it is not decoration for the landing
page. The Paper storyboard illustrates states and timing intent, not a working
animation.

| Trigger | Motion and existing contract | Static cue and reduced motion |
| --- | --- | --- |
| First page load | Content is visible immediately; no scroll-triggered reveal | Identical content without motion |
| Prompt submitted | Existing Button press scale; sender message appears once | Sent message stays visible; no movement required |
| Agent working | Existing ChatProgress owns the only live status animation for the turn | Named activity and textual state remain; hold the status matrix |
| Work settles | Existing state transition using `--ui-motion-micro`; no re-stagger of rows | Completed or failed text, icon and retry action |
| Composer wraps | Existing ChatComposer measurement and layout behavior | Retain its measured final layout without transition |
| Scheme or brand changes | Suppress theme transitions as the current site does | Immediate repaint with no flash or tween |

No new motion token, CSS material or shader is proposed. Do not advertise a
measured-progress percentage when the application has no known total.

## Implementation sequence

Implementation starts after design review; this task only creates design and
planning artifacts.

1. **Content contract and routes.** Add a typed use-case definition with a closed
   slug, title, lead, workflow identifiers, example references and component IDs
   validated against `ui.manifest.json`. Derive display names and experimental
   status from the manifest. Keep site editorial content in `apps/site`, not in
   the distributable item manifest. Validate duplicate slugs, missing examples,
   broken component references and empty workflow explanations at build time.
2. **AI compositions.** Author type-checked example files importing registry
   source. Provide deterministic sample state, reset, keyboard paths and honest
   app-owned data seams. Expose the same file in the preview and source view.
   Use Header, Sidebar and Sheet according to Patterns Navigation. No app data
   layer goes into `registry/`.
3. **Page family.** Add hub, detail template, standalone example routes and
   responsive compositions. Connect the existing appearance store and library
   controls. Set one document banner and name nested navigation landmarks.
   Include sample-data and composition status captions.
4. **Discovery.** Add crawlable internal links, canonical URLs, unique titles and
   descriptions, sitemap entries and a useful Markdown twin/agent index entry.
   Use descriptive example captions as text, not only inside screenshots.
   Do not index placeholder domains, publish duplicated industry pages, or
   promise search placement. Every published page must have distinct workflows
   and usable examples. This follows [Google's people-first content guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
   and [spam policies](https://developers.google.com/search/docs/essentials/spam-policies).
5. **Validation and release.** Inspect 320px and 1280px, light/dark and stress
   brand, keyboard operation, focus retention, 200% text zoom, reduced motion,
   example state changes, overflow and axe. Run `pnpm verify`, `pnpm type-check`,
   `pnpm lint`, `pnpm site:build` and `pnpm test:site`. Regenerate site data when
   its inputs change. If a distributed item changes, add its ledger entry,
   rebuild registry/site data and run its required browser and visual checks.
   Do not promote a composition to a block merely to obtain an install button.
6. **Learn before expanding.** Instrument use-case view, pattern selection,
   component reference visit and existing source/install copy events with a
   use-case identifier. Avoid prompt text or personal data. Review per-page
   organic entrances, pattern exploration and component adoption after 30 days;
   compare against its own baseline before expanding the next domain. There is
   no numeric growth target until a baseline exists.

## Validation through the requested perspectives

These are structured design-review perspectives, not interviews, independent
specialist approvals or evidence of buyer demand.

| Perspective | Question | Decision and validation |
| --- | --- | --- |
| Senior UI designer | Can I understand the task before inspecting the primitives? | Lead with one believable workflow; align repeated rows in fixed lanes; retain readable phone type. Inspect each Paper section and final board |
| Senior brand designer | Does this feel like Diorama across different domains? | Keep current chrome, Aspekta and semantic roles. Change the work and copy by domain rather than inventing industry themes |
| Senior motion designer | Does motion explain something, and can it stop? | Keep one live progress edge, textual state and reduced-motion floor; specify a storyboard instead of claiming a static mock animates |
| Senior design system designer | Can the current source reproduce every control? | Check primitive report and component/navigation sheets; map every specimen to manifest items, preserve variant geometry and label experimental items |
| Potential client or champion | Can I judge fit and explain adoption to my team? | Show task, output, ownership and limits. Link components; do not imply an AI service, installable workspace or customer proof |

Scope validation before drawing: the AI page is feasible with existing controls;
ChatProgress is stable but uses the experimental StatusMatrix internally. Header,
Sidebar, ChatMessage, ChatComposer, Table, Badge, Card and Button exist. SiteHeader
is experimental. Charts are not needed for this prototype. No fabricated customer
logos, adoption totals, time savings or conversion figures belong on the page.

## Completion record

The first prototype is complete for review. No application or registry code was
implemented. Six boards are on the requested Paper page:

| Board | Paper | Local snapshot |
| --- | --- | --- |
| AI workspaces desktop light | [Open](https://app.paper.design/file/01M5D1CCKC5MQZ9JZJ83G954CR/p-8-0/7OX-0) | [PNG](../design/paper/exports/use-case-pages/ai-workspaces-1280-light.png) |
| AI workspaces desktop dark | [Open](https://app.paper.design/file/01M5D1CCKC5MQZ9JZJ83G954CR/p-8-0/7X8-0) | [PNG](../design/paper/exports/use-case-pages/ai-workspaces-1280-dark.png) |
| AI workspaces mobile light | [Open](https://app.paper.design/file/01M5D1CCKC5MQZ9JZJ83G954CR/p-8-0/84E-0) | [PNG](../design/paper/exports/use-case-pages/ai-workspaces-320-light.png) |
| AI workspaces mobile dark | [Open](https://app.paper.design/file/01M5D1CCKC5MQZ9JZJ83G954CR/p-8-0/8C9-0) | [PNG](../design/paper/exports/use-case-pages/ai-workspaces-320-dark.png) |
| Strategy and motion handoff | [Open](https://app.paper.design/file/01M5D1CCKC5MQZ9JZJ83G954CR/p-8-0/8I7-0) | [PNG](../design/paper/exports/use-case-pages/strategy-validation-motion.png) |
| Stress brand and measured finding | [Open](https://app.paper.design/file/01M5D1CCKC5MQZ9JZJ83G954CR/p-8-0/8KU-0) | [PNG](../design/paper/exports/use-case-pages/ai-workspace-stress-brand.png) |

Exports are design evidence, not visual-regression baselines. Desktop snapshots
are 1280 × 3005px and mobile snapshots are 320 × 4890px. Existing design exports
on other pages were left intact.

### Review results

Section screenshots were reviewed for spacing, typography, contrast, alignment,
fit and repetition. The mobile composition reflows rather than scaling the
desktop UI. Source inspection and the primitive geometry report informed the
controls and navigation. Paper's font inheritance fallback was corrected with
explicit Aspekta bindings before export. Final canvas searches found no system
font, monospace, 10px or 11px text, 6px radius, dashed or dotted border styles
on the new page.

Text contrast was calculated with `contrastRatio` from
`packages/tokens/src/color.ts` against the values returned by
`resolveThemePair(THEME_ZERO, resolveZeroPairOptions)`. The smallest measured
text pair in this sample was muted ink on sunken, 4.87:1 light and 4.67:1 dark.
On-accent ink measured 11.35:1 in both schemes. These are sampled semantic
pairs, not a claim that static review establishes runtime accessibility.

**Open finding before release:** the existing stress seed in
`apps/site/src/lib/theme-presets.ts`, resolved with the default resolver, makes
`--ui-bg-elevated` and `--ui-bg-base` the same white (1.00:1). Stage, current-row
and sender-bubble surface steps disappear. The stress board preserves this
result and labels it; do not conceal it with per-component colors. Resolve the
seed/resolver behavior and repeat the brand check before publishing this page
family. Stress on-accent text itself measures 16.73:1.

The existing `pnpm verify` gate passed on 2026-11-13. No distributed item changed,
so no ledger or registry regeneration was needed. Runtime accessibility,
keyboard operation, focus, zoom and motion remain the implementation gates
listed above. Search demand and conversion assumptions need observed traffic
and prospect feedback before they can justify a broader page rollout.
