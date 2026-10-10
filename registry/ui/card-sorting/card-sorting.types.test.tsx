/** Compile-time contract tests. `tsc --noEmit` is the runner. */
import { CardSorting } from "./card-sorting.tsx";

export function Valid() {
  return (
    <>
      <CardSorting label="Brand assets">
        <CardSorting.Item id="a" label="Brand guidelines">Content</CardSorting.Item>
      </CardSorting>
      <CardSorting
        label="Brand assets"
        order={["b", "a"]}
        onOrderChange={(order: string[]) => void order}
        className="max-w-nav"
      >
        <CardSorting.Item id="a" label="Brand guidelines">Content</CardSorting.Item>
        <CardSorting.Item id="b" label="Business cards">Content</CardSorting.Item>
      </CardSorting>
      {/* #20: every phrase is a function of the row, its position and the list. */}
      <CardSorting
        label="Značka"
        messages={{
          handleLabel: ({ label, position, total }) => `Presunúť ${label}, ${position}. z ${total}`,
          lifted: ({ label }) => `${label} zdvihnuté`,
          moved: ({ label, position }) => `${label}, ${position}.`,
          dropped: ({ label }) => `${label} položené`,
          cancelled: ({ listLabel }) => `Zrušené, ${listLabel}`,
        }}
      >
        <CardSorting.Item id="a" label="A">Content</CardSorting.Item>
      </CardSorting>
      {/* Any subset; the rest stay English. */}
      <CardSorting label="L" messages={{ cancelled: () => "Abgebrochen." }}>
        <CardSorting.Item id="a" label="A">Content</CardSorting.Item>
      </CardSorting>
      {/* #19: a placed grip, positioned by the caller. */}
      <CardSorting label="Colours">
        <CardSorting.Item id="ink" label="Ink">
          <div className="relative">
            <CardSorting.Handle className="absolute top-xs right-xs" onPointerDown={() => {}} />
          </div>
        </CardSorting.Item>
      </CardSorting>
    </>
  );
}

export function Invalid() {
  {/* "list, 4 items" says nothing about what is being sorted. */}
  /* @ts-expect-error label is required */
  const a = <CardSorting><CardSorting.Item id="a" label="A">x</CardSorting.Item></CardSorting>;

  {/* `order` is made of ids, so an item without one cannot be placed. */}
  /* @ts-expect-error id is required on an item */
  const b = <CardSorting label="L"><CardSorting.Item label="A">x</CardSorting.Item></CardSorting>;

  {/* "item 3 moved to position 1" is not a reorder anyone can follow. */}
  /* @ts-expect-error label is required on an item */
  const c = <CardSorting label="L"><CardSorting.Item id="a">x</CardSorting.Item></CardSorting>;

  {/* §1: one callback for the whole change, never onMove/onReorder.
      NOT `onDrop` — that is a real DOM drag event and compiles fine, which is
      itself worth knowing: the root spreads HTMLAttributes. */}
  /* @ts-expect-error there is no onReorder */
  const d = <CardSorting label="L" onReorder={() => {}}><CardSorting.Item id="a" label="A">x</CardSorting.Item></CardSorting>;

  {/* The order is made of ids. */}
  /* @ts-expect-error order is string[], not number[] */
  const e = <CardSorting label="L" order={[0, 1]}><CardSorting.Item id="a" label="A">x</CardSorting.Item></CardSorting>;

  {/* A message takes the position and count; a fixed string cannot place them. */}
  /* @ts-expect-error a message is a function, not a string */
  const f = <CardSorting label="L" messages={{ lifted: "zdvihnuté" }}><CardSorting.Item id="a" label="A">x</CardSorting.Item></CardSorting>;

  {/* There is no sixth phrase to translate; a typo must not pass silently. */}
  /* @ts-expect-error unknown message key */
  const g = <CardSorting label="L" messages={{ grabbed: () => "x" }}><CardSorting.Item id="a" label="A">x</CardSorting.Item></CardSorting>;

  {/* NOT tested here: `aria-label` on a Handle. It is omitted from the props,
      but TypeScript never excess-checks a HYPHENATED JSX attribute, so the
      directive would report as unused. The contract holds at runtime instead —
      the handle's own name is written after the spread — and the browser test
      asserts it. */}

  {/* It is the drag target; nothing nests inside it. */}
  /* @ts-expect-error a handle takes no children */
  const i = <CardSorting.Handle>Drag</CardSorting.Handle>;

  return [a, b, c, d, e, f, g, i];
}
