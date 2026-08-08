import { afterEach, describe, expect, test, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act, createRef } from "react";
import type { ReactElement } from "react";

import { Input } from "@/ui/input/input.tsx";
import { ImageUpload } from "./image-upload.tsx";

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
  container.style.width = "416px";
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(ui);
  });
  const q = <T extends HTMLElement>(slot: string) =>
    container!.querySelector<T>(`[data-slot="${slot}"]`);
  return {
    container: container!,
    root: q("image-upload")!,
    input: q<HTMLInputElement>("image-upload-input")!,
    dropzone: q("image-upload-dropzone")!,
    well: q("image-upload-well"),
    browse: q<HTMLButtonElement>("image-upload-browse"),
    q,
  };
}

function unmount() {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
}

afterEach(unmount);

/** A read taken immediately after a state change races the transition. */
async function settled(el: Element) {
  await act(async () => {
    await Promise.all(
      el.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => undefined)),
    );
  });
}

/** A real DragEvent with a real DataTransfer, so `dataTransfer.files` exists. */
function dragEvent(type: string, files: File[] = []) {
  const transfer = new DataTransfer();
  for (const file of files) transfer.items.add(file);
  return new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: transfer });
}

const FILE = () => new File(["x"], "hero-cover.jpg", { type: "image/jpeg" });

