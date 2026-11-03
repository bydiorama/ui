import { useEffect, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn, userEvent } from "storybook/test";
import { Search } from "griddy-icons";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED, type ThemeSeed } from "@bydiorama/tokens";

import { Combobox, ComboboxAction, type ComboboxItem, type ComboboxItemGroup } from "./combobox.tsx";

/* The sheet's own data: the archive search from patterns/brand-search. */
const ARCHIVE: ComboboxItemGroup[] = [
  {
    label: "Designers",
    items: [
      { value: "jmb", label: "Josef Müller-Brockmann" },
      { value: "aicher", label: "Otl Aicher", isDisabled: true },
      { value: "crouwel", label: "Wim Crouwel" },
      { value: "rams", label: "Dieter Rams" },
    ],
  },
  {
    label: "Inventors",
    items: [
      { value: "gutenberg", label: "Johannes Gutenberg" },
      { value: "jacquard", label: "Joseph Marie Jacquard" },
      { value: "lovelace", label: "Ada Lovelace" },
    ],
  },
  {
    label: "Library",
    items: [
      { value: "grid", label: "Josef Müller-Brockmann · Grid systems", href: "#grid-systems" },
      { value: "alphabet", label: "Wim Crouwel · New Alphabet", href: "#new-alphabet" },
    ],
  },
];

const searchEverything = (onAction = fn()) => (
  <ComboboxAction icon={<Search />} onAction={onAction}>
    {(q) => `Search everything for “${q}”`}
  </ComboboxAction>
);

/** Shared field props — the sheet's "Search the archive" field. */
const FIELD = {
  label: "Search the archive",
  placeholder: "Search designers and inventors",
  icon: <Search />,
  items: ARCHIVE,
} as const;

/** Focus the field, type, then press keys — how every open story is opened. */
function openWith(text: string, keys = "") {
  return async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const input = canvasElement.querySelector<HTMLInputElement>('[role="combobox"]');
    if (!input) return;
    await userEvent.click(input);
    if (text) await userEvent.type(input, text);
    if (keys) await userEvent.keyboard(keys);
    await new Promise((resolve) => setTimeout(resolve, 50));
  };
}

const meta: Meta<typeof Combobox> = {
  title: "UI/Combobox",
  component: Combobox,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof Combobox>;

export const Playground: Story = {
  render: () => (
    <div className="w-96">
      <Combobox {...FIELD} onValueChange={fn()} onSubmitText={fn()} action={searchEverything()} />
    </div>
  ),
};

/**
 * The anatomy specimen: typing "Jo", Josef Müller-Brockmann highlighted,
 * Johannes Gutenberg the committed value (bold and a tick), the Library rows
 * links, the action last.
 */
export const Anatomy: Story = {
  render: () => (
    <div className="h-[560px] w-[496px]">
      <Combobox {...FIELD} defaultValue="gutenberg" defaultInputValue="" onValueChange={fn()} action={searchEverything()} />
    </div>
  ),
  play: openWith("Jo", "{ArrowDown}"),
};

/** The sheet's § Sizes and shape: Input's ladder, soft and full. */
export const Matrix: Story = {
  render: () => (
    <div className="grid w-full max-w-dialog-lg grid-cols-2 gap-xl">
      {(["lg", "md", "sm"] as const).map((size) => (
        <div key={size} className="contents">
          {(["soft", "full"] as const).map((shape) => (
            <Combobox
              key={shape}
              {...FIELD}
              label={`${size} · ${shape}`}
              size={size}
              shape={shape}
              defaultValue="jmb"
              onValueChange={fn()}
            />
          ))}
        </div>
      ))}
    </div>
  ),
};

/** The sheet's § Field states that a static page can hold. Hover and focus are live. */
export const States: Story = {
  render: () => (
    <div className="flex w-[496px] flex-col gap-2xl">
      <Combobox {...FIELD} label="Rest, empty" onValueChange={fn()} />
      <Combobox {...FIELD} label="Filled" defaultValue="jmb" onValueChange={fn()} />
      <Combobox
        {...FIELD}
        label="Invalid"
        errorText="Choose someone from the archive, or search for them"
        helperText="Names are matched against the designers and inventors index"
        onValueChange={fn()}
      />
      <Combobox {...FIELD} label="Disabled" isDisabled onValueChange={fn()} />
      <Combobox {...FIELD} label="No chevron (a search field)" hasTrigger={false} onValueChange={fn()} />
      <div className="rounded-lg bg-elevated p-lg">
        <Combobox {...FIELD} label="On chrome (surface)" surface="chrome" defaultValue="jmb" onValueChange={fn()} />
      </div>
      <Combobox {...FIELD} label="Hidden label" isLabelHidden onValueChange={fn()} />
    </div>
  ),
};

/** Popup state: the first request in flight, nothing to show yet. */
export const Loading: Story = {
  render: () => (
    <div className="h-72 w-[496px]">
      <Combobox {...FIELD} items={[]} filter={null} isLoading defaultInputValue="Müll" action={searchEverything()} />
    </div>
  ),
  play: openWith("", "{ArrowDown}"),
};

/** Popup state: the request succeeded with nothing — and the action is still there. */
export const Empty: Story = {
  render: () => (
    <div className="h-72 w-[496px]">
      <Combobox
        {...FIELD}
        emptyMessage={(q) => `No one in the archive matches “${q}”`}
        action={searchEverything()}
        onValueChange={fn()}
      />
    </div>
  ),
  play: openWith("Bauhaus"),
};

/** Popup state: the LIST failed. The field stays valid; Try again is an option. */
export const ListError: Story = {
  render: () => (
    <div className="h-80 w-[496px]">
      <Combobox
        {...FIELD}
        items={[]}
        filter={null}
        defaultInputValue="Tesla"
        listError="Results couldn’t load"
        onRetry={fn()}
        action={searchEverything()}
      />
    </div>
  ),
  play: openWith("", "{ArrowDown}"),
};

/** ArrowDown past the last option lands on the action. */
export const ActionHighlighted: Story = {
  render: () => (
    <div className="h-80 w-[496px]">
      <Combobox {...FIELD} action={searchEverything()} onValueChange={fn()} />
    </div>
  ),
  play: openWith("Lovelace", "{ArrowDown}{ArrowDown}"),
};

/** A long list: the bottom Fade marks the scroll edge above the pinned action. */
const PEOPLE: ComboboxItem[] = Array.from({ length: 30 }, (_, i) => ({ value: `p${i}`, label: `Archive entry ${i + 1}` }));
export const Overflowing: Story = {
  render: () => (
    <div className="h-[460px] w-[496px]">
      <Combobox {...FIELD} items={PEOPLE} action={searchEverything()} onValueChange={fn()} />
    </div>
  ),
  play: openWith("", "{ArrowDown}"),
};

/**
 * Async results, the way a consumer wires them: debounce and abort in the
 * caller, hand the results back as `items`, `filter={null}`.
 */
const EVERYONE = ARCHIVE.flatMap((g) => g.items).filter((i) => !i.href);
export const Async: Story = {
  render: function AsyncStory() {
    const [query, setQuery] = useState("");
    const [items, setItems] = useState<ComboboxItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
    return (
      <div className="h-80 w-[496px]">
        <Combobox
          {...FIELD}
          items={items}
          filter={null}
          isLoading={isLoading}
          inputValue={query}
          onInputValueChange={(q) => {
            setQuery(q);
            setIsLoading(true);
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => {
              const needle = q.trim().toLowerCase();
              setItems(EVERYONE.filter((i) => i.label.toLowerCase().includes(needle)));
              setIsLoading(false);
            }, 400);
          }}
          onValueChange={fn()}
          action={searchEverything()}
        />
      </div>
    );
  },
};

