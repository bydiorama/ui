"use client";

import { Combobox as BaseCombobox } from "@base-ui/react/combobox";
import { AlertCircle, ArrowUpRight, Check, ChevronDown, ChevronUp, Close, RefreshCw } from "griddy-icons";
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from "react";

import { useControllableState } from "@/hooks/use-controllable-state";
import { cn } from "@/lib/cn";
import { menuGroupLabel } from "@/lib/menu-surface";
import { motionMicro } from "@/lib/motion";
import { Fade } from "@/ui/fade";

/** See the identical note in select.tsx — one shim, contained to this file. */
const forBaseUI = <T,>(props: object) => props as T;

/**
 * Base UI hands its own handlers an event that can stop the handlers merged
 * to its LEFT (`preventBaseUIHandler`). Restated locally so no behaviour-layer
 * type reaches a signature (ADR 0012).
 */
type PreventableEvent = { preventBaseUIHandler?: () => void };

export type ComboboxSize = "lg" | "md" | "sm";
export type ComboboxShape = "soft" | "full";
/** The ground the field is cut from — Input's `surface`, unchanged (ADR 0017). */
export type ComboboxSurface = "page" | "chrome";

/*
 * Control geometry, copied from Input rather than imported — the registry
 * ships files a consumer owns, so Combobox cannot reach into Input's module
 * for a private constant. The browser test renders both and compares their
 * COMPUTED geometry, so the copies cannot drift apart quietly.
 */
const SIZE = {
  lg: "h-field-lg gap-sm py-sm text-body-md",
  md: "h-field-md gap-xs py-sm text-body-md",
  sm: "h-field-sm gap-xs py-xs text-caption",
} as const satisfies Record<ComboboxSize, string>;

/**
 * Input's INSET without its `has-[>button:last-child]` end-padding rule. That
 * rule exists for a round submit sitting in a pill; here the last child is
 * the chevron trigger (a `<button>`, 16px, not round), and collapsing the end
 * padding around it would put the glyph against the curve.
 */
const INSET = {
  soft: {
    lg: "rounded-md px-field-inset-lg",
    md: "rounded-md px-field-inset-md",
    sm: "rounded-md px-field-inset-sm",
  },
  full: {
    lg: "rounded-full px-[calc(var(--ui-field-lg-inset)+var(--ui-space-xs))]",
    md: "rounded-full px-[calc(var(--ui-field-md-inset)+var(--ui-space-xs))]",
    sm: "rounded-full px-[calc(var(--ui-field-sm-inset)+var(--ui-space-xs))]",
  },
} as const satisfies Record<ComboboxShape, Record<ComboboxSize, string>>;

const SURFACE = {
  page: { rest: "bg-field", disabled: "bg-field-disabled" },
  chrome: { rest: "bg-field-chrome", disabled: "bg-field-chrome-disabled" },
} as const satisfies Record<ComboboxSurface, { rest: string; disabled: string }>;

/**
 * Select's option row, character for character (the sheet's claim), plus the
 * forced-colours outline Menu's row carries so the highlight survives Windows
 * High Contrast. The TYPE ROLE sits on the row; selection's weight sits on the
 * label span inside it, so the row still renders exactly its role (ADR 0020 §3).
 */
const OPTION = cn(
  "flex cursor-pointer items-center gap-sm rounded-sm p-md select-none",
  "text-body-md font-body text-ink-primary no-underline",
  "transition-[background-color]", motionMicro,
  // Pointer hover can still land Base UI's highlight on a disabled row; the
  // sheet draws a disabled row with NO highlight, so it never takes the fill.
  "not-data-[disabled]:data-[highlighted]:bg-hover",
  "not-data-[disabled]:data-[highlighted]:forced-colors:outline not-data-[disabled]:data-[highlighted]:forced-colors:outline-focus",
  "data-[disabled]:cursor-not-allowed data-[disabled]:text-ink-disabled",
);

/** The fixed 16px trailing lane every row keeps, filled or not. */
const LANE = "flex size-4 shrink-0 items-center justify-center [&_svg]:size-4 [&_svg]:shrink-0";

/** A leading glyph in a row (the action, Try again): muted, 16px. */
const LEADING = "flex shrink-0 text-ink-muted [&_svg]:size-4 [&_svg]:shrink-0";

