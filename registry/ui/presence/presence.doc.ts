/**
 * Typed documentation for Presence.
 *
 * One source for the docs site, Storybook autodocs and MCP answers. Prose that
 * is not here does not exist as far as tooling is concerned (CONVENTIONS §11).
 */

export const presenceDoc = {
  lead: "Animates content as it arrives and leaves, and keeps leaving content on screen until it has gone.",
  name: "Presence",
  status: "experimental",
  summary:
    "The first of ADR 0028's owned motion components. A wrapper with no element and no look of its own: each keyed child is an item, and Presence gives every arrival and exit in an app the same timing. Three kinds — fade (the default), rise (fade plus a lift of --ui-space-xs, for content landing in a stream), collapse (the whole box opens and folds — height, vertical padding, border and margin — for rows in a list, so nothing below jumps). Arrivals run on --ui-duration-base with --ui-ease-out through CSS @starting-style; exits fade on --ui-duration-fast and never travel; collapse fades and folds together, so the list closes over the row in one motion. A removed child stays rendered — inert, aria-hidden, its last content — until its exit's transitions finish, and focus inside it moves to a neighbour first. Items present on the first render do not animate unless `appear` is set. Everything is a CSS transition on the motion tokens, so the motion levels need no code here, and a child added back mid-exit turns around from the frame it is on. Base UI surfaces (Popover, Modal, Sheet, Toast…) already own their presence and are not wrapped.",

  anatomy: [
    {
      part: "presence",
      slot: "none",
      notes:
        "The root renders no element, so it can sit inside a list, a stack or a toolbar without changing the layout — and a Presence of <li> stays valid HTML inside a <ul>. It owns the list of items, including the departing ones it still renders.",
    },
    {
      part: "item",
      slot: "the caller's",
      notes:
        "Each child element. Presence writes data-presence (entering · present · leaving), its transition classes (merged after the child's own className) and a ref onto it, so the child must forward className, ref and data-* to its DOM node — every component in this library does (CONVENTIONS §5). While leaving it is inert and aria-hidden. For collapse its height is set inline from a measurement while it moves, with overflow clipped, and cleared once it settles.",
    },
  ],

  composition: `
Presence (kind?, appear?)
└── item — any element with a stable key, forwarding className/ref/data-*
    ├── data-presence="entering" — arrived after mount; plays the entrance once
    ├── data-presence="present"
    └── data-presence="leaving"  — the caller removed it; inert until its exit ends

<ul>
  <Presence kind="collapse">
    {tasks.map((task) => <li key={task.id}>{task.title}</li>)}
  </Presence>
</ul>
`,

  props: {
    kind: {
      type: '"fade" | "rise" | "collapse"',
      default: '"fade"',
      notes:
        "fade for anything in place. rise for content landing in a stream — a new message, a toast's row — where the lift says where it came from; the lift is --ui-space-xs × --ui-motion-travel, so at Reduced it is a plain fade. collapse for rows in a list, where the space itself has to open and close. Timing is not a prop: every Presence in an app arrives and leaves the same way, which is the point of having one.",
    },
    appear: {
      type: "boolean",
      default: "false",
      notes:
        "Play the entrance for the items present on the first render too. Off by default, because a page that loads a list should show the list rather than perform it. On for the case where one action both mounts the Presence and adds the row — opening a panel that shows the item just created.",
    },
    children: {
      type: "ReactNode",
      notes:
        "Keyed elements. The key is how Presence tells a removal from a change: a list re-keyed by index animates the wrong rows. Children without a key are keyed by position, and text children are not rendered.",
    },
  },

  do: [
    "Give every item a stable key from the data, never the array index.",
    "Show the change first, then remove the row: update its label or tick, wait for it to land, then drop it from the list.",
    "Keep what arrived readable without the motion: the new row's text, a count, a status line in a live region you own.",
    "Use collapse inside lists, so the rows below glide instead of jumping.",
  ],
  dont: [
    "Wrap a Popover, Modal, Sheet, Drawer, Select, Menu or Toast. They mount and unmount through the behaviour layer with their own motion, and would animate twice.",
    "Put your own transition on the item. Presence owns `transition` on it, and two transition declarations on one element do not combine — one silently wins.",
    "Pass a component that does not forward className and ref to its DOM node. Nothing will animate, and the leaving item will stay until its (absent) exit ends — immediately.",
    "Use it to announce anything. Presence is silent; announcements belong in a live region the caller owns.",
  ],

  a11y: {
    role: "None. Presence adds no element and no semantics; each item keeps the role it already has.",
    name: "None.",
    keyboard: [],
    focus:
      "A leaving item is made inert only after focus inside it has moved to the nearest item that is not leaving — the next one, or the previous one at the end of the list — so the reader's place is never dropped to <body>. If no neighbour has anything focusable, focus is released.",
    contrastPairs: [],
    rendersNoColour:
      "Presence renders no element and sets no colour: it changes only opacity, translate and height on the caller's own items, whose pairs are the caller's component's to declare.",
  },

  forwarding: {
    className:
      "Not accepted on Presence itself: there is no element to put it on. Each item's own className is kept and Presence's classes merge after it.",
    ref: "Not accepted on Presence. An item's own ref is preserved and merged with the one Presence attaches.",
    props: "Presence takes only kind, appear and children. Everything else belongs on the items.",
  },

  motion:
    "Everything is a CSS transition on the tokens, never a keyframe, so a reversed change turns around mid-flight. Arrival: --ui-duration-base, --ui-ease-out, from @starting-style (opacity 0; rise also translate --ui-space-xs × --ui-motion-travel; collapse also its box closed — height, vertical padding, border and margin, measured at rest and set inline — with the fade half a fast step behind the fold, so the room opens before the content shows). Exit: opacity on --ui-duration-fast, nothing travels; collapse folds its whole box on --ui-duration-base at the same moment, never after the fade. Height alone cannot fold a padded row: with border-box sizing it stops at padding + border. Motion levels (ADR 0028): at Reduced rise becomes a plain fade (travel 0) and collapse still eases, being change in place, capped at --ui-duration-base; at Off every duration is 1ms, and a leaving item is still removed only once that 1ms transition has finished, never synchronously. Removal waits for the item's OWN transitions, never its subtree, where a spinner never finishes.",

  needsDesign: [],

  knownGaps: [
    "The Presence sheet drew collapse's height as a wrapper animating grid-template-rows. Built instead as the item's own height, measured and set inline: a wrapper element inside a <ul> is invalid HTML, and Presence promises no element of its own. The sheet's Fold row records the change.",
    "Focus moves only within one Presence. A list whose last item leaves hands focus to nothing; the caller should move it to the list's heading or its add control.",
    "Count, TextSwap, IconSwap, Stagger and Feedback — the other five owned motion components in ADR 0028 — are not built yet.",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/8-0/489K-1",
} as const;
