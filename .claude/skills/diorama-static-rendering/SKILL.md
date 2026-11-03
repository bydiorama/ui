---
name: diorama-static-rendering
description: Using @bydiorama/ui in static or server-rendered frameworks — Astro, SSR, static export — where React components ship as HTML and only some hydrate. Use when deciding which components need a client:* directive, when a control looks right but does nothing (or looks wrong) before hydration, when composing compound components from .astro files, or when setting up a new Astro/SSR app on the registry (prettier, focus styles, installed paths).
---

# @bydiorama/ui in static and SSR frameworks

Astro renders a React component to static HTML unless it is given a
`client:*` directive. Every component *renders*; the question is whether it
**works** without hydrating, and hydrating costs the React client (~70 KB gzip)
plus Base UI. Decide per component with the table below, then hydrate only
what is in the last two columns.

## Which components need hydration

| Static-safe — ship as HTML | Renders, but inert until hydrated | Needs hydration to be correct at all |
| --- | --- | --- |
| Button (incl. `render={<a/>}`), Badge, Banner, Card, Avatar, AspectRatio, ImageOverlay, Thumbnail, DotPattern, Skeleton, Progress, EmptyState, ChatMessage, Input, Textarea | Accordion, Tabs, Header (affix, menus), NavRail, Sidebar, Fade (with `scrollContainer` it renders hidden until measured), Table (sorting) | Menu, ContextMenu, Select, MultiSelect, Popover, Tooltip, Modal, Sheet, Drawer, Toast, DatePicker, Calendar, Slider, CardSorting, ImageUpload, ImageEdit, the Chat composites |
| **Checkbox, Radio, Switch** — their checked look is drawn from the native `:checked`, so they toggle and submit as plain form controls | | |

Notes that cost someone a bug:

- **Checkbox `isIndeterminate`** needs JavaScript: `indeterminate` is a DOM
  property with no HTML attribute. Statically it renders as plain unchecked.
- **Input invalid** paints from the input's `aria-invalid`, so a vanilla
  validation script can set `aria-invalid="true"` and get the danger edge with
  no React render. The error *message* (`errorText`) is still render-time —
  render it statically if the server knows it, or write it from the script.
- **Tabs** mount only the selected panel. Content that must be in the HTML
  (SEO, no-JS) needs `<Tabs.Panel isAlwaysMounted>`; it is hidden with the
  `hidden` attribute until selected.
- **Accordion** costs ~110 KB once hydrated. For static FAQ-style content a
  native `<details name="…">` group is lighter; a `<details>`-based Accordion
  variant is not built yet.

## Compound components cannot be composed in `.astro`

Astro passes children to a React component as **static HTML outside the
React tree**, so this loses its context and breaks:

```astro
<!-- ✗ Accordion.Item never finds its Accordion -->
<Accordion client:visible>
  <Accordion.Item value="a">
    <Accordion.Trigger>Question</Accordion.Trigger>
    <Accordion.Panel>Answer</Accordion.Panel>
  </Accordion.Item>
</Accordion>
```

Write one small React wrapper per compound you use from Astro, data-driven,
and hydrate the wrapper:

```tsx
// src/islands/faq.tsx
export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <Accordion>
      {items.map((it) => (
        <Accordion.Item key={it.q} value={it.q}>
          <Accordion.Trigger>{it.q}</Accordion.Trigger>
          <Accordion.Panel>{it.a}</Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  );
}
```

Applies to every component with sub-parts: Accordion, Tabs, Card, Modal,
Sheet, Drawer, Menu, Popover, RadioGroup/Radio, Header, Sidebar, NavRail.
Card is the exception that works in practice — it has no context — but keep
it in React anyway so its heading ids stay paired.

For a CTA that is plain markup in an `.astro` file, use the class recipe
instead of a React island: `buttonClassName({ variant: "primary" })` on the
`<a>`, plus `data-disabled` and `aria-disabled="true"` if it can be disabled.

## Installing into an Astro / SSR app

| Trap | Rule |
| --- | --- |
| `prettier-plugin-tailwindcss` reorders classes in installed source, so every file "diverges" from the registry in `sync` | Add the installed paths to `.prettierignore` |
| Ignoring only `src/ui` | Items also install outside it: `src/lib/cn.ts`, `src/lib/motion.ts`, `src/lib/compose-event-handlers.ts`, `src/hooks/use-controllable-state.ts` (and the other hooks). Ignore every path in your `ui.lock.json` |
| Deleting `*.doc.ts` to slim the app | Keep them. Nothing imports them, so they never reach a bundle; deleting one makes `sync` report the item as modified |
| A global `:focus-visible { outline: … }` draws a second ring inside every field | Put global focus styles in `@layer base`. Unlayered rules beat the components' utilities, including Input's `outline-none` |
| No tokens | Install the `theme-zero-css` item and import it after `@import "tailwindcss";` |
