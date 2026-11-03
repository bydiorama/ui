import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { ReactElement } from "react";

import { Switch } from "./switch.tsx";

/**
 * The resolved value of a token, so an assertion names the ROLE rather than a
 * copy of what it resolved to on the day it was written. This one is FLOORED
 * against several grounds, so it moves whenever a new pair is declared — and
 * four tests whose names all say "uses the role, not the palette step" each
 * failed the first time it did, on a hard-coded rgb().
 */
function tokenColor(name: string): string {
  const probe = document.createElement("div");
  probe.style.color = `var(${name})`;
  document.body.appendChild(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}


let container: HTMLDivElement | null = null;
let root: Root | null = null;

function mount(ui: ReactElement) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => { root!.render(ui); });
  return {
    label: container.querySelector<HTMLElement>('[data-slot="switch"]')!,
    input: container.querySelector<HTMLInputElement>('[data-slot="input"]')!,
    track: container.querySelector<HTMLElement>('[data-slot="track"]')!,
    thumb: container.querySelector<HTMLElement>('[data-slot="thumb"]')!,
  };
}

async function settled(el: Element) {
  await Promise.all(el.getAnimations().map((a) => a.finished.catch(() => undefined)));
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null; container = null;
});

describe("Switch is a native control that announces as a switch", () => {
  test("role=switch on a real checkbox input", () => {
    const { input } = mount(<Switch>Show job title</Switch>);
    expect(input.tagName).toBe("INPUT");
    expect(input.type).toBe("checkbox");
    // The role is the entire difference from Checkbox at the a11y layer:
    // announced as on/off rather than checked.
    expect(input.getAttribute("role")).toBe("switch");
    expect(getComputedStyle(input).display).not.toBe("none");
  });

  test("Space toggles; Enter does not, per the platform", async () => {
    const onCheckedChange = vi.fn();
    const { input } = mount(<Switch onCheckedChange={onCheckedChange}>Toggle</Switch>);
    input.focus();
    await userEvent.keyboard(" ");
    expect(input.checked).toBe(true);
    expect(onCheckedChange).toHaveBeenLastCalledWith(true);

    await userEvent.keyboard("{Enter}");
    expect(onCheckedChange).toHaveBeenCalledTimes(1);
  });

  test("the label is part of the control and names it", async () => {
    const { label, input } = mount(<Switch>Show job title</Switch>);
    expect(input.labels?.[0]).toBe(label);
    expect(input.getAttribute("aria-label")).toBeNull();
    await userEvent.click(label.querySelector<HTMLElement>('[data-slot="label"]')!);
    expect(input.checked).toBe(true);
  });

  test("consumer onChange runs before the component reports its state", async () => {
    const calls: string[] = [];
    const { track } = mount(
      <Switch
        onChange={() => calls.push("consumer")}
        onCheckedChange={() => calls.push("component")}
      >
        Toggle
      </Switch>,
    );
    await userEvent.click(track);
    expect(calls).toEqual(["consumer", "component"]);
  });

  test("controlled does not move unless the parent moves it", async () => {
    const onCheckedChange = vi.fn();
    const { input, track } = mount(
      <Switch isChecked={false} onCheckedChange={onCheckedChange}>Toggle</Switch>,
    );
    await userEvent.click(track);
    expect(input.checked).toBe(false);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });
});

describe("Switch paints the designed control", () => {
  test("track and thumb geometry match the sheet", () => {
    const { track, thumb } = mount(<Switch>Toggle</Switch>);
    const t = getComputedStyle(track);
    expect(t.width).toBe("36px");
    expect(t.height).toBe("20px");
    expect(getComputedStyle(thumb).width).toBe("16px");
    expect(getComputedStyle(thumb).height).toBe("16px");
  });

  test("the whole row clears the 24px target floor", () => {
    const { label } = mount(<Switch>Toggle</Switch>);
    // The track is 20px; the label carries the target, as on Checkbox.
    expect(label.getBoundingClientRect().height).toBeGreaterThanOrEqual(24);
  });

  test("on uses the accent ROLE, not the blue palette step", async () => {
    const { track } = mount(<Switch defaultIsChecked>Toggle</Switch>);
    await settled(track);
    // The sheet drew --ui-blue-80 directly, which does not re-skin.
    expect(getComputedStyle(track).backgroundColor).toBe(tokenColor("--ui-bg-accent-legible"));
  });

  test("off is a non-text role and clears 3:1 as a control boundary", async () => {
    const { track } = mount(<Switch>Toggle</Switch>);
    await settled(track);
    // The sheet used --ui-text-placeholder — a TEXT role as a background.
    expect(getComputedStyle(track).backgroundColor).toBe("rgb(105, 99, 93)");
  });

  test("the thumb travels by transform, leaving the track's geometry alone", async () => {
    const off = mount(<Switch>Toggle</Switch>);
    await settled(off.thumb);
    const offX = off.thumb.getBoundingClientRect().left - off.track.getBoundingClientRect().left;
    act(() => root?.unmount());
    container?.remove();

    const on = mount(<Switch defaultIsChecked>Toggle</Switch>);
    await settled(on.thumb);
    const onX = on.thumb.getBoundingClientRect().left - on.track.getBoundingClientRect().left;

    expect(onX).toBeGreaterThan(offX);
    // 36 track - 16 thumb - 2 border - 1 inset = 17px of travel.
    expect(onX - offX).toBeGreaterThanOrEqual(14);
  });

  test("cursor communicates operability", () => {
    const enabled = mount(<Switch>Toggle</Switch>);
    expect(getComputedStyle(enabled.label).cursor).toBe("pointer");
    act(() => root?.unmount()); container?.remove();
    const disabled = mount(<Switch isDisabled>Toggle</Switch>);
    expect(getComputedStyle(disabled.label).cursor).toBe("not-allowed");
    expect(getComputedStyle(disabled.label).pointerEvents).not.toBe("none");
  });
});

