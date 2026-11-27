import { useEffect, useState } from "react";
import { Check, Copy } from "griddy-icons";
import { IconSwap } from "@/ui/icon-swap";

const GLYPHS = { copy: <Copy />, check: <Check /> };
import { Button } from "@/ui/button";

/** The hero's install line: the command as text, and one button that copies it. */
export function InstallPill({ command }: { command: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  useEffect(() => {
    if (state === "idle") return;
    const timer = window.setTimeout(() => setState("idle"), 1800);
    return () => window.clearTimeout(timer);
  }, [state]);
  const [program, ...rest] = command.split(" ");
  async function copy() {
    try { await navigator.clipboard.writeText(command); setState("copied"); }
    catch { setState("failed"); }
  }
  return (
    <div className="install-pill">
      <code><span className="install-pill-program">{program}</span> {rest.join(" ")}</code>
      <Button variant="ghost" size="md" shape="full" isIconOnly aria-label={state === "copied" ? "Copied" : "Copy the install command"} icon={<IconSwap icons={GLYPHS} show={state === "copied" ? "check" : "copy"} />} className="install-pill-copy" onClick={() => void copy()} />
      <span className="sr-only" role="status">{state === "copied" ? "Install command copied" : state === "failed" ? "Copy failed. Select the command to copy it." : ""}</span>
    </div>
  );
}
