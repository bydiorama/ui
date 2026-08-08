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
import { ChevronDown, InfoCircle, Search } from "griddy-icons";

import { chromeControl } from "@/lib/chrome-control";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { ReactElement } from "react";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED } from "@bydiorama/tokens";

import { Accordion } from "@/ui/accordion/accordion.tsx";
import { Avatar } from "@/ui/avatar/avatar.tsx";
import { Badge } from "@/ui/badge/badge.tsx";
import { Banner } from "@/ui/banner/banner.tsx";
import { Button } from "@/ui/button/button.tsx";
import { Calendar } from "@/ui/calendar/calendar.tsx";
import { Card } from "@/ui/card/card.tsx";
import { ContextMenu } from "@/ui/context-menu/context-menu.tsx";
import { DatePicker } from "@/ui/date-picker/date-picker.tsx";
import { Checkbox } from "@/ui/checkbox/checkbox.tsx";
import { Drawer } from "@/ui/drawer/drawer.tsx";
import { Header } from "@/ui/header/header.tsx";
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
import { Switch } from "@/ui/switch/switch.tsx";
import { Tabs } from "@/ui/tabs/tabs.tsx";
import { Textarea } from "@/ui/textarea/textarea.tsx";

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

/** Fonts and transitions both move pixels; wait for each before capturing. */
async function stable(el: Element) {
  await act(async () => {
    await document.fonts.ready;
    await Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => undefined)));
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

const MULTISELECT_ITEMS: MultiselectItem[] = [
  { value: "concept", label: "Brand Concept" },
  { value: "guidelines", label: "Brand Guidelines" },
  { value: "stationery", label: "Stationery" },
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
      </div>
    ),
  },
  {
    name: "badge",
    ui: (
      <div className="flex flex-col gap-md">
        {(["sm", "md"] as const).map((size) => (
          <div key={size} className="flex items-center gap-md">
            {(["selected", "unselected", "success", "danger"] as const).map((variant) => (
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
    ui: (
      <div className="flex flex-col gap-lg">
        <Slider label="Logo size" defaultValue={62} hasValueText />
        <Slider label="Logo size" defaultValue={62} size="sm" isLabelHidden />
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
