import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown, Copy } from "griddy-icons";
import { fx } from "@/lib/fx";
import { Button } from "@/ui/button";
import { Popover } from "@/ui/popover";
import { Tabs } from "@/ui/tabs";
import { LookControls, looks, useIsDark, useShaderRuntime } from "../../home/LookDock";
import { useAppearance } from "../../lib/use-appearance";
import { Specimen } from "../Specimen";

/** Copies the example's source as plain text, whatever the highlighter wrapped it in. */
function CopyCode({ source }: { source: React.RefObject<HTMLElement | null> }) {
  const { effects } = useAppearance();
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  useEffect(() => {
    if (state === "idle") return;
    const timer = window.setTimeout(() => setState("idle"), 1800);
    return () => window.clearTimeout(timer);
  }, [state]);
  async function copy() {
    try { await navigator.clipboard.writeText(source.current?.textContent ?? ""); setState("copied"); }
    catch { setState("failed"); }
  }
  return <>
    <Button variant="secondary" size="md" className={effects === "on" ? `code-copy ${fx("glass", "inner")}` : "code-copy"} icon={state === "copied" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />} onClick={() => void copy()}>{state === "copied" ? "Copied" : "Copy code"}</Button>
    <span className="sr-only" role="status">{state === "copied" ? "Example code copied" : state === "failed" ? "Copy failed. Select the code to copy it." : ""}</span>
  </>;
}

/**
 * The look the example is shown in, named in the bar ("Zero · Light") and
 * changed in a panel under it: the home page's looks, Effects and Dark. A
 * look the panel does not offer (a stored Stress or Graphite) is still named.
 */
function LookTrigger() {
  const appearance = useAppearance();
  const isDark = useIsDark();
  useShaderRuntime();
  const brand = looks.find(look => look.value === appearance.brand)?.label ?? appearance.brand[0]!.toUpperCase() + appearance.brand.slice(1);
  const label = `${brand} · ${isDark ? "Dark" : "Light"}`;
  return (
    <Popover>
      <Popover.Trigger render={<button type="button" className="look-trigger" aria-label={`Look: ${label}`} />}>
        <span className="look-swatch" aria-hidden="true" />
        {label}
        <ChevronDown aria-hidden="true" />
      </Popover.Trigger>
      <Popover.Panel side="bottom" align="end" aria-label="Look" className="look-panel">
        <LookControls name="look-stage" />
      </Popover.Panel>
    </Popover>
  );
}

/**
 * The live example on its stage (Paper: "Component detail v3"). One surface
 * tile: the bar on top, the Preview / Code switch on the left and the look
 * the example is shown in on the right, and the example below it in a base
 * well. The source arrives highlighted from the page (a slot, rendered at
 * build time, so it costs no script) and stays in the document without
 * JavaScript.
 */
export function Stage({ name, code }: { name: string; code?: ReactNode }) {
  const source = useRef<HTMLDivElement>(null);
  return (
    <Tabs defaultValue="preview" className="stage gap-0">
      <div className="stage-bar">
        <Tabs.List aria-label="Example view" className="stage-tabs"><Tabs.Tab value="preview">Preview</Tabs.Tab><Tabs.Tab value="code">Code</Tabs.Tab></Tabs.List>
        <LookTrigger />
      </div>
      <Tabs.Panel value="preview" isAlwaysMounted className="stage-well specimen-well"><Specimen name={name} /></Tabs.Panel>
      <Tabs.Panel value="code" isAlwaysMounted className="stage-code example-code">
        <div className="code-head"><span className="code-file">{name}.tsx</span><CopyCode source={source} /></div>
        <div className="code-body" ref={source}>{code}</div>
      </Tabs.Panel>
    </Tabs>
  );
}
