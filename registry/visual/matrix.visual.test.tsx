/**
 * Visual regression — the layer every other test in this repo cannot reach.
 *
 * The browser suite asserts *computed values*: a radius is 24px, an ink is
 * rgb(105,99,93). That catches a token resolving wrongly and misses everything
 * about how the thing looks — a badge whose two sizes are identical, a label
 * hugging the top of its row, a panel with no visible boundary. All three
 * shipped, and all three were found by a person looking at Storybook.
 *
 * Each case renders in BOTH schemes, because the resolver derives dark and a
 * role can be right in one and wrong in the other.
 *
 * Baselines are platform-specific (`-chromium-darwin` locally,
 * `-chromium-linux` in CI): font rasterisation differs between the two, so
 * vitest keeps a set per platform and a macOS PNG is never compared against a
 * Linux run. CI runs this inside a pinned Playwright container, which is what
 * makes the Linux set reproducible — `ubuntu-latest` shifts under us and the
 * comparator is at zero tolerance. Record a Linux set with the "Generate
 * visual baselines" workflow; run it locally with `pnpm test:visual`.
 */
import { afterEach, describe, expect, test } from "vitest";
import { page } from "vitest/browser";
import { ChevronDown, Colors, ExpandSidebar, Home, Image, Inbox, InfoCircle, Search, UsersGroup } from "griddy-icons";

import { chromeControl } from "@/lib/chrome-control";
import { createRoot, type Root } from "react-dom/client";
import { act, useEffect, useRef } from "react";
import type { ReactElement } from "react";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED } from "@bydiorama/tokens";

import { Accordion } from "@/ui/accordion/accordion.tsx";
import { AspectRatio } from "@/ui/aspect-ratio/aspect-ratio.tsx";
import { Skeleton } from "@/ui/skeleton/skeleton.tsx";
import { DotPattern } from "@/ui/dot-pattern/dot-pattern.tsx";
import { Fade } from "@/ui/fade/fade.tsx";
import { Avatar } from "@/ui/avatar/avatar.tsx";
import { Badge } from "@/ui/badge/badge.tsx";
import { MediaToggle } from "@/ui/media-toggle/media-toggle.tsx";
import { Banner } from "@/ui/banner/banner.tsx";
import { SiteHeader } from "@/ui/site-header/site-header.tsx";
import { Button } from "@/ui/button/button.tsx";
import { Calendar } from "@/ui/calendar/calendar.tsx";
import { Card } from "@/ui/card/card.tsx";
import { ContextMenu } from "@/ui/context-menu/context-menu.tsx";
import { DatePicker } from "@/ui/date-picker/date-picker.tsx";
import { Checkbox } from "@/ui/checkbox/checkbox.tsx";
import { Radio, RadioGroup } from "@/ui/radio/radio.tsx";
import { Tooltip } from "@/ui/tooltip/tooltip.tsx";
import { Toast, useToast } from "@/ui/toast/toast.tsx";
import { Drawer } from "@/ui/drawer/drawer.tsx";
import { Header } from "@/ui/header/header.tsx";
import { ImageEdit } from "@/ui/image-edit/image-edit.tsx";
import { ImageOverlay } from "@/ui/image-overlay/image-overlay.tsx";
import { ImageUpload } from "@/ui/image-upload/image-upload.tsx";
import { Input } from "@/ui/input/input.tsx";
import { Menu } from "@/ui/menu/menu.tsx";
import { Modal } from "@/ui/modal/modal.tsx";
import { Multiselect, type MultiselectItem } from "@/ui/multiselect/multiselect.tsx";
import { Combobox } from "@/ui/combobox/combobox.tsx";
import { Popover } from "@/ui/popover/popover.tsx";
import { Progress } from "@/ui/progress/progress.tsx";
import { BarChart, Chart } from "@/ui/chart/chart.tsx";
import { Meter } from "@/ui/meter/meter.tsx";
import { Sparkline } from "@/ui/sparkline/sparkline.tsx";
import { StatusMatrix } from "@/ui/status-matrix/status-matrix.tsx";
import { StatTiles } from "@/blocks/stat-tiles/stat-tiles.tsx";
import { ChartCard } from "@/blocks/chart-card/chart-card.tsx";
import { Select, type SelectItem } from "@/ui/select/select.tsx";
import { Sheet } from "@/ui/sheet/sheet.tsx";
import { Slider } from "@/ui/slider/slider.tsx";
import { RangeSlider } from "@/ui/range-slider/range-slider.tsx";
import { CardSorting } from "@/ui/card-sorting/card-sorting.tsx";
import { Sidebar } from "@/ui/sidebar/sidebar.tsx";
import { NavRail } from "@/ui/nav-rail/nav-rail.tsx";
import { EmptyState } from "@/ui/empty-state/empty-state.tsx";
import { Switch } from "@/ui/switch/switch.tsx";
import { Table, type TableColumn } from "@/ui/table/table.tsx";
import { Tabs } from "@/ui/tabs/tabs.tsx";
import { Textarea } from "@/ui/textarea/textarea.tsx";
import { Thumbnail } from "@/ui/thumbnail/thumbnail.tsx";
import { ChatComposer } from "@/ui/chat-composer/chat-composer.tsx";
import { ChatMessage } from "@/ui/chat-message/chat-message.tsx";
import { ChatProgress, type ChatProgressLane, type ChatProgressStep } from "@/ui/chat-progress/chat-progress.tsx";
import { ChatRunDock, ChatRunMark, type ChatRun } from "@/ui/chat-run-dock/chat-run-dock.tsx";
import { ChatSources, type ChatSource, type ChatSourcesLabels } from "@/ui/chat-sources/chat-sources.tsx";
import { ChatTasks } from "@/ui/chat-tasks/chat-tasks.tsx";
import { ChatWidget } from "@/ui/chat-widget/chat-widget.tsx";
import { ChatQuestionnaire, type ChatQuestionnaireOption } from "@/ui/chat-questionnaire/chat-questionnaire.tsx";

/**
 * A gradient and a flat white, both as data URIs.
 *
 * No network — a baseline that depends on a fetch is a baseline that differs
 * between the run that recorded it and the run that compares it. The white one
 * is the picture ImageOverlay's AA guarantee is stated against, and it is the
 * only one that shows whether the veil is strong enough.
 */
const MEDIA =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" preserveAspectRatio="none">
      <defs><linearGradient id="g" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0" stop-color="#a5aaf6"/><stop offset="0.5" stop-color="#e0a473"/>
        <stop offset="1" stop-color="#5b5ca8"/>
      </linearGradient></defs>
      <rect width="64" height="64" fill="url(#g)"/>
    </svg>`,
  );
/** Two more grounds, so a four-tile picker does not read as one image x4. */
const MEDIA_WARM =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" preserveAspectRatio="none">
      <defs><linearGradient id="g" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0" stop-color="#e0a473"/><stop offset="1" stop-color="#8f5426"/>
      </linearGradient></defs>
      <rect width="64" height="64" fill="url(#g)"/>
    </svg>`,
  );
const MEDIA_ROSE =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" preserveAspectRatio="none">
      <defs><linearGradient id="g" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0" stop-color="#ef9e80"/><stop offset="1" stop-color="#6a2c18"/>
      </linearGradient></defs>
      <rect width="64" height="64" fill="url(#g)"/>
    </svg>`,
  );
const MEDIA_COOL =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" preserveAspectRatio="none">
      <defs><linearGradient id="g" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0" stop-color="#6fbf8d"/><stop offset="1" stop-color="#19462d"/>
      </linearGradient></defs>
      <rect width="64" height="64" fill="url(#g)"/>
    </svg>`,
  );
const WHITE_MEDIA =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 4"><rect width="4" height="4" fill="#ffffff"/></svg>`,
  );

/**
 * A 1x1 transparent GIF — the well, with nothing painted over it.
 *
 * NOT a broken path and NOT `src=""`. A broken image makes Chromium draw its
 * own placeholder glyph, and a UA asset in a committed baseline is a baseline
 * that breaks on a browser upgrade for a reason unrelated to this library.
 * (`src=""` is worse still: React warns, and the storybook setup turns a
 * console.error into a thrown test.) The broken-source state is shown in
 * Storybook, where nothing is being compared pixel for pixel.
 */
const NO_MEDIA = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

const PAIR = resolveThemePair(THEME_ZERO, { authored: ZERO_AUTHORED });
const SCHEMES = ["light", "dark"] as const;

let container: HTMLDivElement | null = null;
let root: Root | null = null;

/** Renders into a themed frame of fixed width, so a diff is layout-stable. */
function mount(
  ui: ReactElement | ((portalContainer: HTMLDivElement) => ReactElement),
  scheme: (typeof SCHEMES)[number],
  isOverlay = false,
) {
  container = document.createElement("div");
  Object.assign(container.style, toStyleObject(PAIR)[scheme] as unknown as Record<string, string>, {
    width: "560px",
    padding: "24px",
    colorScheme: scheme,
  });
  container.className = "bg-base";
  if (isOverlay) {
    // Fixed overlays need a containing block with real dimensions. Without
    // this, an element screenshot sees only the zero-height portal host while
    // the surface paints against the browser viewport somewhere outside it.
    Object.assign(container.style, {
      height: "640px",
      overflow: "hidden",
      position: "relative",
      transform: "translateZ(0)",
    });
  }
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(typeof ui === "function" ? ui(container!) : ui);
  });
  return container;
}

/**
 * Fonts and transitions both move pixels; settle each before capturing.
 *
 * An INFINITE animation is handled rather than banned, which it used to be.
 * `finished` on a looping animation resolves never, so awaiting it hung the
 * whole suite on any frame containing one — reported as a timeout naming no
 * case. The old rule was "never put one in a case", and it held only while no
 * component's RESTING state looped: Thumbnail's and ImageUpload's spinners are
 * behind a busy prop, so leaving them out cost nothing. Skeleton pulses by
 * definition, and `check:visual-coverage` requires every manifest item to have
 * a case, so the ban and the coverage gate could not both be satisfied.
 *
 * Pausing at time zero rather than cancelling: it yields a deterministic frame
 * that is also a MEANINGFUL one — the first keyframe, which for a pulse is
 * full opacity and for a spinner is an unrotated ring — where cancelling would
 * photograph the element as if the animation had never been declared, and a
 * removed animation and a broken one look identical. The loop is still real;
 * `skeleton.browser.test.tsx` asserts it runs and loops, which is the layer
 * that can see it.
 */
