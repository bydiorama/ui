import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { ReactElement } from "react";

import { useControllableState } from "./use-controllable-state.ts";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function mount(ui: ReactElement) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(ui);
  });
  return container;
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

function Toggle({
  value,
  onChange,
}: {
  value?: boolean;
  onChange?: (v: boolean) => void;
}) {
  const [checked, setChecked] = useControllableState({
    ...(value !== undefined ? { value } : {}),
    defaultValue: false,
    ...(onChange ? { onChange } : {}),
  });
  return (
    <button type="button" onClick={() => setChecked(!checked)}>
      {checked ? "on" : "off"}
    </button>
  );
}

describe("useControllableState", () => {
  test("uncontrolled: the hook owns the value and still reports changes", async () => {
    const onChange = vi.fn();
    const c = mount(<Toggle onChange={onChange} />);
    const button = c.querySelector("button")!;

    expect(button.textContent).toBe("off");
    await userEvent.click(button);
    expect(button.textContent).toBe("on");
    expect(onChange).toHaveBeenCalledWith(true);
  });

  test("controlled: the hook does NOT move on its own", async () => {
    const onChange = vi.fn();
    const c = mount(<Toggle value={false} onChange={onChange} />);
    const button = c.querySelector("button")!;

    await userEvent.click(button);

    // The parent said false and never updated, so the UI must still say false.
    // A component that moves anyway looks right for one frame and then
    // disagrees with its parent — the whole reason this hook is shared.
    expect(button.textContent).toBe("off");
    expect(onChange).toHaveBeenCalledWith(true);
  });

  test("controlled: the value follows the parent", () => {
    const c = mount(<Toggle value={false} />);
    const button = c.querySelector("button")!;
    expect(button.textContent).toBe("off");

    act(() => {
      root!.render(<Toggle value={true} />);
    });
    expect(button.textContent).toBe("on");
  });

  test("the setter is referentially stable across renders", () => {
    const setters: Array<(v: boolean) => void> = [];
    function Probe({ value }: { value?: boolean }) {
      const [, setValue] = useControllableState({
        ...(value !== undefined ? { value } : {}),
        defaultValue: false,
      });
      setters.push(setValue);
      return null;
    }
    mount(<Probe />);
    act(() => {
      root!.render(<Probe />);
    });
    act(() => {
      root!.render(<Probe />);
    });

    expect(setters.length).toBeGreaterThanOrEqual(3);
    // An unstable setter turns any effect that depends on it into a loop.
    expect(new Set(setters).size).toBe(1);
  });

  test("switching modes warns instead of silently picking a winner", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mount(<Toggle />);
    act(() => {
      root!.render(<Toggle value={true} />);
    });

    expect(error).toHaveBeenCalled();
    expect(String(error.mock.calls[0]?.[0])).toContain("uncontrolled to controlled");
    error.mockRestore();
  });
});