export interface ComboboxItem {
  /** What `onValueChange` reports. Unique across the whole list, groups included. */
  value: string;
  label: string;
  /**
   * Makes the row a LINK: rendered as an `<a role="option">` with an arrow in
   * the indicator lane. Enter or a click follows it and commits nothing — a
   * link row is never the field's value, so it is never drawn selected.
   */
  href?: string;
  isDisabled?: boolean;
}

export interface ComboboxItemGroup {
  /** Names the group — a `role="group"` labelled by this heading. */
  label: string;
  items: readonly ComboboxItem[];
}

export type ComboboxFilter = (item: ComboboxItem, query: string) => boolean;

/** Case- and accent-insensitive "contains" — "mull" finds "Müller". */
const fold = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase();
const containsFilter: ComboboxFilter = (item, query) => fold(item.label).includes(fold(query.trim()));

const isGroups = (items: readonly ComboboxItem[] | readonly ComboboxItemGroup[]): items is readonly ComboboxItemGroup[] =>
  items.length > 0 && "items" in (items[0] as object);

/* Rows that are options for ARIA purposes but never a value. */
const ACTION = Object.freeze({ kind: "combobox-action" });
const RETRY = Object.freeze({ kind: "combobox-retry" });
const ACTION_KEY = "\u0000action";
const RETRY_KEY = "\u0000retry";

/** What the action row needs from the field it sits under. */
interface ComboboxContextValue {
  query: string;
  close: () => void;
}
const ComboboxContext = createContext<ComboboxContextValue | null>(null);

export interface ComboboxProps {
  /** Required — a placeholder is not a label (§10). */
  label: string;
  isLabelHidden?: boolean;
  /** A flat list, or labelled groups. Rows can be links (`href`). */
  items: readonly ComboboxItem[] | readonly ComboboxItemGroup[];
  /** Controlled committed value, by item value. `null` is nothing chosen. */
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  /**
   * Controlled text in the field. Free text is allowed: the text and the
   * committed value are separate, and a blur never rewrites what was typed.
   */
  inputValue?: string;
  defaultInputValue?: string;
  /**
   * Every change to the text — typing, a commit filling the label in, the
   * clear control, Escape twice. For async results this is the hook: debounce
   * and abort in the caller, pass the results back as `items`, and set
   * `filter={null}` so they are shown as given.
   */
  onInputValueChange?: (inputValue: string) => void;
  /** Enter with nothing highlighted: the free text, as typed. */
  onSubmitText?: (text: string) => void;
  /**
   * How typing narrows `items`. Defaults to a case- and accent-insensitive
   * "contains" on the label. `null` shows `items` exactly as passed — the
   * async case, where the server already filtered.
   */
  filter?: ComboboxFilter | null;
  /** A request is in flight. With no rows to show, a "Searching…" row stands in. */
  isLoading?: boolean;
  loadingMessage?: string;
  /** The status row when nothing matches. A function receives the text typed. */
  emptyMessage?: string | ((query: string) => string);
  /**
   * The LIST failed — not the field. Shown as a status row in the panel; the
   * field stays valid. Field validation is `errorText`.
   */
  listError?: string;
  /** Renders a "Try again" option under `listError`. */
  onRetry?: () => void;
  retryLabel?: string;
  /** The polite count announced as results change. */
  resultsMessage?: (count: number) => string;
  /**
   * Slot: the row pinned below the list, present in every state — pass a
   * `<ComboboxAction>`. It is the last stop in the arrow order.
   */
  action?: ReactElement;
  placeholder?: string;
  /** Input's ladder: 48 / 40 / 32. */
  size?: ComboboxSize;
  /** `soft` (default) is the form field; `full` the pill a search field draws. */
  shape?: ComboboxShape;
  /** Input's `surface` (ADR 0017): `page`, or `chrome` inside a panel. */
  surface?: ComboboxSurface;
  /** Slot: leading adornment, never wrapped (§3) — usually `<Search />`. */
  icon?: ReactElement;
  /** The chevron that opens the full list without typing. A search field may omit it. */
  hasTrigger?: boolean;
  /** Accessible name of the chevron. */
  triggerLabel?: string;
  /** Accessible name of the clear control. */
  clearLabel?: string;
  /**
   * The element a link row renders as — your router's `<Link />`. Defaults to
   * `<a />`. It receives `href`, the option role and the row's classes.
   */
  linkRender?: ReactElement;
  isDisabled?: boolean;
  isRequired?: boolean;
  /** Persistent guidance. Stays visible alongside an error. */
  helperText?: string;
  /** The field's error. Its presence marks the field invalid. */
  errorText?: string;
  /**
   * Where to portal the panel. Defaults to this field's own root, so a brand
   * scope around the field reaches the panel too.
   */
  container?: HTMLElement | null;
  className?: string;
}

