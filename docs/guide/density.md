# Dense screens

[← Back to the README](../../README.md)

Density is a mode, not a size prop (ADR 0020 §4, ADR 0026). Set
`data-ui-density="compact"` and every control, field, row and stepped type
role under it re-binds — no `className` per component. What compact gives,
measured in Chromium against theme zero:

| Part | Default | Compact |
|---|---|---|
| Button `lg` / `md` / `sm` | 44 / 32 / 24px | 40 / 28 / 24px (24 is the SC 2.5.8 floor) |
| Input, Select, Multiselect, Combobox field `lg` / `md` / `sm` | 48 / 40 / 32px | 44 / 36 / 28px |
| Field label (`text-field-label`) | 13px / 600 | 12px / 600 |
| Field value at `md` (`text-row`) | 14px | 13px (`lg` keeps 14, `sm` 12) |
| Textarea `md` | 14px value, 8px inset | 13px value, 4px inset |
| Menu, ContextMenu, Select / Combobox option row | ~46px, 14px / 400 | **32px**, 13px / 400, 8px inline inset |
| Multiselect option row | drawn by its 12px padding, 12px / 600 | **32px**, type unchanged |
| Sidebar item, section heading, layer title | 46px, 16px | **32px**, 13px; labels on a 16px lane |
| Sidebar search | 40px, 14px | 36px, 13px |
| NavRail item | 32px square | 28px square |
| Checkbox, Radio, Switch row | 24px | 19–20px (target stays 24px) |
| Tabs | 24px tab in a 32px list | unchanged |

Apply it to the whole app on `<body>` — portalled panels inherit it from
there:

```html
<body data-ui-density="compact">
```

or to a subtree, such as a dense inspector inside a default page. A
**portalled** surface (Menu, Popover, Modal, Sheet, Drawer, ContextMenu)
leaves that subtree, so pass the attribute to its popup part too
(CONVENTIONS §6); Select carries its trigger's density onto its list by
itself. `data-ui-density="default"` inside a compact subtree restores the
drawn sizes.

```tsx
<aside data-ui-density="compact">
  <Menu>
    <Menu.Trigger render={<Button size="md">Actions</Button>} />
    <Menu.Panel data-ui-density="compact">
      <Menu.Item onSelect={archive}>Archive</Menu.Item>
    </Menu.Panel>
  </Menu>
</aside>
```

For 13px or 12px **regular** text in your own screens, use `text-dense-md`
and `text-dense-sm` rather than `text-[13px] font-normal`: they follow a
brand's `baseSize` and weights like every other role.