/** Controlled value and text, and free-text submission. */
export const Controlled: Story = {
  render: function ControlledStory() {
    const [value, setValue] = useState<string | null>("lovelace");
    const [text, setText] = useState("Ada Lovelace");
    const [submitted, setSubmitted] = useState<string | null>(null);
    return (
      <div className="flex w-96 flex-col gap-md">
        <Combobox
          {...FIELD}
          value={value}
          onValueChange={setValue}
          inputValue={text}
          onInputValueChange={setText}
          onSubmitText={setSubmitted}
        />
        <p className="text-caption text-ink-muted">{`value: ${value ?? "null"} · text: “${text}” · submitted: ${submitted ?? "—"}`}</p>
      </div>
    );
  },
};

const STRESS_BRAND: ThemeSeed = {
  colors: {
    bg: "#fffdf5", surface: "#ffffff", muted: "#f4ecd8",
    textPrimary: "#1a1400", textMuted: "#6b5d3f",
    border: "rgba(26, 20, 0, 0.12)", accent: "#ffe066",
  },
};

const brandPanel = (seed: "zero" | "brand") =>
  toStyleObject(
    seed === "zero" ? resolveThemePair(THEME_ZERO, { authored: ZERO_AUTHORED }) : resolveThemePair(STRESS_BRAND),
  ) as React.CSSProperties;

/**
 * Theme zero beside a hostile brand seed (pale-yellow accent), closed: the
 * field, its value and its edge re-skin with the scope.
 */
export const BrandThemed: Story = {
  render: () => (
    <div className="flex gap-xl">
      {(["zero", "brand"] as const).map((seed) => (
        <div key={seed} style={brandPanel(seed)} className="flex-1 rounded-lg bg-base p-xl">
          <p className="pb-md text-caption text-ink-muted">
            {seed === "zero" ? "theme zero" : "stress brand — pale yellow accent"}
          </p>
          <Combobox {...FIELD} defaultValue="gutenberg" onValueChange={fn()} action={searchEverything()} />
        </div>
      ))}
    </div>
  ),
};

/**
 * The stress brand, OPEN. The panel portals into the field's own root, so it
 * re-skins with the field and needs no `container`.
 *
 * One field, not two: while the list is open Base UI's focus manager marks
 * everything outside the field and its panel `aria-hidden` (the input sits
 * outside the popup, which makes it modal), so a second field beside it would
 * be a focusable element inside an aria-hidden one — axe's aria-hidden-focus.
 * Tab closes the list before it can reach one, but the story is the place
 * that rule is checked, so the story shows one field.
 */
export const BrandThemedOpen: Story = {
  render: () => (
    <div style={brandPanel("brand")} className="h-[460px] w-[560px] rounded-lg bg-base p-xl">
      <Combobox {...FIELD} defaultValue="gutenberg" onValueChange={fn()} action={searchEverything()} />
    </div>
  ),
  play: openWith("", "{ArrowDown}"),
};
