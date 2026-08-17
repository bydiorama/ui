/** Compile-time contract tests. `tsc --noEmit` is the runner. */

import { Copy } from "griddy-icons";

import { Button } from "../button/button.tsx";
import { Tooltip } from "./tooltip.tsx";

export function Valid() {
  return (
    <Tooltip.Provider>
      <Tooltip>
        <Tooltip.Trigger render={<Button isIconOnly aria-label="Duplicate" icon={<Copy />} />} />
        <Tooltip.Content>Duplicate to a brand</Tooltip.Content>
      </Tooltip>

      <Tooltip defaultIsOpen>
        <Tooltip.Trigger render={<Button>Uncontrolled</Button>} />
        <Tooltip.Content>Open on mount</Tooltip.Content>
      </Tooltip>

      <Tooltip isOpen onOpenChange={(isOpen) => isOpen && undefined} isDisabled={false}>
        <Tooltip.Trigger render={<Button>Controlled</Button>} className="w-fit" />
        <Tooltip.Content
          side="right"
          align="start"
          sideOffset={12}
          alignOffset={4}
          container={null}
          className="max-w-40"
          id="a-native-div-prop"
        >
          Placed and themed
        </Tooltip.Content>
      </Tooltip>
    </Tooltip.Provider>
  );
}

export function Invalid() {
  return (
    <>
      <Tooltip>
        {/* A tooltip describes something that already exists. Without `render`
            the behaviour layer would ship a bare unstyled <button>. */}
        {/* @ts-expect-error render is required */}
        <Tooltip.Trigger />
        <Tooltip.Content>Duplicate to a brand</Tooltip.Content>
      </Tooltip>

      <Tooltip>
        {/* @ts-expect-error render takes an element, not a component */}
        <Tooltip.Trigger render={Button} />
        <Tooltip.Content>Duplicate to a brand</Tooltip.Content>
      </Tooltip>

      {/* @ts-expect-error open/onOpenChange are spelled isOpen/onOpenChange (§1) */}
      <Tooltip open>
        <Tooltip.Trigger render={<Button>Trigger</Button>} />
        <Tooltip.Content>Duplicate to a brand</Tooltip.Content>
      </Tooltip>

      {/* @ts-expect-error disabled is spelled isDisabled (§1) */}
      <Tooltip disabled>
        <Tooltip.Trigger render={<Button>Trigger</Button>} />
        <Tooltip.Content>Duplicate to a brand</Tooltip.Content>
      </Tooltip>

      {/* onOpenChange reports a boolean, never Base UI's (open, eventDetails). */}
      {/* @ts-expect-error onOpenChange receives a boolean */}
      <Tooltip onOpenChange={(isOpen: string) => isOpen}>
        <Tooltip.Trigger render={<Button>Trigger</Button>} />
        <Tooltip.Content>Duplicate to a brand</Tooltip.Content>
      </Tooltip>

      <Tooltip>
        <Tooltip.Trigger render={<Button>Trigger</Button>} />
        {/* @ts-expect-error side is a closed union */}
        <Tooltip.Content side="above">Duplicate to a brand</Tooltip.Content>
      </Tooltip>

      <Tooltip>
        <Tooltip.Trigger render={<Button>Trigger</Button>} />
        {/* @ts-expect-error align is a closed union */}
        <Tooltip.Content align="middle">Duplicate to a brand</Tooltip.Content>
      </Tooltip>

      <Tooltip>
        <Tooltip.Trigger render={<Button>Trigger</Button>} />
        {/* The offset is a number of pixels, not a CSS length — the component
            owns the unit so a caller cannot introduce a second one. */}
        {/* @ts-expect-error sideOffset is a number */}
        <Tooltip.Content sideOffset="8px">Duplicate to a brand</Tooltip.Content>
      </Tooltip>

      {/* The delay group takes no props: timing belongs to @/lib/motion, not to
          a call site. */}
      {/* @ts-expect-error Provider takes no delay */}
      <Tooltip.Provider delay={0}>
        <Tooltip>
          <Tooltip.Trigger render={<Button>Trigger</Button>} />
          <Tooltip.Content>Duplicate to a brand</Tooltip.Content>
        </Tooltip>
      </Tooltip.Provider>
    </>
  );
}
