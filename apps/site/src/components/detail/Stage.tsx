import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Copy } from "griddy-icons";
import { Button } from "@/ui/button";
import { Tabs } from "@/ui/tabs";
import { LookDock } from "../../home/LookDock";
import { Specimen } from "../Specimen";

/** Copies the example's source as plain text, whatever the highlighter wrapped it in. */
function CopyCode({ source }: { source: React.RefObject<HTMLElement | null> }) {
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
    <Button variant="secondary" size="md" className="code-copy" icon={state === "copied" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />} onClick={() => void copy()}>{state === "copied" ? "Copied" : "Copy code"}</Button>
    <span className="sr-only" role="status">{state === "copied" ? "Example code copied" : state === "failed" ? "Copy failed. Select the code to copy it." : ""}</span>
  </>;
}

/**
 * The live example on its stage (Paper: "Component detail v2"). One surface
 * tile with the example in a base well, and below it the bar: the Preview /
 * Code switch on the left and the look the example is shown in on the right.
 * The source arrives highlighted from the page (a slot, rendered at build
 * time, so it costs no script) and stays in the document without JavaScript.
 */
export function Stage({ name, code }: { name: string; code?: ReactNode }) {
  const source = useRef<HTMLDivElement>(null);
  return (
    <Tabs defaultValue="preview" className="stage gap-0">
      <Tabs.Panel value="preview" isAlwaysMounted className="stage-well specimen-well"><Specimen name={name} /></Tabs.Panel>
      <Tabs.Panel value="code" isAlwaysMounted className="stage-code example-code">
        <div className="code-head"><span className="code-file">{name}.tsx</span><CopyCode source={source} /></div>
        <div className="code-body" ref={source}>{code}</div>
      </Tabs.Panel>
      <div className="stage-bar">
        <Tabs.List aria-label="Example view" className="stage-tabs"><Tabs.Tab value="preview">Preview</Tabs.Tab><Tabs.Tab value="code">Code</Tabs.Tab></Tabs.List>
        <LookDock isInlineOnly />
      </div>
    </Tabs>
  );
}
