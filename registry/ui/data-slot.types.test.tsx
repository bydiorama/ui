/**
 * Compile-time contract: a component's `data-slot` is its own (CONVENTIONS §5).
 * `tsc --noEmit` is the runner, like every *.types.test.tsx.
 *
 * Every part sets `data-slot` AFTER the props it forwards — contract
 * attributes win (ADR 0014) — so a caller's `data-slot` was overwritten with
 * no error: `<Popover.Panel data-slot="tag-picker">` rendered
 * `popover-panel`. TypeScript does not check a hyphenated JSX attribute that
 * a props type leaves undeclared, so the fix is a DECLARATION: every exported
 * component's props intersect `OwnedSlot` (`"data-slot"?: never`) from
 * `@/lib/data-slot`, and passing one is a type error.
 *
 * This file holds EVERY exported component to that, not a sample: it imports
 * each implementation module and walks its exports — compound parts included
 * (`Popover.Panel`) — at the type level. A component whose props do not
 * declare the slot as `never` fails `NoneLeak` and the error names it. The
 * explicit seams (ADR 0014 §5) are an exact list, so a new one is a reviewed
 * decision rather than a side effect. `data-slot.test.ts` fails if a module
 * is missing from the imports below.
 */
import type { JSX } from "react";

import { Popover } from "./popover/popover.tsx";
import { Button } from "./button/button.tsx";
import { Checkbox } from "./checkbox/checkbox.tsx";
import { Card } from "./card/card.tsx";

import * as chartCardModule from "../blocks/chart-card/chart-card.tsx";
import * as knowledgeGraphExplorerModule from "../blocks/knowledge-graph-explorer/knowledge-graph-explorer.tsx";
import * as statTilesModule from "../blocks/stat-tiles/stat-tiles.tsx";
import * as accordionModule from "./accordion/accordion.tsx";
import * as aspectRatioModule from "./aspect-ratio/aspect-ratio.tsx";
import * as avatarModule from "./avatar/avatar.tsx";
import * as badgeModule from "./badge/badge.tsx";
import * as bannerModule from "./banner/banner.tsx";
import * as buttonModule from "./button/button.tsx";
import * as calendarModule from "./calendar/calendar.tsx";
import * as cardSortingModule from "./card-sorting/card-sorting.tsx";
import * as cardModule from "./card/card.tsx";
import * as chartModule from "./chart/chart.tsx";
import * as chatComposerModule from "./chat-composer/chat-composer.tsx";
import * as chatMessageModule from "./chat-message/chat-message.tsx";
import * as chatProgressModule from "./chat-progress/chat-progress.tsx";
import * as chatQuestionnaireModule from "./chat-questionnaire/chat-questionnaire.tsx";
import * as chatRunDockModule from "./chat-run-dock/chat-run-dock.tsx";
import * as chatSourcesModule from "./chat-sources/chat-sources.tsx";
import * as chatTasksModule from "./chat-tasks/chat-tasks.tsx";
import * as chatWidgetModule from "./chat-widget/chat-widget.tsx";
import * as checkboxModule from "./checkbox/checkbox.tsx";
import * as colorPickerModule from "./color-picker/color-picker.tsx";
import * as comboboxModule from "./combobox/combobox.tsx";
import * as contextMenuModule from "./context-menu/context-menu.tsx";
import * as datePickerModule from "./date-picker/date-picker.tsx";
import * as diagramModule from "./diagram/diagram.tsx";
import * as dotPatternModule from "./dot-pattern/dot-pattern.tsx";
import * as drawerModule from "./drawer/drawer.tsx";
import * as emptyStateModule from "./empty-state/empty-state.tsx";
import * as fadeModule from "./fade/fade.tsx";
import * as headerModule from "./header/header.tsx";
import * as imageEditModule from "./image-edit/image-edit.tsx";
import * as imageOverlayModule from "./image-overlay/image-overlay.tsx";
import * as imageUploadModule from "./image-upload/image-upload.tsx";
import * as inputModule from "./input/input.tsx";
import * as mediaToggleModule from "./media-toggle/media-toggle.tsx";
import * as menuModule from "./menu/menu.tsx";
import * as meterModule from "./meter/meter.tsx";
import * as modalModule from "./modal/modal.tsx";
import * as multiselectModule from "./multiselect/multiselect.tsx";
import * as navRailModule from "./nav-rail/nav-rail.tsx";
import * as networkCanvasModule from "./network/network-canvas.tsx";
import * as networkModule from "./network/network.tsx";
import * as popoverModule from "./popover/popover.tsx";
import * as presenceModule from "./presence/presence.tsx";
import * as textSwapModule from "./text-swap/text-swap.tsx";
import * as iconSwapModule from "./icon-swap/icon-swap.tsx";
import * as countModule from "./count/count.tsx";
import * as staggerModule from "./stagger/stagger.tsx";
import * as progressModule from "./progress/progress.tsx";
import * as radioModule from "./radio/radio.tsx";
import * as rangeSliderModule from "./range-slider/range-slider.tsx";
import * as selectModule from "./select/select.tsx";
import * as sheetModule from "./sheet/sheet.tsx";
import * as sidebarModule from "./sidebar/sidebar.tsx";
import * as siteHeaderModule from "./site-header/site-header.tsx";
import * as skeletonModule from "./skeleton/skeleton.tsx";
import * as sliderModule from "./slider/slider.tsx";
import * as sparklineModule from "./sparkline/sparkline.tsx";
import * as statusMatrixModule from "./status-matrix/status-matrix.tsx";
import * as switchModule from "./switch/switch.tsx";
import * as tableModule from "./table/table.tsx";
import * as tabsModule from "./tabs/tabs.tsx";
import * as textareaModule from "./textarea/textarea.tsx";
import * as thumbnailModule from "./thumbnail/thumbnail.tsx";
import * as toastModule from "./toast/toast.tsx";
import * as tooltipModule from "./tooltip/tooltip.tsx";

