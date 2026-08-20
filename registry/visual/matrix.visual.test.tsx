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
import { Avatar } from "@/ui/avatar/avatar.tsx";
import { Badge } from "@/ui/badge/badge.tsx";
import { Banner } from "@/ui/banner/banner.tsx";
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
import { Popover } from "@/ui/popover/popover.tsx";
import { Progress } from "@/ui/progress/progress.tsx";
import { Select, type SelectItem } from "@/ui/select/select.tsx";
import { Sheet } from "@/ui/sheet/sheet.tsx";
import { Slider } from "@/ui/slider/slider.tsx";
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
import { ChatProgress, type ChatProgressStep } from "@/ui/chat-progress/chat-progress.tsx";
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

/** The sheet's own step list: one done, one running, one waiting. */
const PROGRESS_STEPS: ChatProgressStep[] = [
  { id: "tone", label: "Tone of voice — 2 documents", status: "done" },
  { id: "styles", label: "Brand styles — palette and type ramp", status: "done" },
  { id: "images", label: "Collecting images — 8 of 12", status: "current" },
  { id: "moodboard", label: "Compose moodboard", status: "pending" },
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
    name: "badge",
    ui: (
      <div className="flex flex-col gap-md">
        {(["sm", "md"] as const).map((size) => (
          <div key={size} className="flex items-center gap-md">
            {/* EVERY variant, not a sample. `warning` was added and never
                entered this matrix, and `neutral` would have gone the same
                way — a variant the visual gate never renders is a variant the
                visual gate cannot defend. */}
            {(["selected", "unselected", "neutral", "success", "warning", "danger"] as const).map((variant) => (
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
    name: "switch",
    ui: (
      <div className="flex flex-col gap-md">
        <Switch>Off</Switch>
        <Switch defaultIsChecked>On</Switch>
        <Switch isDisabled>Disabled, off</Switch>
        <Switch isDisabled defaultIsChecked>Disabled, on</Switch>
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
    // All four forms plus both terminal rows, which is the only way the
    // escalation is visible as one axis. The spinner is the exception this
    // frame has to tolerate: it loops, so `stable()` skips it and the arc is
    // captured wherever it happens to be — the baseline is about the other
    // five rows.
    ui: (
      <div className="flex w-full flex-col gap-lg">
        <ChatProgress label="Thinking…" />
        <ChatProgress
          form="activity"
          activities={[
            { verb: "Reading…", detail: "Grid Systems in Graphic Design — Josef Müller-Brockmann, 1961" },
            { verb: "Searching…", detail: "5 files included across 3 spaces" },
          ]}
        />
        <ChatProgress form="steps" label="Gathering brand resources" duration="12 s" steps={PROGRESS_STEPS} />
        <ChatProgress form="measured" label="Generating slide 3 of 6" value={48} />
        <ChatProgress
          form="steps"
          label="Gathering brand resources"
          steps={PROGRESS_STEPS}
          isComplete
          receiptText="Worked for 26 s · 4 steps"
          expandLabel="Show what the agent did"
        />
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