type Option = ComboboxItem & { group?: number };

/**
 * An editable text field with a filtered listbox: one committed value, free
 * text allowed, options in labelled groups, rows that can be links, and an
 * action row that is always there.
 *
 * Focus never leaves the input — the highlighted row is an
 * `aria-activedescendant`, not a focused element. The ARIA 1.2 combobox
 * pattern, active-descendant management and dismissal come from Base UI
 * (ADR 0012); the field is Input's control and the panel is Select's.
 */
export const Combobox = forwardRef<HTMLInputElement, ComboboxProps>(function Combobox(
  {
    label,
    isLabelHidden = false,
    items,
    value: valueProp,
    defaultValue = null,
    onValueChange,
    inputValue: inputValueProp,
    defaultInputValue,
    onInputValueChange,
    onSubmitText,
    filter = containsFilter,
    isLoading = false,
    loadingMessage = "Searching…",
    emptyMessage = "No results",
    listError,
    onRetry,
    retryLabel = "Try again",
    resultsMessage = (count) => (count === 1 ? "1 result" : `${count} results`),
    action,
    placeholder,
    size = "lg",
    shape = "soft",
    surface = "page",
    icon,
    hasTrigger = true,
    triggerLabel = "Show all options",
    clearLabel = "Clear",
    linkRender,
    isDisabled = false,
    isRequired = false,
    helperText,
    errorText,
    container,
    className,
  },
  forwardedRef,
) {
  const inputId = useId();
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;
  const invalid = Boolean(errorText);
  const describedBy =
    [errorText ? errorId : null, helperText ? helperId : null].filter(Boolean).join(" ") || undefined;

  const groups = isGroups(items) ? items : null;
  const flat: Option[] = useMemo(
    () => (groups ? groups.flatMap((g, i) => g.items.map((item) => ({ ...item, group: i }))) : (items as readonly ComboboxItem[]).slice()),
    [groups, items],
  );
  const labelOf = useMemo(() => new Map(flat.map((item) => [item.value, item.label])), [flat]);

  const [value, setValue] = useControllableState<string | null>({
    value: valueProp,
    defaultValue,
    onChange: onValueChange,
  });
  const [text, setText] = useControllableState<string>({
    value: inputValueProp,
    defaultValue: defaultInputValue ?? (defaultValue != null ? (labelOf.get(defaultValue) ?? "") : ""),
    onChange: onInputValueChange,
  });
  const [isOpen, setIsOpen] = useState(false);
  // What the list is filtered BY. Not the text: after a commit the field reads
  // "Johannes Gutenberg", and reopening must show the whole list with that
  // row highlighted, not a list of one. Only typing narrows it.
  const [query, setQuery] = useState("");

  const rootRef = useRef<HTMLDivElement | null>(null);
  const controlRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  // State, not a ref: the scroll-edge hook re-subscribes when the list mounts.
  const [listNode, setListNode] = useState<HTMLDivElement | null>(null);

  const setInputRef = useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    },
    [forwardedRef],
  );

  const visible = useMemo(
    () => (filter && query.trim() !== "" ? flat.filter((item) => filter(item, query)) : flat),
    [filter, flat, query],
  );
  const hasError = Boolean(listError);
  const shownOptions = hasError ? [] : visible;
  const showRetry = hasError && Boolean(onRetry);

  /*
   * The ORDER of every row Base UI navigates, as one string. When it changes
   * under a highlighted row, Base UI keeps the INDEX and the highlight slides
   * onto whatever now sits there — "results arrived" moving the user's place.
   * The sheet asks for the opposite (§ Behaviour, Results arrive), so this
   * signature is how the drift is told apart from a real move.
   */
  const keys = [...shownOptions.map((o) => o.value), ...(showRetry ? [RETRY_KEY] : []), ...(action ? [ACTION_KEY] : [])];
  const signature = keys.join("\u0001");

  /* ---------------- highlight bookkeeping ---------------- */

  const bypassRef = useRef(false);
  const currentSigRef = useRef(signature);
  const recordRef = useRef<{ key: string; sig: string } | null>(null);

  /** Every row Base UI navigates, in its order — disabled ones included. */
  const allRows = useCallback(() => {
    return listNode ? Array.from(listNode.querySelectorAll<HTMLElement>('[role="option"]')) : [];
  }, [listNode]);
  const activeIndex = useCallback((rows: HTMLElement[]) => {
    const id = inputRef.current?.getAttribute("aria-activedescendant");
    const el = id ? document.getElementById(id) : null;
    return el ? rows.indexOf(el) : -1;
  }, []);

  /*
   * Base UI exposes no imperative "highlight this row". It also disables
   * Home/End for a typeable input (they move the caret), and it deliberately
   * lets the arrow keys land on DISABLED rows, which the sheet rules out. All
   * three are reached through the one public path it does have — its own
   * arrow-key handling — by stepping the highlight one row at a time.
   * `bypassRef` lets those synthetic steps past `onInputKeyDown`.
   *
   * `-1` means "nothing": past the first row, Base UI's loop hands the
   * highlight back to the input (APG), which is the only way to clear it.
   */
  const moveTo = useCallback(
    (target: number) => {
      const input = inputRef.current;
      if (!input) return;
      const from = activeIndex(allRows());
      const press = (key: "ArrowUp" | "ArrowDown", times: number) => {
        for (let i = 0; i < times; i++) {
          input.dispatchEvent(new globalThis.KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
        }
      };
      if (target === from) return;
      bypassRef.current = true;
      try {
        if (target === -1) press("ArrowUp", from + 1);
        else if (from === -1) press("ArrowDown", target + 1);
        else if (target > from) press("ArrowDown", target - from);
        else press("ArrowUp", from - target);
      } finally {
        bypassRef.current = false;
      }
    },
    [activeIndex, allRows],
  );

  const keyOf = (v: unknown): string | null =>
    v === ACTION ? ACTION_KEY : v === RETRY ? RETRY_KEY : typeof v === "string" ? v : null;

  const handleHighlight = (v: unknown, details: { reason: string }) => {
    // A programmatic emission after the rows changed is Base UI reporting
    // whatever slid under the old index. Ignore it: the record keeps the row
    // the USER was on, and the effect below puts the highlight back on it.
    if (details.reason === "none" && recordRef.current && recordRef.current.sig !== currentSigRef.current) return;
    const key = keyOf(v);
    recordRef.current = key === null ? null : { key, sig: currentSigRef.current };
  };

  // The highlight follows the row's VALUE across result changes: kept if the
  // row survived, dropped if it did not — never left on whatever replaced it.
  useLayoutEffect(() => {
    const record = recordRef.current;
    if (!isOpen || !record || record.sig === signature) return;
    queueMicrotask(() => {
      const target = allRows().findIndex(
        (el) => el.getAttribute("data-key") === record.key && !el.hasAttribute("data-disabled"),
      );
      moveTo(target);
      recordRef.current = target === -1 ? null : { key: record.key, sig: currentSigRef.current };
    });
  }, [signature, isOpen, allRows, moveTo]);

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement> & PreventableEvent) => {
    if (bypassRef.current || isDisabled) return;
    const rows = isOpen ? allRows() : [];
    const pos = isOpen ? activeIndex(rows) : -1;
    const enabled = rows.flatMap((el, i) => (el.hasAttribute("data-disabled") ? [] : [i]));
    const take = (target: number | undefined) => {
      event.preventDefault();
      event.preventBaseUIHandler?.();
      // Nothing further that way: stay put. No wrap, matching Select.
      if (target !== undefined) moveTo(target);
    };

    if (isOpen && rows.length > 0) {
      switch (event.key) {
        case "ArrowDown":
          return take(pos === -1 ? enabled[0] : enabled.find((i) => i > pos));
        case "ArrowUp":
          // From the input, up lands on the LAST row — the action (APG).
          return take(pos === -1 ? enabled.at(-1) : enabled.filter((i) => i < pos).at(-1));
        case "Home":
          return take(enabled[0]);
        case "End":
          return take(enabled.at(-1));
      }
    }

    if (event.key === "Enter" && pos === -1) onSubmitText?.(text);
  };

  /* ---------------- status ---------------- */

  const count = shownOptions.length;
  type Status = { kind: "loading" | "empty" | "error"; text: string } | null;
  const status: Status = hasError
    ? { kind: "error", text: listError! }
    : isLoading && count === 0
      ? { kind: "loading", text: loadingMessage }
      : count === 0
        ? { kind: "empty", text: typeof emptyMessage === "function" ? emptyMessage(text) : emptyMessage }
        : null;
  const hasRows = keys.length > 0;

  /* ---------------- rows ---------------- */

  const renderOption = (item: Option) => {
    const isLink = item.href !== undefined;
    return (
      <BaseCombobox.Item
        key={item.value}
        {...forBaseUI<ComponentPropsWithoutRef<typeof BaseCombobox.Item>>({
          value: item.value,
          disabled: item.isDisabled ?? false,
          "data-slot": isLink ? "combobox-link-option" : "combobox-option",
          "data-key": item.value,
          // tabIndex -1: an <a href> is tabbable by default, and the panel
          // portals into the field's root — so Tab from the input walked INTO
          // the list and the popup never closed. Focus never leaves the input.
          ...(isLink ? { render: linkRender ?? <a />, href: item.href, tabIndex: -1 } : {}),
          className: OPTION,
        })}
      >
        <span
          data-slot="combobox-option-label"
          className={cn("min-w-0 flex-1 truncate", !isLink && "in-data-[selected]:font-bold")}
        >
          {item.label}
        </span>
        <span data-slot="combobox-indicator" className={LANE}>
          {isLink ? (
            <ArrowUpRight aria-hidden="true" className="text-ink-muted" />
          ) : (
            // A tick AND a weight — two channels, because the highlighted row
            // already owns the fill (WCAG 1.4.1). Select's rule.
            <BaseCombobox.ItemIndicator className="flex text-ink-primary">
              <Check aria-hidden="true" />
            </BaseCombobox.ItemIndicator>
          )}
        </span>
      </BaseCombobox.Item>
    );
  };

  const optionRows = groups
    ? groups
        .map((group, index) => ({ group, index, rows: shownOptions.filter((o) => o.group === index) }))
        .filter(({ rows }) => rows.length > 0)
        .map(({ group, index, rows }) => (
          <BaseCombobox.Group
            key={`${index}-${group.label}`}
            {...forBaseUI<ComponentPropsWithoutRef<typeof BaseCombobox.Group>>({
              "data-slot": "combobox-group",
              className: "flex flex-col",
            })}
          >
            <BaseCombobox.GroupLabel
              {...forBaseUI<ComponentPropsWithoutRef<typeof BaseCombobox.GroupLabel>>({
                "data-slot": "combobox-group-label",
                className: menuGroupLabel(),
              })}
            >
              {group.label}
            </BaseCombobox.GroupLabel>
            {rows.map(renderOption)}
          </BaseCombobox.Group>
        ))
    : shownOptions.map(renderOption);

  const close = useCallback(() => setIsOpen(false), []);
  const contextValue = useMemo(() => ({ query: text, close }), [text, close]);

  return (
    <BaseCombobox.Root
      {...forBaseUI<ComponentPropsWithoutRef<typeof BaseCombobox.Root>>({
        value,
        onValueChange: (next: unknown, details: { reason: string; cancel: () => void }) => {
          // The action and Try again rows stop the press themselves; this is
          // the backstop for any path that still reaches a commit.
          if (next !== null && typeof next !== "string") return details.cancel();
          setValue(next);
        },
        inputValue: text,
        onInputValueChange: (next: string, details: { reason: string }) => {
          // Base UI resyncs the text to the committed label when the popup
          // finishes closing (reasons `none` / `input-clear`). That would
          // replace free text on every blur, which the sheet rules out.
          if (details.reason === "none" || details.reason === "input-clear") return;
          if (details.reason === "input-change") setQuery(next);
          else setQuery("");
          setText(next);
        },
        open: isOpen,
        onOpenChange: (next: boolean, details: { reason: string }) => {
          if (next && details.reason !== "input-change") setQuery("");
          setIsOpen(next);
        },
        itemToStringLabel: (v: unknown) => (typeof v === "string" ? (labelOf.get(v) ?? v) : ""),
        // The list opens on typing or ArrowDown, not on a click into the field.
        openOnInputClick: false,
        disabled: isDisabled,
        required: isRequired,
      })}
      // Outside forBaseUI(): the handler reads refs, and passing it through a
      // function call reads as a render-time ref access to react-hooks/refs.
      onItemHighlighted={handleHighlight}
    >
      {/* Read by the highlight handler during Base UI's own effects — set here,
          a child of Root, so it updates BEFORE Root's effects run. */}
      <SignatureProbe signature={signature} sigRef={currentSigRef} />
      <div
        ref={rootRef}
        data-slot="combobox"
        className={cn("flex w-full min-w-56 flex-col gap-sm", className)}
      >
        {/* Bare text inside a rounded surface takes the inset (§6) — Select's
            and Multiselect's label, the listbox-picker family. */}
        <label
          htmlFor={inputId}
          data-slot="combobox-label"
          className={cn("px-sm text-label-md font-body text-ink-secondary", isLabelHidden && "sr-only")}
        >
          {label}
          {isRequired && (
            <span aria-hidden="true" className="text-danger">
              {" *"}
            </span>
          )}
        </label>

        <div
          ref={controlRef}
          data-slot="combobox-control"
          data-size={size}
          data-shape={shape}
          data-invalid={invalid || undefined}
          data-disabled={isDisabled || undefined}
          className={cn(
            "flex w-full shrink-0 items-center overflow-clip border-hairline",
            "[&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-ink-muted",
            "transition-[border-color,box-shadow,background-color]", motionMicro,
            "border-edge-subtle",
            isDisabled ? SURFACE[surface].disabled : SURFACE[surface].rest,
            isDisabled && "[&>svg]:text-ink-disabled",
            !isDisabled && !invalid && "hover:border-edge-default",
            invalid && "border-danger",
            "focus-within:border-edge-focus focus-within:shadow-(--ui-focus-ring)",
            "focus-within:forced-colors:outline focus-within:forced-colors:outline-focus",
            SIZE[size],
            INSET[shape][size],
          )}
        >
          {icon}
          <BaseCombobox.Input
            {...forBaseUI<ComponentPropsWithoutRef<typeof BaseCombobox.Input>>({
              id: inputId,
              "data-slot": "combobox-input",
              placeholder,
              ...(invalid ? { "aria-invalid": true } : {}),
              ...(describedBy ? { "aria-describedby": describedBy } : {}),
              className: cn(
                "min-w-0 flex-1 truncate bg-transparent text-ink-primary placeholder:text-ink-placeholder",
                "font-body font-medium",
                // Safe here: the control draws the focus ring, not the input.
                "outline-none",
                "disabled:cursor-not-allowed disabled:text-ink-disabled",
              ),
            })}
            // Refs and ref-reading handlers stay out of forBaseUI() (react-hooks/refs).
            ref={setInputRef}
            onKeyDown={onInputKeyDown}
          />
          {text !== "" && !isDisabled && (
            <BaseCombobox.Clear
              {...forBaseUI<ComponentPropsWithoutRef<typeof BaseCombobox.Clear>>({
                // Rendered by us, on TEXT — Base UI's own visibility rule
                // follows the committed value, and free text needs clearing too.
                keepMounted: true,
                "aria-label": clearLabel,
                "data-slot": "combobox-clear",
                className: cn(
                  // 24px: the SC 2.5.8 floor. Out of the tab order (Base UI's
                  // default) — Escape twice is its keyboard path.
                  "flex size-6 shrink-0 cursor-pointer items-center justify-center text-ink-muted",
                  shape === "full" ? "rounded-full" : "rounded-sm",
                  "transition-[background-color,color]", motionMicro,
                  "hover:bg-hover hover:text-ink-primary",
                  "[&_svg]:size-4 [&_svg]:shrink-0",
                ),
              })}
            >
              <Close aria-hidden="true" />
            </BaseCombobox.Clear>
          )}
          {hasTrigger && (
            <BaseCombobox.Trigger
              {...forBaseUI<ComponentPropsWithoutRef<typeof BaseCombobox.Trigger>>({
                "aria-label": triggerLabel,
                "data-slot": "combobox-trigger",
                className: cn(
                  "relative flex shrink-0 cursor-pointer items-center text-ink-muted",
                  // The glyph is 16px; the target is 24 (SC 2.5.8) — 4px of
                  // invisible hit area on every side.
                  "before:absolute before:-inset-1 before:content-['']",
                  "[&_svg]:size-4 [&_svg]:shrink-0",
                  "disabled:cursor-not-allowed disabled:text-ink-disabled",
                ),
              })}
            >
              {isOpen ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
            </BaseCombobox.Trigger>
          )}
        </div>

        <BaseCombobox.Portal container={container ?? (rootRef as RefObject<HTMLElement | null>)}>
          <BaseCombobox.Positioner
            {...forBaseUI<ComponentPropsWithoutRef<typeof BaseCombobox.Positioner>>({
              sideOffset: 8,
              // Off the viewport edge when Base UI flips or shifts (§7c).
              collisionPadding: 8,
              className: "z-(--ui-z-dropdown)",
            })}
            anchor={controlRef}
          >
            <BaseCombobox.Popup
              {...forBaseUI<ComponentPropsWithoutRef<typeof BaseCombobox.Popup>>({
                "data-slot": "combobox-panel",
                // Focus never leaves the input. A press anywhere in the panel
                // that is not a row (its inset, a group heading, a status
                // line) would otherwise focus the tabIndex=-1 listbox and
                // strand the caret; rows already prevent this themselves.
                onMouseDown: (event: MouseEvent) => event.preventDefault(),
                className: cn(
                  // Select's panel: radius-md over a 4px inset around
                  // radius-sm rows — 4 + 4 = 8, concentric (§6).
                  "flex min-w-(--anchor-width) flex-col overflow-clip rounded-md p-xs",
                  // Never taller or wider than the space Base UI measured (§7c).
                  "max-h-(--available-height) max-w-(--available-width)",
                  "border bg-surface border-edge-subtle shadow-md",
                  "transition-[opacity,scale]", motionMicro,
                  "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
                  "data-[starting-style]:scale-98 data-[ending-style]:scale-98",
                ),
              })}
            >
              <ComboboxContext.Provider value={contextValue}>
                {/*
                  ONE live region, always mounted while the panel is: a visible
                  status row (loading, empty, error) when there is one, and the
                  polite result count, visually hidden, when there are results.
                  It sits OUTSIDE the listbox, whose children may only be
                  options and groups.
                */}
                <BaseCombobox.Status
                  {...forBaseUI<ComponentPropsWithoutRef<typeof BaseCombobox.Status>>({
                    "data-slot": "combobox-status",
                    "data-status": status?.kind,
                    className: status
                      ? cn(
                          "flex items-center gap-sm p-md text-body-md font-body",
                          status.kind === "error" ? "text-ink-primary" : "text-ink-muted",
                        )
                      : "sr-only",
                  })}
                >
                  {status?.kind === "loading" && (
                    // Button's spinner. Stops under reduced motion and stays a
                    // broken ring — still distinct from a resting glyph.
                    <span
                      aria-hidden="true"
                      data-slot="combobox-spinner"
                      className="size-4 shrink-0 animate-spin rounded-full border-thick border-current/30 border-r-current motion-reduce:animate-none"
                    />
                  )}
                  {status?.kind === "error" && (
                    <AlertCircle aria-hidden="true" className="size-4 shrink-0 text-danger" />
                  )}
                  {status ? <span className="min-w-0 flex-1">{status.text}</span> : resultsMessage(count)}
                </BaseCombobox.Status>

                {hasRows && (
                  <BaseCombobox.List
                    {...forBaseUI<ComponentPropsWithoutRef<typeof BaseCombobox.List>>({
                      ref: setListNode,
                      "data-slot": "combobox-list",
                      "aria-busy": isLoading || undefined,
                      // The LISTBOX is the scroller, and that is load-bearing:
                      // a scrolling region needs a keyboard path (SC 2.1.1),
                      // and here it is the arrow keys moving an
                      // active descendant that scrolls into view. axe accepts
                      // that only for the combobox's own popup — a scrolling
                      // div inside it fails scrollable-region-focusable, and a
                      // focusable one is a child a listbox may not have.
                      className: "relative flex min-h-0 flex-1 flex-col overflow-y-auto",
                    })}
                  >
                    {count > 0 && (
                      // Groups are separated by SPACE, no rule — 8px, as
                      // menuSeparator draws it. Rows inside stack flush.
                      <div data-slot="combobox-options" className={cn("flex flex-col", groups && "gap-sm")}>
                        {optionRows}
                      </div>
                    )}
                    {showRetry && (
                      <BaseCombobox.Item
                        {...forBaseUI<ComponentPropsWithoutRef<typeof BaseCombobox.Item>>({
                          value: RETRY,
                          "data-slot": "combobox-retry",
                          "data-key": RETRY_KEY,
                          className: OPTION,
                          onClick: (event: MouseEvent & PreventableEvent) => {
                            event.preventBaseUIHandler?.();
                            onRetry?.();
                          },
                          onMouseUp: (event: MouseEvent & PreventableEvent) => event.preventBaseUIHandler?.(),
                        })}
                      >
                        <span className={LEADING}>
                          <RefreshCw aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1 truncate">{retryLabel}</span>
                        <span className={LANE} />
                      </BaseCombobox.Item>
                    )}
                    {action && (
                      // Pinned: sticky to the bottom of the scrolling list, on
                      // the panel's own fill so rows pass under it. 8px of
                      // space above the action — no rule (decided in review).
                      // Present in every state, last in arrow order.
                      <div
                        data-slot="combobox-action-region"
                        // Something always sits above it — rows, or the status
                        // line outside the listbox — so the 8px is constant.
                        className="sticky bottom-0 flex flex-col bg-surface pt-sm"
                      >
                        {/* The list dissolves into the panel just above the
                            action while there is more below — the sheet's own
                            construction, a band hung above the region. Bound
                            to the list, so it eases out over the last rows of
                            scroll and is gone at the end and when the list
                            fits. Inside the scroller, so no scrollbar inset. */}
                        <Fade
                          side="bottom"
                          size="md"
                          ground="surface"
                          scrollContainer={listNode}
                          className="top-auto bottom-full"
                        />
                        {action}
                      </div>
                    )}
                  </BaseCombobox.List>
                )}
              </ComboboxContext.Provider>
            </BaseCombobox.Popup>
          </BaseCombobox.Positioner>
        </BaseCombobox.Portal>

        {errorText && (
          <p data-slot="combobox-error" id={errorId} className="px-sm text-caption font-body text-danger">
            {errorText}
          </p>
        )}
        {helperText && (
          <p data-slot="combobox-helper" id={helperId} className="px-sm text-caption font-body text-ink-muted">
            {helperText}
          </p>
        )}
      </div>
    </BaseCombobox.Root>
  );
});