/** Every implementation module, by file name. */
interface Modules {
  "chart-card": typeof chartCardModule;
  "knowledge-graph-explorer": typeof knowledgeGraphExplorerModule;
  "stat-tiles": typeof statTilesModule;
  "accordion": typeof accordionModule;
  "aspect-ratio": typeof aspectRatioModule;
  "avatar": typeof avatarModule;
  "badge": typeof badgeModule;
  "banner": typeof bannerModule;
  "button": typeof buttonModule;
  "calendar": typeof calendarModule;
  "card-sorting": typeof cardSortingModule;
  "card": typeof cardModule;
  "chart": typeof chartModule;
  "chat-composer": typeof chatComposerModule;
  "chat-message": typeof chatMessageModule;
  "chat-progress": typeof chatProgressModule;
  "chat-questionnaire": typeof chatQuestionnaireModule;
  "chat-run-dock": typeof chatRunDockModule;
  "chat-sources": typeof chatSourcesModule;
  "chat-tasks": typeof chatTasksModule;
  "chat-widget": typeof chatWidgetModule;
  "checkbox": typeof checkboxModule;
  "color-picker": typeof colorPickerModule;
  "combobox": typeof comboboxModule;
  "context-menu": typeof contextMenuModule;
  "date-picker": typeof datePickerModule;
  "diagram": typeof diagramModule;
  "dot-pattern": typeof dotPatternModule;
  "drawer": typeof drawerModule;
  "empty-state": typeof emptyStateModule;
  "fade": typeof fadeModule;
  "header": typeof headerModule;
  "image-edit": typeof imageEditModule;
  "image-overlay": typeof imageOverlayModule;
  "image-upload": typeof imageUploadModule;
  "input": typeof inputModule;
  "media-toggle": typeof mediaToggleModule;
  "menu": typeof menuModule;
  "meter": typeof meterModule;
  "modal": typeof modalModule;
  "multiselect": typeof multiselectModule;
  "nav-rail": typeof navRailModule;
  "network-canvas": typeof networkCanvasModule;
  "network": typeof networkModule;
  "popover": typeof popoverModule;
  "presence": typeof presenceModule;
  "text-swap": typeof textSwapModule;
  "icon-swap": typeof iconSwapModule;
  count: typeof countModule;
  stagger: typeof staggerModule;
  "progress": typeof progressModule;
  "radio": typeof radioModule;
  "range-slider": typeof rangeSliderModule;
  "select": typeof selectModule;
  "sheet": typeof sheetModule;
  "sidebar": typeof sidebarModule;
  "site-header": typeof siteHeaderModule;
  "skeleton": typeof skeletonModule;
  "slider": typeof sliderModule;
  "sparkline": typeof sparklineModule;
  "status-matrix": typeof statusMatrixModule;
  "switch": typeof switchModule;
  "table": typeof tableModule;
  "tabs": typeof tabsModule;
  "textarea": typeof textareaModule;
  "thumbnail": typeof thumbnailModule;
  "toast": typeof toastModule;
  "tooltip": typeof tooltipModule;
}