describe("On state needs no JavaScript (#34)", () => {
  test("toggling the native input fills the track and moves the thumb without a React render", () => {
    const { input, track, thumb } = mount(<Switch>Newsletter</Switch>);
    track.style.transition = thumb.style.transition = "none";
    const restFill = getComputedStyle(track).backgroundColor;
    const restThumb = thumb.getBoundingClientRect().left;
    input.checked = true;
    expect(getComputedStyle(track).backgroundColor).not.toBe(restFill);
    expect(thumb.getBoundingClientRect().left).toBeGreaterThan(restThumb);
  });
});

/* ------------------------------------------------------------------ *
 * labelPlacement and description (#9 proposals)
 * ------------------------------------------------------------------ */

describe("Switch labelPlacement", () => {
  test("start is the settings row: full width, label first, the control at the END", () => {
    const host = document.createElement("div");
    host.style.width = "420px";
    document.body.appendChild(host);
    const r = createRoot(host);
    act(() => r.render(<Switch labelPlacement="start">Snap layouts to the baseline grid</Switch>));
    const row = host.querySelector<HTMLElement>('[data-slot="switch"]')!.getBoundingClientRect();
    const label = host.querySelector<HTMLElement>('[data-slot="label"]')!.getBoundingClientRect();
    const box = host.querySelector<HTMLElement>('[data-slot="track"]')!.getBoundingClientRect();
    expect(row.width).toBe(420);
    expect(label.left).toBeLessThan(box.left);
    expect(box.right).toBeCloseTo(row.right, 0);
    // Visual order only: the input still precedes the visual control, which
    // every peer-* selector depends on.
    const input = host.querySelector('[data-slot="input"]')!;
    expect(input.compareDocumentPosition(host.querySelector('[data-slot="track"]')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    act(() => r.unmount());
    host.remove();
  });

  test("end (default) is unchanged: control first, an inline row", () => {
    const { label } = mount(<Switch>Publish automatically</Switch>);
    expect(getComputedStyle(label).display).toBe("inline-flex");
  });
});

describe("Switch description", () => {
  test("named by the label, DESCRIBED by the description, and both are the hit target", async () => {
    const onCheckedChange = vi.fn();
    mount(
      <Switch description="Herbert Bayer and Otl Aicher get an email." onCheckedChange={onCheckedChange}>
        Notify the studio
      </Switch>,
    );
    const input = document.querySelector<HTMLInputElement>('[data-slot="input"]')!;
    const labelId = input.getAttribute("aria-labelledby")!;
    const descriptionId = input.getAttribute("aria-describedby")!;
    expect(document.getElementById(labelId)!.textContent).toBe("Notify the studio");
    expect(document.getElementById(descriptionId)!.textContent).toBe("Herbert Bayer and Otl Aicher get an email.");
    // Clicking the description toggles: it is inside the <label>.
    await userEvent.click(document.querySelector<HTMLElement>('[data-slot="description"]')!);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  test("a caller's own aria-describedby is kept beside the description", () => {
    mount(
      <Switch description="Sends at 09:00." aria-describedby="policy-note">
        Daily digest
      </Switch>,
    );
    const ids = document.querySelector('[data-slot="input"]')!.getAttribute("aria-describedby")!.split(" ");
    expect(ids).toContain("policy-note");
    expect(ids).toHaveLength(2);
  });

  test("the control sits on the label's FIRST line, not the block's centre", () => {
    const host = document.createElement("div");
    host.style.width = "240px";
    document.body.appendChild(host);
    const r = createRoot(host);
    act(() =>
      r.render(
        <Switch description="Quotes and hyphens sit outside the measure, as Jan Tschichold set them in 1928.">
          Keep hanging punctuation
        </Switch>,
      ),
    );
    const label = host.querySelector<HTMLElement>('[data-slot="label"]')!.getBoundingClientRect();
    const box = host.querySelector<HTMLElement>('[data-slot="track"]')!.getBoundingClientRect();
    expect(Math.abs(box.top - label.top)).toBeLessThan(3);
    act(() => r.unmount());
    host.remove();
  });

  test("description is muted, and dims with the row when disabled", () => {
    const probe = (token: string) => {
      const p = document.createElement("div");
      p.style.color = `var(${token})`;
      document.body.appendChild(p);
      const v = getComputedStyle(p).color;
      p.remove();
      return v;
    };
    const { label } = mount(<Switch description="Sends at 09:00.">Daily digest</Switch>);
    expect(getComputedStyle(label.querySelector('[data-slot="description"]')!).color).toBe(probe("--ui-text-muted"));
    act(() => root?.unmount());
    container?.remove();
    const disabled = mount(<Switch isDisabled description="Unavailable.">Embed Univers</Switch>);
    expect(getComputedStyle(disabled.label.querySelector('[data-slot="description"]')!).color).toBe(probe("--ui-text-disabled"));
  });
});
