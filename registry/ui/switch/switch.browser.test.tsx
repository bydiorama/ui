import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { ReactElement } from "react";

import { Switch } from "./switch.tsx";

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
    expect(getComputedStyle(track).backgroundColor).toBe("rgb(81, 140, 162)");
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
