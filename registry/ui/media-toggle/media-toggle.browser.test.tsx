import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { act, createRef } from "react";
import type { ReactElement } from "react";

import { MediaToggle } from "./media-toggle.tsx";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function mount(ui: ReactElement) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(ui);
  });
  return container.querySelector<HTMLButtonElement>('[data-slot="media-toggle"]')!;
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  vi.restoreAllMocks();
});

const LABELS = { pauseLabel: "Pause background video", playLabel: "Play background video" };

/** A media element whose play/pause we can observe without a real file. */
function fakeVideo() {
  const video = document.createElement("video");
  vi.spyOn(video, "pause").mockImplementation(() => {
    video.dispatchEvent(new Event("pause"));
  });
  vi.spyOn(video, "play").mockImplementation(() => {
    video.dispatchEvent(new Event("play"));
    return Promise.resolve();
  });
  return video;
}

describe("MediaToggle", () => {
  test("the name and glyph say what pressing WILL do", async () => {
    const button = mount(<MediaToggle {...LABELS} defaultIsPaused={false} />);
    expect(button.getAttribute("aria-label")).toBe("Pause background video");
    expect(button.hasAttribute("aria-pressed")).toBe(false);
    await userEvent.click(button);
    expect(button.getAttribute("aria-label")).toBe("Play background video");
    expect(button.dataset.state).toBe("paused");
  });

  test("drives its target and follows the element's own events", async () => {
    const video = fakeVideo();
    const ref = createRef<HTMLVideoElement>();
    (ref as { current: HTMLVideoElement | null }).current = video;
    const button = mount(<MediaToggle {...LABELS} target={ref} defaultIsPaused={false} />);

    await userEvent.click(button);
    expect(video.pause).toHaveBeenCalled();
    expect(button.dataset.state).toBe("paused");

    // Played some other way — the button must not keep saying "Play".
    act(() => {
      video.dispatchEvent(new Event("play"));
    });
    expect(button.dataset.state).toBe("playing");
  });

  test("starts paused, and pauses the video, when reduced motion is asked for", () => {
    vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) => ({ matches: query.includes("reduce"), media: query }) as MediaQueryList,
    );
    const video = fakeVideo();
    const ref = { current: video };
    const button = mount(<MediaToggle {...LABELS} target={ref} />);
    expect(video.pause).toHaveBeenCalled();
    expect(button.getAttribute("aria-label")).toBe("Play background video");
  });

  test("controlled: reports and does not move on its own", async () => {
    const onPausedChange = vi.fn();
    const button = mount(<MediaToggle {...LABELS} isPaused={false} onPausedChange={onPausedChange} />);
    await userEvent.click(button);
    expect(onPausedChange).toHaveBeenCalledWith(true);
    expect(button.dataset.state).toBe("playing");
  });

  test("a consumer's preventDefault cancels the toggle", async () => {
    const button = mount(<MediaToggle {...LABELS} defaultIsPaused={false} onClick={(e) => e.preventDefault()} />);
    await userEvent.click(button);
    expect(button.dataset.state).toBe("playing");
  });

  test("paints the media family: a round disc, pointer cursor, 32px at md", () => {
    const button = mount(<MediaToggle {...LABELS} />);
    const style = getComputedStyle(button);
    expect(style.borderRadius).not.toBe("0px");
    expect(style.cursor).toBe("pointer");
    expect(button.getBoundingClientRect().width).toBe(32);
  });
});