describe("ImageUpload is a real file field", () => {
  test("the label names the input, not the drop target", () => {
    const { input, container: c } = mount(<ImageUpload label="Cover image" />);
    const label = c.querySelector<HTMLLabelElement>('[data-slot="image-upload-label"]')!;

    expect(input.tagName).toBe("INPUT");
    expect(input.type).toBe("file");
    // htmlFor/id, so the accessible name resolves from the element that
    // carries the role — naming the wrapper would name nothing.
    expect(label.htmlFor).toBe(input.id);
    expect(input.labels?.[0]).toBe(label);
  });

  test("accept, multiple and disabled land on the input — the element that owns them", () => {
    const { input } = mount(
      <ImageUpload label="Cover image" accept="image/png" isMultiple isDisabled />,
    );
    expect(input.getAttribute("accept")).toBe("image/png");
    expect(input.multiple).toBe(true);
    expect(input.disabled).toBe(true);
  });

  /**
   * The keyboard path, which is the whole reason this component is allowlisted
   * in check:gestures rather than carrying an onKeyDown that does nothing.
   */
  test("browse is a real button that opens the picker", () => {
    const { browse, input } = mount(<ImageUpload label="Cover image" />);
    const click = vi.spyOn(input, "click");

    expect(browse!.tagName).toBe("BUTTON");
    expect(browse!.type).toBe("button");
    act(() => browse!.focus());
    expect(document.activeElement).toBe(browse);

    act(() => browse!.click());
    expect(click).toHaveBeenCalled();
  });

  test("browse does not rely on colour alone", () => {
    const { browse } = mount(<ImageUpload label="Cover image" />);
    // A link identified only by its ink fails 1.4.1 whatever it measures.
    expect(getComputedStyle(browse!).textDecorationLine).toContain("underline");
  });

  test("onSelect fires for a DROP and for a browse, with the same shape", () => {
    const onSelect = vi.fn();
    const { dropzone, input } = mount(<ImageUpload label="Cover image" onSelect={onSelect} />);

    act(() => {
      dropzone.dispatchEvent(dragEvent("drop", [FILE()]));
    });
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0]![0]).toHaveLength(1);
    expect(onSelect.mock.calls[0]![0][0].name).toBe("hero-cover.jpg");

    const transfer = new DataTransfer();
    transfer.items.add(FILE());
    input.files = transfer.files;
    act(() => {
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    // One handler, both paths — which is the promise the doc makes.
    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(Array.isArray(onSelect.mock.calls[1]![0])).toBe(true);
  });

  test("a drop with no files does not fire", () => {
    const onSelect = vi.fn();
    const { dropzone } = mount(<ImageUpload label="Cover image" onSelect={onSelect} />);
    act(() => {
      dropzone.dispatchEvent(dragEvent("drop"));
    });
    expect(onSelect).not.toHaveBeenCalled();
  });

  test("dragover is prevented, or the browser navigates to the file instead", () => {
    const { dropzone } = mount(<ImageUpload label="Cover image" />);
    const event = dragEvent("dragover", [FILE()]);
    act(() => {
      dropzone.dispatchEvent(event);
    });
    // Without preventDefault the drop never reaches the component at all.
    expect(event.defaultPrevented).toBe(true);
  });

  test("a disabled field ignores a drop", () => {
    const onSelect = vi.fn();
    const { dropzone } = mount(<ImageUpload label="Cover image" isDisabled onSelect={onSelect} />);
    act(() => {
      dropzone.dispatchEvent(dragEvent("drop", [FILE()]));
    });
    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe("ImageUpload states", () => {
  test("errorText is what makes the state rejected — the two cannot disagree", () => {
    const { root: el, input } = mount(
      <ImageUpload label="Cover image" errorText="hero-cover.jpg is 14 MB" />,
    );
    expect(el.dataset.status).toBe("rejected");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    // The message is referenced, not just rendered near the control.
    const described = input.getAttribute("aria-describedby") ?? "";
    const errorId = document.querySelector('[data-slot="image-upload-error"]')!.id;
    expect(described.split(" ")).toContain(errorId);
  });

  test("the rejection is carried by the BORDER as well as the message", async () => {
    const empty = mount(<ImageUpload label="Cover image" />);
    await settled(empty.dropzone);
    const resting = getComputedStyle(empty.dropzone).borderColor;
    unmount();

    const rejected = mount(<ImageUpload label="Cover image" errorText="Too large" />);
    await settled(rejected.dropzone);
    const danger = getComputedStyle(rejected.dropzone).borderColor;

    // Input shipped once with an error border identical to its default, which
    // left the message's colour as the only channel — WCAG 1.4.1 exactly.
    expect(danger).not.toBe(resting);
    expect(danger).toBe("rgb(169, 68, 31)");
  });

  test("the busy state announces itself and is not inked as disabled", () => {
    const { q } = mount(
      <ImageUpload label="Cover image" status="busy" busyText="Uploading the image" />,
    );
    const busy = q("image-upload-busy")!;
    // A screen reader is not watching the bar.
    expect(busy.getAttribute("role")).toBe("status");
    // --ui-text-secondary, NOT the sheet's --ui-text-disabled (1.94:1 here).
    // Live status is not an exempt disabled control.
    expect(getComputedStyle(busy).color).toBe("rgb(47, 44, 41)");
  });

  test("dragging swaps BOTH the edge and the well, and is exposed as data", async () => {
    const { root: el, dropzone, well } = mount(<ImageUpload label="Cover image" />);
    await settled(dropzone);
    const restingEdge = getComputedStyle(dropzone).borderColor;
    const restingWell = getComputedStyle(well!).backgroundColor;

    act(() => {
      dropzone.dispatchEvent(dragEvent("dragover", [FILE()]));
    });
    await settled(dropzone);

    expect(el.dataset.dragging).toBe("true");
    const dragWell = document.querySelector<HTMLElement>('[data-slot="image-upload-well"]')!;
    // A wash is colour only, so the edge has to move too.
    expect(getComputedStyle(dropzone).borderColor).not.toBe(restingEdge);
    expect(getComputedStyle(dragWell).backgroundColor).not.toBe(restingWell);

    act(() => {
      dropzone.dispatchEvent(dragEvent("dragleave"));
    });
    await settled(dropzone);
    expect(el.dataset.dragging).toBeUndefined();
  });

  test("attached shows the preview slot instead of the prompt", () => {
    const { q } = mount(
      <ImageUpload
        label="Cover image"
        status="attached"
        preview={<img src="data:," alt="hero" />}
      />,
    );
    expect(q("image-upload-preview")).not.toBeNull();
    expect(q("image-upload-prompt")).toBeNull();
  });

  test("the helper turns danger-inked once a constraint is broken", () => {
    const calm = mount(<ImageUpload label="C" helperText="max 10 MB" />);
    const calmInk = getComputedStyle(calm.q("image-upload-helper")!).color;
    unmount();

    const broken = mount(<ImageUpload label="C" helperText="max 10 MB" errorText="14 MB" />);
    expect(getComputedStyle(broken.q("image-upload-helper")!).color).not.toBe(calmInk);
  });
});

describe("ImageUpload.File", () => {
  test("the bar is a real Progress named after the file", () => {
    const { container: c } = mount(<ImageUpload.File name="hero-cover.jpg" value={62} />);
    const bar = c.querySelector('[role="progressbar"]')!;

    // Not a hand-drawn track: the role and the value come free, and so does
    // the legible fill.
    expect(bar.getAttribute("aria-valuenow")).toBe("62");
    expect(bar.getAttribute("aria-valuemax")).toBe("100");
    const labelId = bar.getAttribute("aria-labelledby")!;
    expect(document.getElementById(labelId)!.textContent).toBe("hero-cover.jpg");
  });

  test("the fill is the LEGIBLE accent, not the sheet's raw accent", () => {
    const { container: c } = mount(<ImageUpload.File name="a.jpg" value={62} />);
    const fill = c.querySelector<HTMLElement>('[data-slot="fill"]')!;
    // --ui-bg-accent measures 1.24:1 against this track in light; the legible
    // role is 3.07:1. Asserted as the resolved colour, not the class.
    expect(getComputedStyle(fill).backgroundColor).toBe(tokenColor("--ui-bg-accent-legible"));
  });

  test("the sheet's 6px track, and it differs from Progress's other sizes", () => {
    const { container: c } = mount(<ImageUpload.File name="a.jpg" value={62} />);
    const track = c.querySelector<HTMLElement>('[data-slot="track"]')!;
    expect(getComputedStyle(track).height).toBe("6px");
  });

  /**
   * The sheet puts the percentage at the END OF THE NAME'S LINE.
   *
   * `Progress hasValueText` renders it in a row of its own above the track,
   * which stacked the number under the file name — correct in every computed
   * value and wrong in the only place it shows. Caught by looking at the
   * baseline, so it is pinned as a geometry assertion here.
   */
  test("the percentage sits beside the name, not under it", () => {
    const { container: c } = mount(<ImageUpload.File name="hero-cover.jpg" value={62} />);
    const name = c.querySelector<HTMLElement>('[data-slot="image-upload-file-name"]')!.getBoundingClientRect();
    const value = c.querySelector<HTMLElement>('[data-slot="image-upload-file-value"]')!.getBoundingClientRect();

    // Same line, and to the right of the name.
    expect(Math.abs(value.top - name.top)).toBeLessThan(4);
    expect(value.left).toBeGreaterThan(name.left);
    // And it is not announced twice — the bar already carries aria-valuenow.
    expect(c.querySelector('[data-slot="image-upload-file-value"]')!.getAttribute("aria-hidden")).toBe("true");
  });

  test("no value means no bar at all", () => {
    const { container: c } = mount(<ImageUpload.File name="a.jpg" detail="2.2 MB · uploaded" />);
    expect(c.querySelector('[role="progressbar"]')).toBeNull();
  });

  test("the cancel control names the file it cancels", () => {
    const onCancel = vi.fn();
    const { container: c } = mount(
      <ImageUpload.File
        name="hero-cover.jpg"
        value={62}
        onCancel={onCancel}
        cancelLabel="Cancel upload of hero-cover.jpg"
      />,
    );
    const cancel = c.querySelector<HTMLButtonElement>('[data-slot="image-upload-file-cancel"]')!;
    expect(cancel.getAttribute("aria-label")).toBe("Cancel upload of hero-cover.jpg");
    // 24px is SC 2.5.8's floor exactly.
    const box = cancel.getBoundingClientRect();
    expect(box.width).toBeGreaterThanOrEqual(24);
    expect(box.height).toBeGreaterThanOrEqual(24);

    act(() => cancel.click());
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe("ImageUpload.Add", () => {
  test("is a real button with a name, at the sheet's 92px", () => {
    const { container: c } = mount(<ImageUpload.Add label="Add images" />);
    const add = c.querySelector<HTMLButtonElement>('[data-slot="image-upload-add"]')!;
    expect(add.tagName).toBe("BUTTON");
    // A tile that is a plus glyph and nothing else announces as "button".
    expect(add.getAttribute("aria-label")).toBe("Add images");
    const style = getComputedStyle(add);
    expect(style.width).toBe("92px");
    expect(style.height).toBe("92px");
    expect(style.cursor).toBe("pointer");
  });

  test("its glyph is sized by the component, not by griddy", () => {
    const { container: c } = mount(<ImageUpload.Add label="Add images" />);
    const svg = c.querySelector<SVGElement>('[data-slot="image-upload-add"] svg')!;
    // griddy renders width/height as presentation ATTRIBUTES (24px).
    expect(Math.round(svg.getBoundingClientRect().width)).toBe(16);
  });
});

describe("ImageUpload is Input's field", () => {
  /**
   * A RELATIONSHIP, not numbers. The claim in the doc is that the two stack in
   * a form without a seam, which is only true while their labels match — and
   * the sheet draws this one at weight 550 and Input's at 500.
   */
  test("its label is Input's label", () => {
    const upload = mount(<ImageUpload label="Cover image" />);
    const a = getComputedStyle(
      upload.container.querySelector<HTMLElement>('[data-slot="image-upload-label"]')!,
    );
    const picked = {
      fontSize: a.fontSize,
      fontWeight: a.fontWeight,
      color: a.color,
      fontFamily: a.fontFamily,
    };
    unmount();

    const input = mount(<Input label="Company name" />);
    const b = getComputedStyle(input.container.querySelector<HTMLElement>("label")!);
    expect(picked).toEqual({
      fontSize: b.fontSize,
      fontWeight: b.fontWeight,
      color: b.color,
      fontFamily: b.fontFamily,
    });
  });
});

describe("ImageUpload forwarding — §5", () => {
  test("the ref goes to the field, not the hidden input", () => {
    const ref = createRef<HTMLDivElement>();
    const { root: el } = mount(<ImageUpload ref={ref} label="Cover image" />);
    // Deliberately not §5's form-control rule: the control here is visually
    // hidden and a caller taking a ref wants the field. Documented.
    expect(ref.current).toBe(el);
  });

  test("className lands on the outermost node", () => {
    const { root: el } = mount(<ImageUpload label="Cover image" className="opacity-50" />);
    expect(getComputedStyle(el).opacity).toBe("0.5");
  });
});
