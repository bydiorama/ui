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
 * Baselines are platform-specific (`-chromium-darwin`): font rasterisation
 * differs between macOS and Linux, so a committed macOS baseline cannot pass
 * on a Linux CI runner. This project is therefore deliberately NOT in CI —
 * see `knownGaps` in the ledger entry. It runs via `pnpm test:visual`.
 */
import { afterEach, describe, expect, test } from "vitest";
import { page } from "vitest/browser";
import { Search } from "griddy-icons";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { ReactElement } from "react";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED } from "@bydiorama/tokens";

import { Avatar } from "@/ui/avatar/avatar.tsx";
import { Badge } from "@/ui/badge/badge.tsx";
import { Banner } from "@/ui/banner/banner.tsx";
import { Button } from "@/ui/button/button.tsx";
import { Calendar } from "@/ui/calendar/calendar.tsx";
import { Card } from "@/ui/card/card.tsx";
import { Checkbox } from "@/ui/checkbox/checkbox.tsx";
import { Header } from "@/ui/header/header.tsx";
import { Input } from "@/ui/input/input.tsx";
import { Progress } from "@/ui/progress/progress.tsx";
import { Slider } from "@/ui/slider/slider.tsx";
import { CardSorting } from "@/ui/card-sorting/card-sorting.tsx";
import { Sidebar } from "@/ui/sidebar/sidebar.tsx";
import { Switch } from "@/ui/switch/switch.tsx";
import { Tabs } from "@/ui/tabs/tabs.tsx";

const PAIR = resolveThemePair(THEME_ZERO, { authored: ZERO_AUTHORED });
const SCHEMES = ["light", "dark"] as const;

let container: HTMLDivElement | null = null;
let root: Root | null = null;

/** Renders into a themed frame of fixed width, so a diff is layout-stable. */
function mount(ui: ReactElement, scheme: (typeof SCHEMES)[number]) {
  container = document.createElement("div");
  Object.assign(container.style, toStyleObject(PAIR)[scheme] as unknown as Record<string, string>, {
    width: "560px",
    padding: "24px",
    colorScheme: scheme,
  });
  container.className = "bg-base";
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(ui);
  });
  return container;
}

/** Fonts and transitions both move pixels; wait for each before capturing. */
async function stable(el: Element) {
  await document.fonts.ready;
  await Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => undefined)));
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

const CASES: Array<{ name: string; ui: ReactElement }> = [
  {
    name: "button",
    ui: (
      <div className="flex flex-col gap-md">
        {(["primary", "secondary", "ghost", "danger"] as const).map((variant) => (
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
    ui: (
      <Tabs defaultValue="links">
        <Tabs.List>
          <Tabs.Tab value="links" count={1}>Links</Tabs.Tab>
          <Tabs.Tab value="appearance">Appearance</Tabs.Tab>
          <Tabs.Tab value="advanced">Advanced settings</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="links" className="text-body-sm text-ink-secondary">Links panel</Tabs.Panel>
      </Tabs>
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
    // A FIXED month. A baseline of "this month" fails tomorrow.
    ui: (
      <Calendar
        label="Choose a date"
        defaultMonth={new Date(2026, 7, 1, 12)}
        defaultValue={new Date(2026, 7, 3, 12)}
      />
    ),
  },
  {
    name: "header",
    ui: (
      <Header>
        <Header.Start>
          <Button variant="ghost" size="md" isIconOnly aria-label="Back" icon={<Search />} />
        </Header.Start>
        <Header.Spacer />
        <Header.Nav label="Primary">
          <Header.Item href="/agent">Agent</Header.Item>
          <Header.Item href="/library" isCurrent>Library</Header.Item>
          <Header.Item>Work</Header.Item>
        </Header.Nav>
        <Header.Spacer />
        <Header.End>
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
    ui: (
      <Sidebar label="Primary">
        <Sidebar.Section label="Brand" isCollapsible>
          <Sidebar.Item href="/brand/guidelines" isCurrent>Brand Guidelines</Sidebar.Item>
          <Sidebar.Item href="/brand/assets">Assets</Sidebar.Item>
        </Sidebar.Section>
        <Sidebar.Item href="/exports">Exports</Sidebar.Item>
        <Sidebar.Section label="Settings">
          <Sidebar.Item href="/settings/team">Team</Sidebar.Item>
        </Sidebar.Section>
      </Sidebar>
    ),
  },
  {
    name: "avatar",
    ui: (
      <div className="flex items-center gap-md">
        <Avatar name="Mira Vance" />
        <Avatar name="Mira Vance" shape="rounded" />
        <Avatar name="Diorama Studio" initials="DS" />
      </div>
    ),
  },
];

describe("visual baselines", () => {
  for (const scheme of SCHEMES) {
    for (const { name, ui } of CASES) {
      test(`${name} — ${scheme}`, async () => {
        const el = mount(ui, scheme);
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
          comparatorOptions: { allowedMismatchedPixels: 0 },
        });
      });
    }
  }
});