/** Publishes the current row order before Base UI's root effects read it. */
function SignatureProbe({ signature, sigRef }: { signature: string; sigRef: { current: string } }) {
  useLayoutEffect(() => {
    sigRef.current = signature;
  }, [signature, sigRef]);
  return null;
}

export interface ComboboxActionProps {
  /** The row's text. A function receives what is typed: `(q) => \`Search everything for “${q}”\``. */
  children: ReactNode | ((query: string) => ReactNode);
  /** Slot: a leading glyph, never wrapped (§3). */
  icon?: ReactElement;
  /** Enter or a press on the row. Receives the text in the field. Closes the list. */
  onAction: (query: string) => void;
}

/**
 * The row pinned below the list — "Search everything for …" — present
 * whatever the results. An option for ARIA purposes (`role="option"`), so the
 * arrow keys reach it and Enter runs it, but never a value: it commits
 * nothing and is never drawn selected.
 */
export function ComboboxAction({ children, icon, onAction }: ComboboxActionProps) {
  const context = useContext(ComboboxContext);
  const query = context?.query ?? "";
  return (
    <BaseCombobox.Item
      {...forBaseUI<ComponentPropsWithoutRef<typeof BaseCombobox.Item>>({
        value: ACTION,
        "data-slot": "combobox-action",
        "data-key": ACTION_KEY,
        className: OPTION,
        onClick: (event: MouseEvent & PreventableEvent) => {
          // Stops Base UI's commit, which would fill the field with "" and
          // close as if a value were chosen.
          event.preventBaseUIHandler?.();
          onAction(query);
          context?.close();
        },
        onMouseUp: (event: MouseEvent & PreventableEvent) => event.preventBaseUIHandler?.(),
      })}
    >
      {icon && <span className={LEADING}>{icon}</span>}
      <span data-slot="combobox-action-label" className="min-w-0 flex-1 truncate">
        {typeof children === "function" ? children(query) : children}
      </span>
      <span className={LANE} />
    </BaseCombobox.Item>
  );
}