async function stable(el: Element) {
  await act(async () => {
    await document.fonts.ready;
    // Two frames for ResizeObserver: a chart renders at its 640px server width
    // until the observer reports the frame, and chart-card measured 729px in a
    // 560px frame on two runs in three without this wait.
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
  await act(async () => {
    const running = el.getAnimations({ subtree: true });
    const finite: Animation[] = [];
    for (const animation of running) {
      if (animation.effect?.getTiming().iterations === Number.POSITIVE_INFINITY) {
        animation.pause();
        animation.currentTime = 0;
      } else {
        finite.push(animation);
      }
    }
    await Promise.all(finite.map((a) => a.finished.catch(() => undefined)));
  });
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

const SELECT_ITEMS: SelectItem[] = [
  { value: "concept", label: "Brand Concept" },
  { value: "guidelines", label: "Brand Guidelines" },
  { value: "stationery", label: "Stationery" },
];

interface VisualDesigner {
  id: string;
  name: string;
  status: "Active" | "Pending" | "Archived";
  year: number;
}

const VISUAL_ROWS: VisualDesigner[] = [
  { id: "tschichold", name: "Jan Tschichold", status: "Active", year: 1928 },
  { id: "frutiger", name: "Adrian Frutiger", status: "Active", year: 1957 },
  { id: "vignelli", name: "Massimo Vignelli", status: "Archived", year: 1972 },
  { id: "biro", name: "László Bíró", status: "Archived", year: 1938 },
];

const VISUAL_COLUMNS: TableColumn<VisualDesigner>[] = [
  { key: "name", header: "Name", isSortable: true, cell: (row) => row.name },
  {
    key: "status",
    header: "Status",
    width: 120,
    cell: (row) => (
      <Badge variant={row.status === "Active" ? "success" : "unselected"}>{row.status}</Badge>
    ),
  },
  { key: "year", header: "Year", width: 72, isNumeric: true, cell: (row) => row.year },
];

const MULTISELECT_ITEMS: MultiselectItem[] = [
  { value: "concept", label: "Brand Concept" },
  { value: "guidelines", label: "Brand Guidelines" },
  { value: "stationery", label: "Stationery" },
];

/** Fires the toast case's stack once, on mount — newest (fullest) in front. */
function VisualToasts() {
  const manager = useToast();
  const added = useRef(false);
  useEffect(() => {
    if (added.current) return;
    added.current = true;
    manager.add({ title: "Draft saved", description: "New Alphabet — Wim Crouwel, 1967" });
    manager.add({ type: "danger", title: "Export failed", description: "Movable type — Johannes Gutenberg, 1440" });
    manager.add({
      type: "success",
      title: "Brand kit exported",
      description: "Grid systems — Josef Müller-Brockmann, 1961",
      action: { label: "Undo", onClick: () => {} },
    });
  }, [manager]);
  return null;
}

/**
 * The sheet's thought chain (3ZV1-0), trimmed: a kind glyph with chips, a
 * running step with a branch, a failed step with Retry, and a pending ring —
 * every glyph and every lane of the chain in one list.
 */
const PROGRESS_STEPS: ChatProgressStep[] = [
  {
    id: "search",
    label: "Searched the library",
    status: "done",
    icon: <Search />,
    duration: "3 s",
    chips: [{ label: "grid systems 1961" }, { label: "Müller-Brockmann posters" }],
  },
  {
    id: "open",
    label: "Could not open eyemagazine.example",
    status: "failed",
    detail: "Timed out after 10 s. Carried on with 3 of 4 sources.",
    retryLabel: "Retry",
    onRetryAction: () => {},
  },
  {
    id: "draft",
    label: "Drafting three frames",
    status: "current",
    duration: "24 s",
    steps: [
      { id: "f1", label: "Frame 1 — title on the 4 × 4", status: "done", duration: "11 s" },
      { id: "f2", label: "Frame 2 — the grid, drawn", status: "current", duration: "13 s" },
    ],
  },
  { id: "safe", label: "Check safe areas", status: "pending" },
];

/** The sheet's running lanes (403F-0): running, done, failed, waiting. */
const PROGRESS_LANES: ChatProgressLane[] = [
  { id: "carousel", name: "Carousel", activity: "Reframing the scan to 4:5 — frame 2 of 3", status: "current", duration: "31 s" },
  { id: "copy", name: "Post copy", activity: "Draft ready — 84 words", status: "done", duration: "14 s" },
  { id: "alt", name: "Alt text", activity: "Frame 2 could not be read", status: "failed", retryLabel: "Retry", onRetryAction: () => {} },
  { id: "story", name: "Story cut", activity: "Waits for Carousel", status: "pending" },
];

/** Five sources, one of each kind and two on the web (Chat Sources, 3ZK8-0). */
const SOURCES_DEMO: ChatSource[] = [
  { id: "moma", kind: "web", title: "Lighthouse at dusk — collection record", origin: "moma.example", href: "https://moma.example/lighthouse" },
  { id: "grid", kind: "libraryItem", title: "Grid Systems in Graphic Design", origin: "Library · p. 48", href: "/library/grid" },
  { id: "guidelines", kind: "brandAsset", title: "Colour and contrast", origin: "Guidelines · Chapter 4", href: "/brand/4" },
  { id: "moodboard", kind: "file", title: "moodboard-v3.png", origin: "Attached to this chat", href: "/files/m.png", isExternal: false },
  { id: "tate", kind: "web", title: "Coastal prints, 1890–1930", origin: "tate.example", href: "https://tate.example/coastal" },
];

const SOURCES_LABELS: ChatSourcesLabels = {
  openSource: "Open source",
  previousSource: "Previous source",
  nextSource: "Next source",
  unavailable: "No longer available",
};

/** One measured run and one unmeasured (05 Background, 3ZIE-0). */
const DOCK_RUNS: ChatRun[] = [
  { id: "cuts", name: "Rendering Story cuts", activity: "2 of 3 · keeps going while you chat", elapsed: "1:48", value: 66 },
  { id: "kit", name: "Exporting brand kit", activity: "Packaging 248 files", elapsed: "0:12" },
];

const TASK_LABELS = { done: "Done:", current: "In progress:", pending: "To do:" };

const PROGRESS_THOUGHT = [
  "The brief asks for a carousel, but the reference is a single poster — so the first job is deciding what repeats.",
  "The 1961 grid is four by four with a doubled baseline; the brand grid is twelve columns. Three brand columns to one poster unit keeps both honest.",
  "Palette next: the scan is warm, so lift the red from the paper, not from the ink.",
];

/** The sheet's four tone options, one of them a handoff. */
const QUESTIONNAIRE_OPTIONS: ChatQuestionnaireOption[] = [
  { id: "confident", label: "Confident and direct" },
  { id: "warm", label: "Warm and personal" },
  { id: "playful", label: "Playful — a wink in every line" },
  { id: "other", label: "Other — tell me in your own words…", isHandoff: true },
];

const CASES: Array<{
  name: string;
  ui: ReactElement | ((portalContainer: HTMLDivElement) => ReactElement);
  isOverlay?: boolean;
}> = [
  {
    /*
      A SYSTEM case, not a component: the three density modes (ADR 0020 §4)
      side by side on the controls they re-size — actions, the chrome control
      and fields. Density is a mode over every control, so no single
      component's case can own it; check:visual-coverage lists system cases
      by name.
    */
    name: "density",
    ui: (
      <div className="flex flex-col gap-md">
        {(["compact", "default", "comfortable"] as const).map((density) => (
          <div key={density} data-ui-density={density} className="flex flex-col gap-xs">
            <div className="flex items-center gap-sm">
              {(["lg", "md", "sm"] as const).map((size) => (
                <Button key={size} size={size}>{size}</Button>
              ))}
              <button type="button" aria-label={`Back, ${density}`} className={chromeControl()}>
                <ChevronDown />
              </button>
            </div>
            <Input label={density} size="md" placeholder="Field" />
          </div>
        ))}
      </div>
    ),
  },
  {
    name: "button",
    ui: (
      <div className="flex flex-col gap-md">
        {(["primary", "secondary", "outline", "ghost", "danger"] as const).map((variant) => (
          <div key={variant} className="flex items-center gap-md">
            {(["lg", "md", "sm"] as const).map((size) => (
              <Button key={size} variant={variant} size={size} icon={<Search />}>
                {`${variant} ${size}`}
              </Button>
            ))}
          </div>
        ))}
        {/*
          An icon row exists because the matrix had no icon ANYWHERE, so every
          glyph in the library could render 50% oversize — which they all did —
          with a green visual run. A gate with nothing to look at is not
          evidence that nothing moved.
        */}
        <div className="flex items-center gap-md">
          {(["lg", "md", "sm"] as const).map((size) => (
            <Button key={size} size={size} isIconOnly aria-label={`Search ${size}`} icon={<Search />} />
          ))}
        </div>
        <div className="flex items-center gap-md">
          <Button shape="soft">Soft corners</Button>
          <Button shape="full">Rounded full</Button>
        </div>
        {/* inverse on its band (#36), with a link-rendered one (#31). */}
        <div className="flex items-center gap-md rounded-md bg-inverse p-md">
          <Button variant="inverse" render={<a href="#contact" />}>Get in touch</Button>
          <Button variant="inverse" isDisabled>Disabled</Button>
        </div>
        {/*
          DISABLED, which had no case at all. It is the state a form shows most
          — every secondary action goes inert while it submits — and it shipped
          one step darker than the sheet draws with nothing looking at it. Its
          fill and its ring are the same value, so the control flattens; that is
          precisely the kind of change a computed-style assertion confirms and
          only a picture makes obvious.
        */}
        <div className="flex items-center gap-md">
          {(["primary", "secondary", "outline", "ghost", "danger"] as const).map((variant) => (
            <Button key={variant} variant={variant} isDisabled>
              {variant}
            </Button>
          ))}
        </div>
      </div>
    ),
  },
  {
    name: "media-toggle",
    ui: (
      <div className="flex items-end gap-md rounded-md p-md" style={{ backgroundImage: `url("${MEDIA}")`, backgroundSize: "cover" }}>
        <MediaToggle pauseLabel="Pause background video" playLabel="Play background video" defaultIsPaused={false} />
        <MediaToggle pauseLabel="Pause background video" playLabel="Play background video" defaultIsPaused />
        <MediaToggle pauseLabel="Pause background video" playLabel="Play background video" defaultIsPaused={false} size="lg" />
      </div>
    ),
  },
  {
    name: "badge",
    ui: (
      <div className="flex flex-col gap-md">
        {(["sm", "md"] as const).map((size) => (
          <div key={size} className="flex items-center gap-md">
            {/* EVERY variant, not a sample. `warning` was added and never
                entered this matrix, and `neutral` would have gone the same
                way — a variant the visual gate never renders is a variant the
                visual gate cannot defend. */}
            {(["selected", "unselected", "neutral", "info", "success", "warning", "danger"] as const).map((variant) => (
              <Badge key={variant} variant={variant} size={size}>
                {variant}
              </Badge>
            ))}
          </div>
        ))}
      </div>
    ),
  },
  {
    name: "banner",
    ui: (
      <div className="flex flex-col gap-md">
        {(["neutral", "info", "success", "warning", "danger"] as const).map((variant) => (
          <Banner key={variant} variant={variant}>
            Exports use the template set in Brand profile.
          </Banner>
        ))}
        {/* Title + action in every intent: the action's role treatment
            (primary on info, an outline in the banner's own ink elsewhere)
            is exactly what a computed-style test can pass while the ring
            reads wrong, so the baseline photographs all five. */}
        {(["neutral", "info", "success", "warning", "danger"] as const).map((variant) => (
          <Banner
            key={`${variant}-rich`}
            variant={variant}
            title="Layouts off-grid"
            action={<Banner.Action>Review layouts</Banner.Action>}
          >
            Two layouts drift from the 8pt baseline.
          </Banner>
        ))}
      </div>
    ),
  },
  {
    name: "checkbox",
    ui: (
      <div className="flex flex-col gap-sm">
        <Checkbox isIndeterminate>Select all</Checkbox>
        <div style={{ paddingLeft: 26 }} className="flex flex-col gap-sm">
          <Checkbox defaultIsChecked>Brief A</Checkbox>
          <Checkbox>Brief B</Checkbox>
          <Checkbox isDisabled>Brief C</Checkbox>
        </div>
        {/* The settings row (#9): label first, box at the end, a description
            under the label with the box on its first line. */}
        <div className="flex w-90 flex-col gap-lg pt-sm">
          <Checkbox labelPlacement="start" defaultIsChecked>Snap layouts to the baseline grid</Checkbox>
          <Checkbox labelPlacement="start" description="Quotes and hyphens sit outside the measure.">
            Keep hanging punctuation
          </Checkbox>
          <Checkbox labelPlacement="start" isDisabled description="Unavailable until the licence is renewed.">
            Embed Univers in exports
          </Checkbox>
        </div>
      </div>
    ),
  },
  {
    name: "tooltip",
    // `defaultIsOpen`, because a baseline cannot hover — and the chip is the
    // only thing here worth diffing. `container` is what puts the portalled
    // chip INSIDE the frame being photographed; without it the shot is two
    // buttons and an empty gap, which is a baseline that would stay green
    // through any change to the tooltip at all.
    // ONE tooltip, not two: the behaviour layer keeps a single tooltip open at
    // a time, so a second `defaultIsOpen` renders nothing and the frame would
    // photograph a button with an empty gap under it. Asserted in
    // tooltip.browser.test.tsx so the reason survives outside this comment.
    ui: (portalContainer) => (
      <div className="flex min-h-32 flex-col items-center justify-end">
        <Tooltip defaultIsOpen>
          <Tooltip.Trigger render={<Button variant="secondary">Delete this file</Button>} />
          <Tooltip.Content container={portalContainer}>
            Removes the file from every brand this workspace owns.
          </Tooltip.Content>
        </Tooltip>
      </div>
    ),
  },
  {
    name: "radio",
    ui: (
      <div className="flex flex-col gap-2xl">
        <RadioGroup label="Reviewer" defaultValue="tschichold">
          <Radio value="brockmann">Josef Müller-Brockmann</Radio>
          <Radio value="tschichold">Jan Tschichold</Radio>
          <Radio value="crouwel" isDisabled>
            Wim Crouwel
          </Radio>
        </RadioGroup>
        <RadioGroup label="Delivery" defaultValue="grid">
          <Radio value="grid" description="Typeset to the twelve-column module.">
            Grid systems, 1961
          </Radio>
          <Radio value="alphabet" description="Fixed to the cathode-ray grid.">
            New Alphabet, 1967
          </Radio>
        </RadioGroup>
        <RadioGroup label="Licence" errorText="Choose a licence before bundling.">
          <Radio value="ofl">Open Font Licence</Radio>
          <Radio value="proprietary">Proprietary</Radio>
        </RadioGroup>
      </div>
    ),
  },
  {
    name: "input",
    ui: (
      <div className="flex flex-col gap-lg">
        <Input label="Label" placeholder="Business cards" />
        <Input label="With helper" helperText="Persistent guidance." placeholder="name@bydiorama.com" />
        <Input label="With error" errorText="That address is not valid." defaultValue="nope" />
        <Input label="Disabled" isDisabled placeholder="Unavailable" />
      </div>
    ),
  },
  {
    name: "textarea",
    // The DEFAULT box leads, because the sheet's 128px six-row field is the
    // thing a reviewer holds the Paper export against, and a case built
    // entirely from short rows would compare everything except it. The rest
    // are shortened so the frame does not grow past the capture viewport —
    // a case taller than ~900px comes back cropped, and a cropped baseline
    // compares cleanly against itself forever.
    //
    // The Input at the top is the point of the whole component: the two are
    // ONE surface, and a diff here catches them drifting apart in a way no
    // computed-value assertion describes. The three sizes are below it for
    // the same reason Badge's two sizes now sit side by side — a scale whose
    // steps are never drawn together is a scale nobody checks.
    ui: (
      <div className="flex flex-col gap-lg">
        <Input label="Company name" placeholder="Diorama s.r.o." />
        <Textarea label="Label" helperText="Up to 120 words." placeholder="Your message" />
        <Textarea label="With error" rows={2} errorText="This field is required." defaultValue="nope" />
        <Textarea label="Disabled" rows={2} isDisabled placeholder="Unavailable" />
        {(["lg", "md", "sm"] as const).map((size) => (
          <Textarea key={size} label={size} size={size} rows={2} placeholder="Your message" />
        ))}
      </div>
    ),
  },
  {
    name: "select",
    // Closed only: the panel is portalled to <body>, so it is outside the
    // frame this case captures. Its appearance is asserted in the contract
    // suite instead — radius, fill and the tick on the chosen row.
    ui: (
      <div className="flex flex-col gap-lg">
        {/* Beside an Input at the same size, because the claim is that the
            two are one surface — a diff here catches them drifting apart in
            a way no computed-value assertion describes. */}
        <Input label="Company" placeholder="Diorama" />
        <Select label="Services" items={SELECT_ITEMS} />
        <Select label="Chosen" items={SELECT_ITEMS} defaultValue="guidelines" />
        <Select label="With error" items={SELECT_ITEMS} errorText="Choose a service" />
        <Select label="Disabled" items={SELECT_ITEMS} isDisabled />
        <div className="flex items-end gap-md">
          <Select label="md" size="md" items={SELECT_ITEMS} defaultValue="guidelines" />
          <Select label="sm" size="sm" items={SELECT_ITEMS} defaultValue="guidelines" />
        </div>
      </div>
    ),
  },
  {
    name: "multiselect",
    ui: (
      <div className="flex flex-col gap-lg">
        <Multiselect label="Services" items={MULTISELECT_ITEMS} />
        <Multiselect
          label="Selected services"
          items={MULTISELECT_ITEMS}
          defaultValue={["concept", "guidelines"]}
        />
        <Multiselect label="Disabled" items={MULTISELECT_ITEMS} isDisabled />
      </div>
    ),
  },
  {
    name: "combobox",
    // Closed only, as Select's: the panel opens on typing or ArrowDown and
    // this frame has no interaction. The open panel — rows, groups, status
    // rows, the action and the fade — is asserted in the contract suite,
    // largely as relationships to Select's panel. The sheet's § Sizes and
    // shape and § Field states, beside an Input at the same size.
    ui: (
      <div className="flex flex-col gap-lg">
        <Input label="Reference" placeholder="Diorama" icon={<Search />} />
        <Combobox label="Rest, empty" icon={<Search />} placeholder="Search designers and inventors" items={SELECT_ITEMS} />
        <Combobox label="Filled" icon={<Search />} items={SELECT_ITEMS} defaultValue="guidelines" />
        <Combobox
          label="Invalid"
          icon={<Search />}
          placeholder="Search designers and inventors"
          items={SELECT_ITEMS}
          errorText="Choose a service, or search for one"
          helperText="Matched against the services index"
        />
        <Combobox label="Disabled" icon={<Search />} placeholder="Search designers and inventors" items={SELECT_ITEMS} isDisabled />
        {(["md", "sm"] as const).map((size) => (
          <div key={size} className="flex items-end gap-md">
            <Combobox label={`${size} · soft`} size={size} icon={<Search />} items={SELECT_ITEMS} defaultValue="guidelines" />
            <Combobox label={`${size} · full`} size={size} shape="full" icon={<Search />} items={SELECT_ITEMS} defaultValue="guidelines" />
          </div>
        ))}
        <Combobox label="lg · full, no chevron" shape="full" hasTrigger={false} icon={<Search />} items={SELECT_ITEMS} defaultValue="guidelines" />
      </div>
    ),
  },
  {
    name: "switch",
    ui: (
      <div className="flex flex-col gap-md">
        <Switch>Off</Switch>
        <Switch defaultIsChecked>On</Switch>
        <Switch isDisabled>Disabled, off</Switch>
        <Switch isDisabled defaultIsChecked>Disabled, on</Switch>
        <div className="flex w-90 flex-col gap-lg pt-sm">
          <Switch labelPlacement="start" defaultIsChecked>Publish to the archive automatically</Switch>
          <Switch labelPlacement="start" description="Herbert Bayer and Otl Aicher get an email.">
            Notify the studio
          </Switch>
          <Switch description="Sends at 09:00 every weekday.">Daily digest</Switch>
        </div>
      </div>
    ),
  },
  {
    name: "chart",
    // Stacked bars (the segment gap and the outer-only radius), lines with
    // direct labels, a rule and a missing value, and ranked horizontal rows. Grouped bars and stacked
    // areas are pinned by computed geometry in the contract test instead: four
    // charts overflow the 900px capture. The ranked chart is ONE row since the
    // legend grew to its 24px target band; the row gap is pinned by geometry.
    // Static: no hover or focus.
    ui: (
      <div className="flex flex-col gap-sm">
        <BarChart size="sm" isStacked label="Stacked" description="Output rose to 575 in 1972." x="year" xLabel="Year"
          data={[{ year: 1968, p: 140, b: 100, s: 70 }, { year: 1969, p: 180, b: 80, s: 80 }, { year: 1970, p: 100, b: 130, s: 50 }, { year: 1971, p: 160, b: 95, s: 100 }, { year: 1972, p: 120, b: 115, s: 75 }]}
          series={[{ key: "p", label: "Posters" }, { key: "b", label: "Books" }, { key: "s", label: "Signage" }]} />
        <Chart size="sm" label="Lines and a target" description="Posters approached the target." x="year" xLabel="Year"
          data={[{ year: 1967, p: 140, s: 250 }, { year: 1968, p: 172, s: 220 }, { year: 1969, p: null, s: 180 }, { year: 1970, p: 225, s: 120 }, { year: 1971, p: 250, s: 92 }, { year: 1972, p: 310, s: 60 }]}
          series={[{ key: "p", label: "Posters" }, { key: "s", label: "Signage", slot: 3 }]}>
          <Chart.Lines />
          <Chart.Rule value={340} label="Target 340" />
        </Chart>
        <BarChart orientation="horizontal" label="Ranked" description="Müller-Brockmann made the most." x="who" xLabel="Designer"
          // A `who` field, not `name`: check:visual-coverage reads name fields here as case names.
          data={[{ who: "Josef Müller-Brockmann", n: 342 }]}
          series={[{ key: "n", label: "Posters" }]} />
      </div>
    ),
  },
  {
    name: "stat-tiles",
    // Blocks. The sheet's four-tile row in a 560px frame: under 1120px it
    // wraps two by two (sheet: Narrow row), so this pins the hairlines
    // following the wrap, sparklines kept beside the text at a 279px tile,
    // a good and a bad change and a flat one. Then the data states, whose
    // height must match a loaded tile.
    ui: (
      <div className="flex flex-col gap-lg">
        <StatTiles aria-label="Printing">
          <StatTiles.Tile label="Posters printed" value="1,284" delta={{ change: 0.12, comparison: "vs 1971" }}
            trend={<Sparkline size="sm" data={[9, 12, 10.5, 15, 13.5, 18, 16.5, 21, 19, 23, 21.5, 25]} label="Posters" description="Rose." />} />
          <StatTiles.Tile label="Books bound" value="862" delta={{ change: -0.04, comparison: "vs 1971" }}
            trend={<Sparkline size="sm" data={[25, 21.5, 23, 19, 21, 16.5, 18, 13.5, 15, 10.5, 12, 9]} label="Books" description="Fell." />} />
          <StatTiles.Tile label="Ink cost" value="€3,410" delta={{ change: 0.09, comparison: "vs 1971", polarity: "down-is-good" }} />
          <StatTiles.Tile label="Presses running" value="6" delta={{ change: 0, comparison: "vs 1971" }} />
        </StatTiles>
        <StatTiles>
          <StatTiles.Tile label="Books bound" value={null} />
          <StatTiles.Tile label="Sheets cut" value={null} isLoading />
        </StatTiles>
      </div>
    ),
  },
  {
    name: "chart-card",
    // The sheet's card: the figure and change under the title, the fading
    // area below, and the description NOT printed.
    ui: (
      <ChartCard size="sm" label="Posters printed" description="Output rose every year after 1951." value="2,370"
        delta={{ change: 0.18, comparison: "vs 1951–1956" }} x="year" xLabel="Year"
        data={[{ year: 1951, n: 210 }, { year: 1953, n: 260 }, { year: 1955, n: 240 }, { year: 1957, n: 330 }, { year: 1959, n: 390 }, { year: 1961, n: 470 }]}
        series={[{ key: "n", label: "Posters" }]} />
    ),
  },
  {
    name: "meter",
    // The three tones, a target in the second half (the label ENDS at the
    // rule), the empty and loading states whose height must hold, and the
    // ring in its resting and warning states. On bg-surface, the card the
    // sheet draws them on.
    ui: (
      <div className="flex w-96 flex-col gap-lg rounded-md bg-surface p-lg">
        <Meter label="Paper stock" value={68} />
        <Meter label="Ink reserve" value={84} status="warning" statusText="near limit" />
        <Meter label="Press hours" value={96} status="danger" statusText="over limit" />
        <Meter label="Sheets bound" value={62} target={75} targetText="Target 75%" />
        <Meter label="Paper stock" value={null} emptyText="No reading yet" />
        <Meter label="Paper stock" value={0} isLoading />
        <div className="flex gap-lg">
          <Meter label="Paper stock" value={68} shape="radial" />
          <Meter label="Ink" value={84} shape="radial" status="warning" statusText="near limit" />
        </div>
      </div>
    ),
  },
  {
    name: "progress",
    ui: (
      <div className="flex flex-col gap-lg">
        <Progress label="Usage" value={62} hasValueText />
        <Progress label="Usage" value={62} isLabelHidden />
        <Progress label="Usage" value={62} size="sm" hasValueText />
        <Progress label="Complete" value={100} size="sm" isLabelHidden />
      </div>
    ),
  },
  {
    name: "sparkline",
    // The three forms on the card they are drawn on, both sizes, a second and
    // a last slot (the eighth is the one nobody looks at), and the two data
    // states whose box must not collapse. On bg-surface because the end
    // marker's ring is painted in that role.
    ui: (
      <div className="flex flex-col gap-lg rounded-md bg-surface p-lg">
        <Sparkline data={[12, 16, 14, 20, 18, 24, 22, 28, 25, 30, 28, 32]} label="Line" description="Rose." />
        <Sparkline data={[12, 16, 14, 20, 18, 24, 22, 28, 25, 30, 28, 32]} label="Area" description="Rose." variant="area" series={2} />
        <Sparkline data={[12, 16, 14, 20, 18, 24, 22, 28, 25, 30, 28, 32]} label="Column" description="Rose." variant="column" series={8} />
        <Sparkline data={[12, 16, 14, 20, 18, 24, 22, 28, 25, 30, 28, 32]} label="Small" description="Rose." size="sm" series={5} />
        <div className="flex gap-lg">
          <Sparkline data={[]} label="Loading" description="Loading." isLoading />
          <Sparkline data={[42]} label="One point" description="One reading." />
        </div>
      </div>
    ),
  },
  {
    name: "status-matrix",
    // Every status at its key frame, at both sizes — HELD, because a moving
    // matrix has no single frame to baseline. Ink and the four levels are the
    // whole design here: an Ember that collapsed to Off, or Done drawn in the
    // accent, is exactly the small-area change this layer exists for (and
    // below its 1% floor on its own, which is why the frames are also
    // asserted cell by cell in the contract test).
    ui: (
      <div className="flex gap-xl rounded-md bg-base p-lg">
        {(["md", "sm"] as const).map((size) => (
          <div key={size} className="flex flex-col gap-sm">
            {(["waiting", "typing", "thinking", "working", "streaming", "done", "failed", "stopped"] as const).map((status) => (
              <StatusMatrix key={status} status={status} size={size} isHeld />
            ))}
            <StatusMatrix status="progress" value={66} size={size} isHeld />
          </div>
        ))}
      </div>
    ),
  },
  {
    name: "slider",
    // All four track heights, because a size reachable through the API and
    // drawn in no case is how `outline` survived a release on Button — and
    // because these four differ only in height and radius, which is exactly
    // the kind of change a computed-value assertion can pass while the render
    // is wrong. The stepper row is here for the same reason: `xl` squares off
    // to sit with 32px controls, and that only reads beside them.
    ui: (
      <div className="flex flex-col gap-lg">
        <Slider label="Logo size" defaultValue={62} hasValueText />
        {(["sm", "lg", "xl"] as const).map((size) => (
          <Slider key={size} label={size} defaultValue={62} size={size} isLabelHidden />
        ))}
        <Slider
          label="With steppers"
          defaultValue={62}
          size="xl"
          isLabelHidden
          hasSteppers
          decrementLabel="Smaller"
          incrementLabel="Larger"
        />
        <Slider label="Disabled" defaultValue={30} isDisabled hasValueText />
        {/* The two variants of the 2026-11-03 revision. Inline is the only
            place the label sits INSIDE the fill, and Balance the only fill
            that does not start at the track's start — both are exactly what
            a computed-value assertion can pass while the render is wrong. */}
        <div className="flex flex-col gap-xs">
          <Slider label="Dot size" variant="inline" defaultValue={12} max={48} formatValue={(v) => `${v} px`} />
          <Slider label="Contrast" variant="inline" size="sm" defaultValue={40} formatValue={(v) => (v / 100).toFixed(2)} />
          <Slider label="Temperature" variant="inline" min={-50} max={50} origin={0} defaultValue={-12} formatValue={(v) => (v < 0 ? `−${-v}` : String(v))} />
        </div>
        <Slider label="Formality" origin={50} startLabel="Casual" endLabel="Formal" defaultValue={70} hasValueText formatValue={() => "Mostly formal"} />
        <Slider label="Humour" origin={50} startLabel="Serious" endLabel="Playful" defaultValue={30} hasValueText formatValue={() => "Mostly serious"} />
      </div>
    ),
  },
  {
    name: "range-slider",
    // A span between two thumbs at the default size, the two thumbs meeting,
    // the full range, and disabled — the four positions a span can be in.
    ui: (
      <div className="flex flex-col gap-lg">
        <RangeSlider label="Active years" startThumbLabel="Earliest year" endThumbLabel="Latest year" min={1800} max={2000} defaultValue={[1925, 1972]} formatValue={String} />
        <RangeSlider label="Thumbs meet" startThumbLabel="Earliest year" endThumbLabel="Latest year" size="sm" min={1800} max={2000} defaultValue={[1950, 1958]} formatValue={String} />
        <RangeSlider label="Full range" startThumbLabel="Earliest year" endThumbLabel="Latest year" size="lg" min={1800} max={2000} defaultValue={[1800, 2000]} formatValue={String} />
        <RangeSlider label="Disabled" startThumbLabel="Earliest year" endThumbLabel="Latest year" min={1800} max={2000} defaultValue={[1925, 1972]} formatValue={String} isDisabled />
      </div>
    ),
  },
  {
    name: "tabs",
    // The sheet's four rows, in its own order — a variant reachable through
    // the API and drawn in no case is how `outline` survived a release on
    // Button. Vertical and ghost both arrived with the redrawn sheet.
    ui: (
      <div className="flex flex-col gap-lg">
        <Tabs defaultValue="links">
          <Tabs.List>
            <Tabs.Tab value="links" count={1}>Links</Tabs.Tab>
            <Tabs.Tab value="appearance">Appearance</Tabs.Tab>
          </Tabs.List>
        </Tabs>
        <Tabs defaultValue="links">
          <Tabs.List>
            <Tabs.Tab value="links" count={1}>Links</Tabs.Tab>
            <Tabs.Tab value="appearance">Appearance</Tabs.Tab>
            <Tabs.Tab value="advanced" isDisabled>Advanced settings</Tabs.Tab>
          </Tabs.List>
        </Tabs>
        <Tabs defaultValue="links" orientation="vertical">
          <Tabs.List>
            <Tabs.Tab value="links" count={1}>Links</Tabs.Tab>
            <Tabs.Tab value="appearance">Appearance</Tabs.Tab>
            <Tabs.Tab value="advanced" isDisabled>Advanced settings</Tabs.Tab>
          </Tabs.List>
        </Tabs>
        <Tabs defaultValue="links" variant="ghost">
          <Tabs.List>
            <Tabs.Tab value="links" count={1}>Links</Tabs.Tab>
            <Tabs.Tab value="appearance">Appearance</Tabs.Tab>
            <Tabs.Tab value="advanced">Advanced Settings</Tabs.Tab>
          </Tabs.List>
        </Tabs>
      </div>
    ),
  },
  {
    name: "card",
    ui: (
      <Card>
        <Card.Header actions={<Button variant="secondary" size="md">Edit</Button>}>
          Section options
        </Card.Header>
        <Input label="Label" placeholder="Business cards" />
        <Banner>Exports use the template set in Brand profile.</Banner>
        <Card.Footer>
          <Button variant="secondary" size="md">Cancel</Button>
          <Button size="md">Create task</Button>
        </Card.Footer>
      </Card>
    ),
  },
  {
    name: "calendar",
    // A FIXED month, value AND today. Pinning the first two is not enough:
    // Calendar read the real clock for its today ring, so this baseline
    // passed the day it was recorded and failed the next morning when the
    // ring moved one cell. `today` exists as a prop for exactly this.
    ui: (
      <Calendar
        label="Choose a date"
        defaultMonth={new Date(2026, 7, 1, 12)}
        defaultValue={new Date(2026, 7, 3, 12)}
        today={new Date(2026, 7, 6, 12)}
      />
    ),
  },
  {
    name: "date-picker",
    // Closed only: the panel is portalled outside the frame this case
    // captures, and its appearance is asserted in the contract suite. Beside
    // a Select at the same size, because the claim is that the two are one
    // surface — a diff here catches them drifting apart in a way no
    // computed-value assertion describes.
    ui: (
      <div className="flex flex-col gap-lg">
        <Select label="Services" items={SELECT_ITEMS} />
        <DatePicker
          label="Deadline"
          defaultValue={new Date(2026, 7, 3, 12)}
          defaultMonth={new Date(2026, 7, 1, 12)}
          today={new Date(2026, 7, 6, 12)}
        />
        <DatePicker
          label="Empty"
          defaultMonth={new Date(2026, 7, 1, 12)}
          today={new Date(2026, 7, 6, 12)}
          helperText="You can change this later."
        />
        <DatePicker
          label="With error"
          defaultMonth={new Date(2026, 7, 1, 12)}
          today={new Date(2026, 7, 6, 12)}
          errorText="A deadline is required."
        />
        <DatePicker
          label="Disabled"
          defaultValue={new Date(2026, 7, 3, 12)}
          defaultMonth={new Date(2026, 7, 1, 12)}
          today={new Date(2026, 7, 6, 12)}
          isDisabled
        />
      </div>
    ),
  },
  {
    name: "header",
    ui: (
      <Header>
        <Header.Start>
          {/* A chrome control, like the menu button — the sheet fills both. */}
          <button type="button" aria-label="Back" className={chromeControl()}><Search /></button>
        </Header.Start>
        <Header.Spacer />
        <Header.Nav label="Primary">
          <Header.Item href="/agent">Agent</Header.Item>
          <Header.Item href="/library" isCurrent>Library</Header.Item>
          <Header.Item trailing={<ChevronDown aria-hidden="true" />}>Work</Header.Item>
        </Header.Nav>
        <Header.Spacer />
        <Header.End>
          <Header.MenuButton label="Open primary navigation" />
          <Avatar name="Mira Vance" size="sm" />
        </Header.End>
      </Header>
    ),
  },
  {
    name: "site-header",
    // Three bars: above the collapse point, below it, and on a hero. The
    // points are set past either edge of any viewport so the layout is the
    // case's, not the window's; affix is off so nothing pins in the frame.
    // The hero's pale patch is the bright photograph the scrim exists for.
    ui: (
      <div className="flex flex-col gap-lg">
        {(["10rem", "200rem"] as const).map((point) => (
          <SiteHeader
            key={point}
            affix={false}
            collapseBelow={point}
            brand={{ label: "Diorama" }}
            items={[
              { label: "Work", href: "#work" },
              { label: "Studio", href: "#studio", isCurrent: true },
              { label: "Journal", href: "#journal" },
            ]}
            cta={{ label: "Book a call", href: "#contact" }}
          />
        ))}
        <div>
          <SiteHeader
            affix={false}
            isOverMedia
            collapseBelow="10rem"
            brand={{ label: "Diorama" }}
            items={[
              { label: "Work", href: "#work" },
              { label: "Studio", href: "#studio", isCurrent: true },
              { label: "Journal", href: "#journal" },
            ]}
            cta={{ label: "Book a call", href: "#contact" }}
          />
          <div
            className="h-30 bg-media"
            style={{ backgroundImage: "radial-gradient(50% 60% at 60% 0%, #FFFFFF, transparent)" }}
          />
        </div>
      </div>
    ),
  },
  {
    name: "card-sorting",
    ui: (
      <CardSorting label="Brand assets">
        {[
          ["guidelines", "Brand guidelines", "Public"],
          ["cards", "Business cards", "Team only"],
          ["signatures", "Email signatures", "Team only"],
        ].map(([id, label, visibility]) => (
          <CardSorting.Item key={id} id={id!} label={label!}>
            <span className="flex min-w-0 flex-col items-start gap-xs">
              <span className="truncate text-body-lg font-body font-bold leading-normal tracking-tight">
                {label}
              </span>
              <Badge variant={visibility === "Public" ? "success" : "unselected"}>{visibility}</Badge>
            </span>
            <Switch defaultIsChecked={visibility !== "Public"} isLabelHidden>{`Publish ${label}`}</Switch>
          </CardSorting.Item>
        ))}
      </CardSorting>
    ),
  },
  {
    name: "sidebar",
    // Both layers, side by side. The second REPLACES the first at runtime, so
    // one rail can only ever show one of them — and a layer drawn in no case
    // is a layer no one looks at.
    ui: (
      <div className="flex gap-lg">
        <Sidebar label="Primary">
          <Sidebar.Main>
            <Sidebar.Profile name="Jakub Otcenas" email="jakub@bydiorama.com" layer="profile" />
            <Sidebar.Item href="/agent">Agent</Sidebar.Item>
            <Sidebar.Section label="Brand" isCollapsible>
              <Sidebar.Item href="/brand/guidelines" isCurrent>Brand Guidelines</Sidebar.Item>
              <Sidebar.Item href="/brand/assets">Assets</Sidebar.Item>
            </Sidebar.Section>
            <Sidebar.Item href="/exports">Exports</Sidebar.Item>
          </Sidebar.Main>
          <Sidebar.Layer id="profile" title="Profile Settings" backLabel="Back to navigation">
            <Sidebar.Item href="/x">Never shown here</Sidebar.Item>
          </Sidebar.Layer>
        </Sidebar>
        <Sidebar label="Profile" defaultLayer="profile">
          <Sidebar.Main>
            <Sidebar.Item href="/agent">Never shown here</Sidebar.Item>
          </Sidebar.Main>
          <Sidebar.Layer id="profile" title="Profile Settings" backLabel="Back to navigation">
            <Sidebar.Heading>Select brand</Sidebar.Heading>
            <Sidebar.Search label="Search brands" />
            <Sidebar.Item href="/diorama">Diorama</Sidebar.Item>
            <Sidebar.Item href="/ohpen" isCurrent>Ohpen</Sidebar.Item>
            <Sidebar.Item href="/admin">Admin</Sidebar.Item>
          </Sidebar.Layer>
        </Sidebar>
      </div>
    ),
  },
  {
    name: "nav-rail",
    // Beside the Sidebar it is an ALTERNATIVE to, because the relationship is
    // what a diff has to protect: the two share the fill and the row lane, and
    // a change to either that breaks the pairing is invisible in a case that
    // draws only one. Rest, current and disabled are all on the rail — the
    // current row's 2px marker is the smallest thing in this whole matrix and
    // the only signal separating it from hover, so it is drawn deliberately.
    ui: (
      <div className="flex items-start gap-lg">
        <NavRail label="Rail">
          <NavRail.Slot>
            <button type="button" aria-label="Expand navigation" className={chromeControl()}>
              <ExpandSidebar />
            </button>
          </NavRail.Slot>
          <NavRail.Section label="Workspace">
            <NavRail.Item icon={<Home />} label="Overview" href="/overview" />
            <NavRail.Item icon={<Search />} label="Search everything" />
          </NavRail.Section>
          <NavRail.Section label="Brand profile">
            <NavRail.Item icon={<Image />} label="Logos" href="/logos" />
            <NavRail.Item icon={<Colors />} label="Colours" href="/colours" isCurrent />
            <NavRail.Item icon={<UsersGroup />} label="Members" href="/members" isDisabled />
          </NavRail.Section>
        </NavRail>
        <Sidebar label="Expanded, for comparison">
          <Sidebar.Item href="/overview" icon={<Home />}>Overview</Sidebar.Item>
          <Sidebar.Section label="Brand profile" isCollapsible>
            <Sidebar.Item href="/logos">Logos</Sidebar.Item>
            <Sidebar.Item href="/colours" isCurrent>Colours</Sidebar.Item>
          </Sidebar.Section>
        </Sidebar>
      </div>
    ),
  },
  {
    name: "accordion",
    // The sheet's two variants side by side, each with one row open, because
    // the open row is the only place the panel, its inset and the rotated
    // chevron are all visible at once. Short answers keep the frame under the
    // capture viewport — a case taller than ~900px comes back cropped.
    ui: (
      <div className="flex flex-col gap-lg">
        <Accordion defaultValue={["a"]}>
          <Accordion.Item value="a">
            <Accordion.Trigger icon={<InfoCircle />}>What does your process look like?</Accordion.Trigger>
            <Accordion.Panel>Discovery, concept, then handover.</Accordion.Panel>
          </Accordion.Item>
          <Accordion.Item value="b">
            <Accordion.Trigger icon={<InfoCircle />}>How long does it take?</Accordion.Trigger>
            <Accordion.Panel>Six to ten weeks.</Accordion.Panel>
          </Accordion.Item>
        </Accordion>
        {/* Distinct copy from the list above: each panel is a role=region
            landmark named by its trigger, and two identically-named
            landmarks on one page fail axe's landmark-unique. */}
        <Accordion variant="card" defaultValue={["a"]}>
          <Accordion.Item value="a">
            <Accordion.Trigger icon={<InfoCircle />}>What does a card row look like?</Accordion.Trigger>
            <Accordion.Panel>Discovery, concept, then handover.</Accordion.Panel>
          </Accordion.Item>
          <Accordion.Item value="b">
            <Accordion.Trigger icon={<InfoCircle />}>How much does a card cost?</Accordion.Trigger>
            <Accordion.Panel>Six to ten weeks.</Accordion.Panel>
          </Accordion.Item>
          <Accordion.Item value="c" isDisabled>
            <Accordion.Trigger icon={<InfoCircle />}>Unavailable for now</Accordion.Trigger>
            <Accordion.Panel>Never seen.</Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </div>
    ),
  },
  {
    name: "avatar",
    // The sheet's own three sections, in its order: shape, group, status.
    // Both shapes appear in every row because the sheet draws both, and the
    // status row is the only place the three dot fills can be compared to each
    // other — a set where two states paint the same colour conveys two states
    // and shows one, which no computed-value assertion in isolation notices.
    ui: (
      <div className="flex flex-col gap-lg">
        <div className="flex items-center gap-md">
          {(["lg", "md", "sm"] as const).map((size) => (
            <Avatar key={size} name="Mira Vance" size={size} />
          ))}
          {(["lg", "md", "sm"] as const).map((size) => (
            <Avatar key={size} name="Mira Vance" size={size} shape="full" />
          ))}
          <Avatar name="Diorama Studio" initials="DS" />
        </div>
        <div className="flex items-center gap-lg">
          <Avatar.Group>
            <Avatar name="Mira Vance" />
            <Avatar name="Peter Roth" />
            <Avatar name="Dana Ilic" />
          </Avatar.Group>
          <Avatar.Group max={3} overflowLabel="4 more people">
            <Avatar name="Mira Vance" />
            <Avatar name="Peter Roth" />
            <Avatar name="Dana Ilic" />
            <Avatar name="Anna Kis" />
            <Avatar name="Bo Lin" />
            <Avatar name="Cy Ray" />
            <Avatar name="Eve Novak" />
          </Avatar.Group>
        </div>
        <div className="flex items-center gap-md">
          {(["success", "neutral", "danger"] as const).map((status) => (
            <Avatar key={status} name="Mira Vance" status={status} statusLabel={status} />
          ))}
          {(["success", "neutral", "danger"] as const).map((status) => (
            <Avatar
              key={status}
              name="Mira Vance"
              shape="full"
              status={status}
              statusLabel={status}
            />
          ))}
        </div>
      </div>
    ),
  },
  {
    name: "aspect-ratio",
    // All six at ONE width, which is the comparison the sheet cannot show:
    // it draws six widths at a shared height, so the six ratios never appear
    // as six heights of one column — and 9/16 written where 16/9 was meant
    // reads correctly in the source. The last frame carries no media, because
    // the well is the only themed value this component has.
    ui: (
      <div className="flex flex-wrap items-start gap-md">
        {(["square", "story", "portrait", "landscape", "card", "screen"] as const).map((ratio) => (
          <div key={ratio} className="w-24">
            <AspectRatio ratio={ratio}>
              <img src={MEDIA} alt="" />
            </AspectRatio>
          </div>
        ))}
        <div className="w-24">
          <AspectRatio ratio="square">
            <img src={NO_MEDIA} alt="" />
          </AspectRatio>
        </div>
      </div>
    ),
  },
  {
    name: "image-edit",
    // Rect with rotation, and the circular avatar mask. The stage's fill is
    // the point of the case: painted with the sheet's --ui-bg-emphasis it
    // would be the brand colour, and only a picture shows that.
    ui: (
      <div className="flex flex-col gap-lg">
        <ImageEdit src={MEDIA} alt="Abstract gradient" defaultZoom={128} hasRotation defaultRotation={-12} />
        <ImageEdit src={MEDIA} alt="Abstract gradient" shape="circle" defaultZoom={128} />
      </div>
    ),
  },
  {
    name: "image-overlay",
    // Both variants over BOTH pictures. The white one is the case the veil's
    // strength is decided by — a caption over a mid-tone gradient looks fine
    // at almost any scrim, which is exactly why the sheet's 48% survived.
    ui: (
      <div className="flex flex-wrap items-start gap-md">
        {[MEDIA, WHITE_MEDIA].map((src, i) => (
          <div key={`scrim-${i}`} className="w-40">
            <ImageOverlay src={src} alt="">
              <Badge variant="success">Approved</Badge>
              <ImageOverlay.Title>Abstract background</ImageOverlay.Title>
              <ImageOverlay.Description>Photo Library</ImageOverlay.Description>
            </ImageOverlay>
          </div>
        ))}
        {[MEDIA, WHITE_MEDIA].map((src, i) => (
          <div key={`full-${i}`} className="w-40">
            <ImageOverlay src={src} alt="" variant="full">
              <Button size="md" shape="full">Download</Button>
            </ImageOverlay>
          </div>
        ))}
      </div>
    ),
  },
  {
    name: "thumbnail",
    // The sheet's four layouts. The remove control is invisible at rest and a
    // screenshot cannot hover, so what this case can see is the two group
    // widths — 152 against 136 — and the counter tile beside a real one.
    ui: (
      <div className="flex flex-col items-start gap-lg">
        <Thumbnail src={MEDIA} alt="Brand guidelines" />
        <Thumbnail.Group>
          {["a", "b", "c"].map((k) => (
            <Thumbnail key={k} src={MEDIA} alt={k} />
          ))}
        </Thumbnail.Group>
        <Thumbnail.Group isStacked>
          {["a", "b", "c"].map((k) => (
            <Thumbnail key={k} src={MEDIA} alt={k} />
          ))}
        </Thumbnail.Group>
        <Thumbnail.Group max={2} overflowLabel="2 more attachments">
          {["a", "b", "c", "d"].map((k) => (
            <Thumbnail key={k} src={k === "a" ? NO_MEDIA : MEDIA} alt={k} />
          ))}
        </Thumbnail.Group>
      </div>
    ),
  },
  {
    name: "image-upload",
    // Four of the sheet's rows in one frame. Drag-over is absent because a
    // screenshot cannot hold a file over a target; it is asserted in the
    // contract suite by dispatching a real dragover instead.
    ui: (
      <div className="flex flex-col gap-lg">
        <ImageUpload label="Cover image" helperText="PNG or JPG · max 10 MB" />
        <ImageUpload.File name="hero-cover.jpg" value={62} detail="1.4 MB of 2.2 MB" icon={<Image />} onCancel={() => {}} cancelLabel="Cancel upload of hero-cover.jpg" />
        <ImageUpload
          label="Rejected"
          helperText="PNG or JPG · max 10 MB"
          errorText="hero-cover.jpg is 14 MB"
          errorDetail="The limit is 10 MB. Try a smaller file."
          actions={<Button variant="outline" size="sm">Choose another file</Button>}
        />
        <ImageUpload.Grid>
          <Thumbnail src={MEDIA} alt="a" className="size-23" />
          <ImageUpload.Add label="Add images" />
        </ImageUpload.Grid>
      </div>
    ),
  },
  {
    name: "menu",
    // Portalled INTO the frame, or the panel paints outside the capture and
    // the case compares an empty trigger row.
    ui: (portalContainer) => (
      <div className="flex min-h-80 items-start">
        <Menu defaultIsOpen>
          <Menu.Trigger render={<Button variant="secondary">Open menu</Button>} />
          <Menu.Panel container={portalContainer}>
            <Menu.Item>Profile</Menu.Item>
            <Menu.Separator />
            <Menu.Item>Brand panel</Menu.Item>
            <Menu.Group label="Team">
              <Menu.Item>Members</Menu.Item>
              <Menu.Item isDisabled>Admin settings</Menu.Item>
            </Menu.Group>
            <Menu.Sub>
              <Menu.SubTrigger>Team settings</Menu.SubTrigger>
              <Menu.Panel container={portalContainer} side="right">
                <Menu.Item>Invitations</Menu.Item>
              </Menu.Panel>
            </Menu.Sub>
          </Menu.Panel>
        </Menu>
      </div>
    ),
  },
  {
    name: "context-menu",
    ui: (portalContainer) => (
      <div className="flex min-h-80 items-start">
        <ContextMenu defaultIsOpen>
          <ContextMenu.Trigger tabIndex={0} aria-label="Brand asset" className="sr-only">
            region
          </ContextMenu.Trigger>
          <ContextMenu.Panel container={portalContainer}>
            <Menu.Item>Duplicate</Menu.Item>
            <Menu.Item>Rename</Menu.Item>
            <Menu.Separator />
            <Menu.Item isDisabled>Delete</Menu.Item>
          </ContextMenu.Panel>
        </ContextMenu>
      </div>
    ),
  },
  {
    name: "popover",
    ui: (portalContainer) => (
      <div className="flex min-h-72 items-center justify-center">
        <Popover defaultIsOpen>
          <Popover.Trigger render={<Button>Open popover</Button>} />
          <Popover.Panel container={portalContainer}>
            <Popover.Title>Publish this project?</Popover.Title>
            <Popover.Description>Your public link will update immediately.</Popover.Description>
            <div className="flex justify-end gap-md">
              <Button variant="secondary" size="md">Cancel</Button>
              <Button size="md">Publish</Button>
            </div>
          </Popover.Panel>
        </Popover>
      </div>
    ),
  },
  {
    name: "toast",
    isOverlay: true,
    // The collapsed stack, which is the resting truth of this component: the
    // frontmost toast's full anatomy (glyph, title, description, action,
    // close) with two older toasts peeking above it, scaled and clamped.
    // The expanded state is hover-driven and lives in the browser test.
    ui: (portalContainer) => (
      <Toast.Provider timeout={0}>
        <VisualToasts />
        <Toast.Viewport
          label="Notifications"
          dismissLabel="Dismiss"
          container={portalContainer}
        />
      </Toast.Provider>
    ),
  },
  {
    name: "modal",
    isOverlay: true,
    ui: (portalContainer) => (
      <Modal defaultIsOpen>
        <Modal.Surface container={portalContainer}>
          <Modal.Title>Create a task</Modal.Title>
          <Modal.Description>Add a task to the current brand project.</Modal.Description>
          <Input label="Task name" defaultValue="Prepare brand guidelines" />
          <Modal.Footer>
            <Button variant="secondary" size="md">Cancel</Button>
            <Button size="md">Create task</Button>
          </Modal.Footer>
        </Modal.Surface>
      </Modal>
    ),
  },
  {
    name: "sheet",
    isOverlay: true,
    ui: (portalContainer) => (
      <Sheet defaultIsOpen>
        <Sheet.Panel label="Primary navigation" container={portalContainer}>
          <Sidebar label="Primary" className="h-full w-full rounded-none">
            <Sidebar.Item href="/agent">Agent</Sidebar.Item>
            <Sidebar.Item href="/library" isCurrent>Library</Sidebar.Item>
            <Sidebar.Item href="/work">Work</Sidebar.Item>
          </Sidebar>
        </Sheet.Panel>
      </Sheet>
    ),
  },
  {
    name: "empty-state",
    // All four shapes, because what varies is which parts are present — and
    // the mark's well against the body is the one pair a computed-style
    // assertion cannot judge.
    ui: (
      <div className="flex flex-col gap-lg">
        <div className="rounded-lg border border-edge-subtle bg-surface">
          <EmptyState
            icon={<Inbox />}
            title="No designers match this filter"
            description="Clear the status filter to see all 24 records."
            action={<Button variant="secondary" shape="full">Clear Filter</Button>}
          />
        </div>
        <div className="rounded-lg border border-edge-subtle bg-surface">
          <EmptyState title="Nothing archived yet" description="Archived records stay 90 days." />
        </div>
      </div>
    ),
  },
  {
    name: "skeleton",
    // The default box FIRST, alone, because a 0px placeholder is the failure
    // this component is shaped to prevent and it is invisible in any frame
    // that also contains a sized one. The rest is the composed shape, which is
    // the only thing there is to look at: the bar carries no variants, so what
    // a baseline can catch here is the fill going flat against the page and
    // the radius or the row rhythm moving.
    ui: (
      <div className="flex w-96 flex-col gap-lg">
        <Skeleton />
        <div className="flex items-center gap-md">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-xs">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </div>
        <Skeleton className="h-32 w-full rounded-md" />
      </div>
    ),
  },
  {
    name: "dot-pattern",
    // The default recipe with content above it, then the two densities and
    // the strong ink beside it. What a baseline can catch here that no
    // computed-style assertion can: the grain dissolving entirely against the
    // well (both are derived roles and move together under a brand), or the
    // dots rasterising as squares at some DPR. Each canvas is the caller's
    // half of the contract — relative, bg-sunken, clipped.
    ui: (
      <div className="flex w-96 flex-col gap-lg">
        <div className="relative h-24 overflow-clip rounded-md bg-sunken">
          <DotPattern />
          <div className="absolute top-1/2 left-1/2 h-14 w-32 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-base shadow-xl" />
        </div>
        <div className="flex gap-lg">
          <div className="relative h-16 flex-1 overflow-clip rounded-md bg-sunken">
            <DotPattern gap={8} />
          </div>
          <div className="relative h-16 flex-1 overflow-clip rounded-md bg-sunken">
            <DotPattern gap={24} dotSize={4} />
          </div>
        </div>
        <div className="relative h-16 overflow-clip rounded-md bg-sunken">
          <DotPattern className="text-edge-default" />
        </div>
      </div>
    ),
  },
  {
    name: "fade",
    // What a baseline catches that no computed-style assertion can: the ramp
    // actually DISSOLVING (a broken gradient paints a hard edge that still
    // passes every backgroundImage assertion), each ground blending into its
    // own card rather than smudging a neighbour's, and the hidden state
    // leaving no ghost band. Text runs under every ramp on purpose — a fade
    // over empty ground photographs as working while veiling nothing.
    ui: (() => {
      const copy =
        "Müller-Brockmann treated the grid as an ethical position: order as a service to the reader. The 1961 programme reduces every poster to counted columns, and the counting is the argument — nothing placed, everything derived, every line justified.";
      return (
        <div className="flex w-full flex-col gap-lg">
          <div className="relative h-28 overflow-clip rounded-md border border-edge-subtle bg-base">
            <p className="p-lg text-body-sm leading-relaxed text-ink-secondary">{copy}</p>
            <Fade ground="base" size="lg" />
          </div>
          <div className="flex gap-lg">
            <div className="relative h-24 flex-1 overflow-clip rounded-md border border-edge-subtle bg-surface">
              <p className="p-md text-body-sm leading-relaxed text-ink-secondary">{copy}</p>
              <Fade />
            </div>
            <div className="relative h-24 flex-1 overflow-clip rounded-md border border-edge-subtle bg-elevated">
              <p className="p-md text-body-sm leading-relaxed text-ink-secondary">{copy}</p>
              <Fade ground="elevated" />
            </div>
            <div className="relative h-24 flex-1 overflow-clip rounded-md border border-edge-subtle bg-sunken">
              <p className="p-md text-body-sm leading-relaxed text-ink-secondary">{copy}</p>
              <Fade ground="sunken" />
            </div>
          </div>
          <div className="flex gap-lg">
            <div className="relative h-24 flex-1 overflow-clip rounded-md border border-edge-subtle bg-base">
              <p className="p-md text-body-sm leading-relaxed text-ink-secondary">{copy}</p>
              <Fade side="top" ground="base" />
            </div>
            <div className="relative h-24 flex-1 overflow-clip rounded-md border border-edge-subtle bg-base">
              <p className="p-md text-body-sm leading-relaxed text-ink-secondary">{copy}</p>
              <Fade side="right" ground="base" size="sm" />
            </div>
            <div className="relative h-24 flex-1 overflow-clip rounded-md border border-edge-subtle bg-base">
              <p className="p-md text-body-sm leading-relaxed text-ink-secondary">{copy}</p>
              <Fade ground="base" isVisible={false} />
            </div>
          </div>
          {/* The pinned-bar seam: a bar on the affix ground (the page at
              90%) over running copy, and the band hung below it in the SAME
              ground. A ramp starting at the page's solid 100% photographed
              as a bright strip along the bar's edge; this one must not. */}
          <div className="relative h-32 overflow-clip rounded-md border border-edge-subtle bg-base">
            <p className="p-md text-body-sm leading-relaxed text-ink-secondary">{copy} {copy}</p>
            <div className="absolute inset-x-0 top-0 h-12 bg-affix" />
            <Fade side="top" ground="affix" className="top-12" />
          </div>
        </div>
      );
    })(),
  },
  {
    name: "chat-composer",
    // Both arrangements — the pill and the wrapped, squared frame — plus the
    // three states the fill carries: empty (bg-sunken), sendable (bg-accent)
    // and generating (bg-inverse). `layout` is pinned rather than measured so
    // the baseline cannot move with a font metric.
    //
    // No fixed width on the column: the mount frame is 560 with 24px of
    // padding, so a 560px child overflows it and the element screenshot CROPS
    // the send control clean off — invisible in the image, obvious in its
    // pixel dimensions, which is why that check is the rule for a new baseline.
    ui: (
      <div className="flex w-full flex-col gap-lg">
        <ChatComposer
          label="Message"
          placeholder="Message Diorama…"
          sendLabel="Send message"
          stopLabel="Stop generating"
          layout="inline"
          startAction={<Button variant="ghost" shape="full" size="md" isIconOnly aria-label="Add" icon={<Image />} />}
        />
        <ChatComposer
          label="Message"
          defaultValue="Create a carousel about Wim Crouwel's New Alphabet"
          sendLabel="Send message"
          stopLabel="Stop generating"
          layout="inline"
          startAction={<Button variant="ghost" shape="full" size="md" isIconOnly aria-label="Add" icon={<Image />} />}
        />
        <ChatComposer
          label="Message"
          placeholder="Reply to interrupt…"
          sendLabel="Send message"
          stopLabel="Stop generating"
          isGenerating
          layout="inline"
          startAction={<Button variant="ghost" shape="full" size="md" isIconOnly aria-label="Add" icon={<Image />} />}
        />
        <ChatComposer
          label="Message"
          defaultValue="Create a LinkedIn carousel about Josef Müller-Brockmann's grid systems — use the attached scan as the visual reference."
          sendLabel="Send message"
          stopLabel="Stop generating"
          layout="stacked"
          errorText="mueller-brockmann.tif is 68 MB — the attachment limit is 50 MB."
          startAction={<Button variant="ghost" shape="full" size="md" isIconOnly aria-label="Add" icon={<Image />} />}
        />
      </div>
    ),
  },
  {
    name: "chat-message",
    // Both voices in one frame, which is the only way the asymmetry is
    // visible: a bubble, right-aligned and capped, against an answer that owns
    // the column and has no container at all. Plus the two states that carry
    // colour — the sender's failure caption and the receiver's failure block.
    // The actions row is pinned visible; hover is not a state a baseline has.
    ui: (
      <div className="flex w-full flex-col gap-lg">
        <ChatMessage.Sender>What&apos;s our primary colour in CMYK?</ChatMessage.Sender>
        <ChatMessage.Receiver
          actions={
            <>
              <Button variant="ghost" size="sm" isIconOnly aria-label="Copy" icon={<Colors />} />
              <Button variant="ghost" size="sm" isIconOnly aria-label="Regenerate" icon={<Search />} />
            </>
          }
          meta="Diorama Agent · just now"
          isActionsVisible
        >
          Four-colour process: 82 / 46 / 0 / 12. The deep blue is the only brand colour with a CMYK build.
        </ChatMessage.Receiver>
        <ChatMessage.Sender status="failed" statusText="Not sent" retryLabel="Retry" onRetryAction={() => {}}>
          Now redraw it with Wim Crouwel&apos;s New Alphabet.
        </ChatMessage.Sender>
        <ChatMessage.Receiver
          errorText="Generation stopped — connection lost. The partial answer above is kept."
          retryLabel="Retry"
          onRetryAction={() => {}}
        >
          Here&apos;s your title slide — Aspekta headline on the brand&apos;s deep
        </ChatMessage.Receiver>
      </div>
    ),
  },
  {
    name: "chat-progress",
    // Every form on one axis, and every matrix HELD: a moving matrix is a
    // frame captured wherever its clock happens to be, so the baseline would
    // be about the clock. Held, each draws its key frame — the frame the
    // sheet draws — and the whole figure is deterministic.
    ui: (
      <div className="flex w-full flex-col gap-lg">
        <ChatProgress label="Thinking…" duration="12 s" isHeld />
        <ChatProgress label="Thinking" reasoning={PROGRESS_THOUGHT} duration="8 s" isHeld />
        <ChatProgress form="steps" label="Researching grid systems" duration="42 s" steps={PROGRESS_STEPS} isHeld />
        <ChatProgress form="parallel" label="Working on 4 things" meta="1 done" duration="31 s" lanes={PROGRESS_LANES} isHeld />
        <ChatProgress
          form="activity"
          activities={[
            { verb: "Reading…", detail: "Grid Systems in Graphic Design — Josef Müller-Brockmann, 1961" },
            { verb: "Searching…", detail: "5 files included across 3 spaces" },
          ]}
        />
        <ChatProgress form="measured" label="Generating slide 3 of 6" value={48} />
        <ChatProgress
          form="steps"
          label="Researching grid systems"
          steps={PROGRESS_STEPS}
          isComplete
          receiptText="Worked for 58 s · 4 steps · 1 failed"
          expandLabel="Show what the agent did"
        />
        <ChatProgress label="Thinking…" stoppedText="Stopped after 5 s" />
        <ChatProgress
          label="Thinking…"
          errorText="Stopped after 12 s — connection lost"
          retryLabel="Retry"
          onRetryAction={() => {}}
        />
      </div>
    ),
  },
  {
    name: "chat-run-dock",
    // The composer's block as 05 Background draws it: the dock tucked 24px inside
    // a pill stand-in, one measured and one unmeasured run (both HELD, so there is
    // one frame), then the four thread marks. The composer's OTHER edge
    // tenant rides above it: ChatProgress form="typing", people's presence,
    // narrow enough that the name truncates before the verb (40E1).
    ui: (
      <div className="flex w-full flex-col gap-xl rounded-md bg-base p-lg">
        <div className="flex flex-col gap-xs">
          <ChatProgress form="typing" who="Josef Müller-Brockmann and Wim Crouwel" label="are typing" isHeld className="w-60 ps-lg" />
          <ChatRunDock
            aria-label="Background runs"
            isHeld
            runs={DOCK_RUNS}
            onStopAction={() => {}}
            stopLabel={(run) => `Stop ${run.name}`}
          />
          <div className="h-control-lg rounded-full bg-field ring-hairline ring-edge-subtle ring-inset" />
        </div>
        <div className="flex flex-col gap-md">
          <ChatRunMark kind="started" label="Rendering Story cuts in the background" />
          <ChatRunMark kind="finished" label="Story cuts finished" detail="3 files · 2 min 6 s" actionLabel="Open" onAction={() => {}} />
          <ChatRunMark kind="failed" label="Brand kit export stopped at 180 of 248 files" retryLabel="Retry" onRetryAction={() => {}} />
          <ChatRunMark kind="stopped" label="You stopped Story cuts after 48 s" detail="1 of 3 kept" />
        </div>
      </div>
    ),
  },
  {
    name: "chat-sources",
    // Markers at rest, grouped and streaming; the block folded, open, as cards,
    // gathering (matrix HELD) and with a source that has gone. No hover, no
    // preview: nothing here waits on a pointer or a clock.
    ui: (
      <div className="flex w-full flex-col gap-lg">
        <ChatSources.Provider sources={SOURCES_DEMO} labels={SOURCES_LABELS}>
          <p className="text-body-md text-ink-primary">
            The horizon sits high<ChatSources.Citation sourceIds={["moma"]} /> and the grid holds it
            <ChatSources.Citation sourceIds={["grid", "tate"]} />.
          </p>
          <ChatSources label="5 sources" />
          <ChatSources label="5 sources" defaultIsOpen />
          <ChatSources label="5 sources" layout="cards" moreLabel={(n) => `+${n} more`} />
          <ChatSources label="3 sources so far" isGathering isHeld />
        </ChatSources.Provider>
        <ChatSources.Provider sources={SOURCES_DEMO} labels={SOURCES_LABELS} isStreaming>
          <p className="text-body-md text-ink-primary">
            Still streaming<ChatSources.Citation sourceIds={["moma"]} />
          </p>
        </ChatSources.Provider>
        <ChatSources.Provider sources={[{ ...SOURCES_DEMO[2]!, isUnavailable: true }]} labels={SOURCES_LABELS}>
          <ChatSources label="1 source" />
        </ChatSources.Provider>
      </div>
    ),
  },
  {
    name: "chat-tasks",
    // Every row status, the folded trio and the proposed plan in one frame.
    // Deterministic: the only matrix is held, so nothing loops.
    ui: (
      <div className="flex w-full flex-col gap-lg">
        <ChatTasks
          status="running"
          label="Grid systems carousel"
          count="2 of 6"
          statusLabels={TASK_LABELS}
          tasks={[
            { id: "a", label: "Read the poster scan and the brand grid", status: "done" },
            { id: "b", label: "Draft the frames on the 4 × 4 grid", status: "current", activity: "Reframing to 4:5 — frame 2 of 3" },
            { id: "c", label: "Check contrast of the red on the paper tone", status: "pending", isNew: true, newLabel: "New" },
            { id: "d", label: "Pick a quote for frame 3", status: "needsYou", needsYouLabel: "Needs you" },
            { id: "e", label: "Export the Story cut", status: "failed", reason: "Failed — the render timed out", retryLabel: "Retry", onRetryAction: () => {} },
            { id: "f", label: "Cut a 9:16 Story version", status: "skipped", skippedLabel: "Skipped — you asked for feed only" },
          ]}
        />
        <ChatTasks
          status="running"
          label="Grid systems carousel"
          count="2 of 5"
          defaultIsOpen={false}
          statusLabels={TASK_LABELS}
          tasks={[{ id: "b", label: "Draft the frames on the 4 × 4 grid", status: "current" }]}
        />
        <ChatTasks
          status="complete"
          label="Grid systems carousel"
          count="5 of 5 · 3 min"
          statusLabels={TASK_LABELS}
          tasks={[{ id: "a", label: "Read the poster scan", status: "done" }]}
        />
        <ChatTasks
          status="stopped"
          label="Grid systems carousel"
          count="Stopped at 2 of 5"
          defaultIsOpen={false}
          statusLabels={TASK_LABELS}
          tasks={[{ id: "a", label: "Read the poster scan", status: "done" }]}
        />
        <ChatTasks
          status="proposed"
          label="Grid systems carousel"
          count="3 steps · about 3 min"
          runLabel="Run plan"
          onRunAction={() => {}}
          changeLabel="Change it"
          onChangeAction={() => {}}
          footnote="Nothing runs until you say so"
          tasks={[
            { id: "a", label: "Read the poster scan and the brand grid" },
            { id: "b", label: "Draft the frames on the 4 × 4 grid" },
            { id: "c", label: "Write the post copy and alt text" },
          ]}
        />
      </div>
    ),
  },
  {
    name: "chat-widget",
    // Both families in one frame — a text artifact and a media artifact — which
    // is the only way "one container, two payloads" is visible at all.
    ui: (
      <div className="flex w-full flex-col gap-lg">
        <ChatWidget>
          <ChatWidget.Header
            name="LinkedIn post — grid systems series"
            icon={<Image />}
            chip={<Badge>Draft</Badge>}
          />
          <ChatWidget.Body scrollLabel="LinkedIn post draft">
            <p>
              Josef Müller-Brockmann did not design posters. He designed the system a poster has to obey — and then
              let the system do the arguing.
            </p>
          </ChatWidget.Body>
          <ChatWidget.Actions
            end={<Button variant="ghost" size="md" isIconOnly aria-label="Save" icon={<Colors />} />}
          >
            <Button variant="secondary" size="md" icon={<Image />}>
              Copy
            </Button>
            <Button variant="secondary" size="md" icon={<Search />}>
              Edit
            </Button>
          </ChatWidget.Actions>
        </ChatWidget>
        <ChatWidget>
          <ChatWidget.Media ratio="landscape">
            <img src={MEDIA} alt="Title slide" className="size-full object-cover" />
          </ChatWidget.Media>
          <ChatWidget.Caption>Grounded in brand palette · 2 sources</ChatWidget.Caption>
          <ChatWidget.Actions
            end={<Button variant="ghost" size="md" isIconOnly aria-label="Save" icon={<Colors />} />}
          >
            <Button variant="secondary" size="md" icon={<Search />}>
              Edit
            </Button>
          </ChatWidget.Actions>
        </ChatWidget>
      </div>
    ),
  },
  {
    name: "chat-questionnaire",
    // Unanswered, chosen, and the receipt — the three the selection language
    // has to hold together: the fill never moves, the edge and the check do.
    ui: (
      <div className="flex w-full flex-col gap-lg">
        <ChatQuestionnaire question="Which tone should the campaign lead with?" options={QUESTIONNAIRE_OPTIONS} />
        <ChatQuestionnaire
          question="Which formats should the campaign cover? Pick any."
          mode="multiple"
          options={QUESTIONNAIRE_OPTIONS.slice(0, 3)}
          defaultValue={["confident", "warm"]}
          confirmLabel="Confirm — 2 picked"
          skipLabel="Skip"
          onSkipAction={() => {}}
        />
        <ChatQuestionnaire
          question="Which tone should the campaign lead with?"
          options={QUESTIONNAIRE_OPTIONS}
          answer="Warm and personal"
        />
        {/*
          The IMAGE picker, which had no baseline at all until now — a whole
          section of the sheet, and the one place the selection language has to
          hold on a photograph rather than on a fill: a 2px outline OUTSIDE the
          media plus an accent check badge over it.
        */}
        <ChatQuestionnaire
          question="Which image direction fits the spring launch?"
          variant="tiles"
          defaultValue={["botanical"]}
          options={[
            { id: "botanical", label: "Botanical macro", src: MEDIA_COOL, alt: "A leaf against a dark ground" },
            { id: "studio", label: "Studio still life", src: MEDIA, alt: "Objects on a seamless backdrop" },
            { id: "street", label: "Street documentary", src: MEDIA_WARM, alt: "A street scene in daylight" },
            // NOT WHITE_MEDIA, which is white on a white page: a tile that cannot be
            // seen tests nothing, and the fourth frame is the one furthest from the
            // selected first — the pair a reader compares.
            { id: "archival", label: "Archival scan", src: MEDIA_ROSE, alt: "A scanned 1960s poster page" },
          ]}
        />
      </div>
    ),
  },
  {
    name: "table",
    // md and sm, selected and disabled rows, a sorted header and the empty
    // body. The row divider is 1.08:1 against the row and the selection edge
    // is 3px wide — neither is something a number in a test can confirm looks
    // like a table.
    ui: (
      <div className="flex flex-col gap-lg">
        <Table
          caption="Designers"
          columns={VISUAL_COLUMNS}
          rows={VISUAL_ROWS}
          getRowId={(row) => row.id}
          isSelectable
          getRowLabel={(row) => `Select ${row.name}`}
          selectAllLabel="Select all designers"
          defaultSelectedIds={["frutiger"]}
          defaultSort={{ columnKey: "name", direction: "descending" }}
          isRowDisabled={(row) => row.id === "biro"}
        />
        <Table
          size="sm"
          caption="Designers, empty"
          columns={VISUAL_COLUMNS}
          rows={[]}
          getRowId={(row) => row.id}
          isSelectable
          getRowLabel={(row) => `Select ${row.name}`}
          selectAllLabel="Select all designers, empty"
          empty={
            <EmptyState
              icon={<Inbox />}
              title="No designers match this filter"
              description="Clear the status filter to see all 24 records."
              action={<Button variant="secondary" shape="full">Clear Filter</Button>}
            />
          }
        />
      </div>
    ),
  },
  {
    name: "drawer",
    isOverlay: true,
    ui: (portalContainer) => (
      <Drawer defaultIsOpen>
        <Drawer.Panel label="Complete profile" container={portalContainer}>
          <Drawer.Body>
            <Drawer.Title>Complete your profile</Drawer.Title>
            <Input label="Studio name" defaultValue="Diorama Studio" />
          </Drawer.Body>
          <Drawer.Footer>
            <Button shape="full" isFullWidth>Save profile</Button>
          </Drawer.Footer>
        </Drawer.Panel>
      </Drawer>
    ),
  },
];

describe("visual baselines", () => {
  for (const scheme of SCHEMES) {
    for (const { name, ui, isOverlay } of CASES) {
      test(`${name} — ${scheme}`, async () => {
        const el = mount(ui, scheme, isOverlay);
        await stable(el);

        /*
          NOTHING MAY OVERFLOW THE FRAME.

          `elementLocator().toMatchScreenshot()` captures the element's BOX, so
          anything wider than it is cropped out of the baseline silently — and
          a cropped baseline compares cleanly against a cropped capture forever
          after. This file has already been bitten twice by that shape: once by
          the browser viewport (450px PNGs of a 608px frame) and once by the
          iframe downscale (448px of 560). Both were found by a person noticing
          a clipped control and checking the PNG's dimensions.

          This is the same check made automatic, and it catches the third
          cause, which is inside the case rather than around it: the frame is
          560px wide with 24px of padding, so a case sized `w-[560px]` overflows
          it by 48 and loses its trailing edge. That is exactly how the first
          chat-composer baseline lost its send button. Size a case to the
          frame's CONTENT width, or let it fill.

          Not asserted for an overlay: those mount a fixed surface inside a
          clipped 640px stage on purpose, and the stage's own overflow is the
          mechanism rather than a mistake.
        */
        if (!isOverlay) {
          expect(
            el.scrollWidth,
            `${name}: content is ${el.scrollWidth}px wide in a ${el.clientWidth}px frame — ` +
              `the ${el.scrollWidth - el.clientWidth}px past the edge will be CROPPED out of the ` +
              `baseline, and every future run will compare the crop against itself`,
          ).toBeLessThanOrEqual(el.clientWidth);
          // The same failure DOWNWARDS. The iframe is 900px tall, and a frame
          // whose bottom falls past it is captured at its full height with
          // everything below the fold painted blank — the first chart baseline
          // was 1397px tall and empty from 900 down, and the width check above
          // passed it. A tall case is split, or its content shortened.
          const bottom = Math.ceil(el.getBoundingClientRect().bottom);
          expect(
            bottom,
            `${name}: the frame ends at ${bottom}px in a ${window.innerHeight}px viewport — ` +
              `everything below ${window.innerHeight}px will be captured BLANK`,
          ).toBeLessThanOrEqual(window.innerHeight);
        }

        await expect(page.elementLocator(el)).toMatchScreenshot(`${name}-${scheme}`, {
          // ZERO tolerance, absolute — not a ratio.
          //
          // A ratio is a proportion of the WHOLE frame. At the old 0.01 and a
          // ~560x300 frame that was ~1,700 pixels of slack, more than the
          // entire Switch track: a small control could change completely and
          // the run stayed green. Tightening to 0.001 was not enough either —
          // moving the Switch thumb 4px still passed, because the changed
          // region is only ~64 pixels.
          //
          // 0 works because these baselines are machine-specific by
          // construction (which is also why this project is not in CI): the
          // same machine renders the same frame identically, so any drift IS
          // a change. Probed by moving the thumb 4px and watching switch AND
          // card-sorting fail, in both schemes.
          //
          // `threshold: 0` is the other half, and without it the zero above
          // was worth much less than it looked. `allowedMismatchedPixels`
          // caps HOW MANY pixels may differ; `threshold` decides which pixels
          // COUNT as differing, in YIQ perceived-colour space, and it
          // defaults to 0.1 — lenient. So a change that alters many pixels
          // SLIGHTLY registered as zero mismatches and passed at zero
          // tolerance.
          //
          // Found by changing Avatar's default shape from a circle to a
          // rounded square and watching the header case pass. The two render
          // 112 different pixels — the whole 24x24 avatar box — but they are
          // low-contrast neutrals, so each pixel's delta (2-20 per channel on
          // an anti-aliased corner) sat under the default threshold. The same
          // blind spot covers any radius, shadow, hairline or AA change on a
          // quiet surface, which is most of this library.
          //
          // 0 is safe here for the same reason the pixel count is: these
          // baselines are machine-specific by construction, so the same
          // machine renders the same frame byte-identically.
          comparatorOptions: { allowedMismatchedPixels: 0, threshold: 0 },
        });
      });
    }
  }
});