/** A first character that is a capital LETTER — `Popover`, not `$$typeof`. */
type IsComponentName<K> = K extends `${infer F}${string}` ? (F extends Uppercase<F> ? (F extends Lowercase<F> ? false : true) : false) : false;

/** What a part's props say about `data-slot`. */
type SlotOf<V> = V extends (...args: infer A) => unknown
  ? A extends [infer P, ...unknown[]]
    ? "data-slot" extends keyof P
      ? Exclude<P["data-slot" & keyof P], undefined>
      : "undeclared"
    : "no props"
  : never;

/**
 * Every component-shaped export, recursively through compound statics, as
 * `"file.Export.Part"` paths tagged with how it treats `data-slot`:
 * `owned` (`never` — the rule), `seam` (any string — ADR 0014 §5), or `leak`.
 */
type Walk<V, Path extends string> =
  | (V extends (...args: never[]) => unknown
      ? [SlotOf<V>] extends [never]
        ? { path: Path; kind: "owned" }
        : string extends SlotOf<V>
          ? { path: Path; kind: "seam" }
          : { path: Path; kind: "leak" }
      : never)
  | {
      [K in keyof V & string]: IsComponentName<K> extends true
        ? V[K] extends (...args: never[]) => unknown
          ? Walk<V[K], `${Path}.${K}`>
          : never
        : never;
    }[keyof V & string];

type Every = {
  [F in keyof Modules & string]: {
    [K in keyof Modules[F] & string]: IsComponentName<K> extends true ? Walk<Modules[F][K], `${F}.${K}`> : never;
  }[keyof Modules[F] & string];
}[keyof Modules & string];

type Paths<Kind extends string> = Extract<Every, { kind: Kind }>["path"];

/** `T` must be `never`; the error message names whatever it is instead. */
type NoneLeak<T extends never> = T;
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type IsTrue<T extends true> = T;

// The rule: no exported component accepts a caller's `data-slot`.
export type Leaks = NoneLeak<Paths<"leak">>;

// The exceptions, exactly. Each is an atom a larger component renders as one
// of its own parts, renamed through a TYPED prop rather than spread order.
export type Seams = IsTrue<
  Same<
    Paths<"seam">,
    | "button.Button" // CardSorting's handle, ChatTasks' actions, …
    | "badge.Badge" // ChatQuestionnaire's answer
    | "header.Header.MenuButton" // SiteHeader's menu control
    | "progress.Progress" // ChatProgress's measured bar, ImageUpload's file bar
    | "fade.Fade" // ChatWidget's scroll fade
    | "aspect-ratio.AspectRatio" // ImageOverlay's frame
    | "skeleton.Skeleton" // Table's loading bars
    | "chat-widget.ChatWidget" // ChatTasks' card
  >
>;

// The walk must actually find the parts, or "nothing leaks" is vacuous.
export type FindsCompoundParts = IsTrue<Same<Extract<Paths<"owned">, "popover.Popover.Panel">, "popover.Popover.Panel">>;

/** The reported case, and the shapes a caller is pointed at instead. */
export function Usage(): JSX.Element[] {
  return [
    // @ts-expect-error data-slot is component-owned — it would render "popover-panel" anyway
    <Popover.Panel key="a" data-slot="tag-picker">x</Popover.Panel>,
    // @ts-expect-error the same on a single-element component
    <Checkbox key="b" data-slot="row-select">Select</Checkbox>,
    // @ts-expect-error and on a compound part that forwards native props
    <Card.Body key="c" data-slot="summary" />,
    // Your own attributes are what to target a part with — they pass through.
    <Popover.Panel key="d" data-testid="tag-picker" data-tag-picker="">x</Popover.Panel>,
    <Checkbox key="e" data-testid="row-select">Select</Checkbox>,
    // A seam takes the part name of the component composing it.
    <Button key="f" data-slot="card-sorting-handle">Move</Button>,
  ];
}
