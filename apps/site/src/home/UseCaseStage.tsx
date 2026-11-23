import { lazy, Suspense, useEffect, useRef, useState, type ComponentType } from "react";
import { Tabs } from "@/ui/tabs";
import AiWorkspaceExample from "./examples/ai-workspace";

/** The first screen ships in the page's HTML; the rest load when asked for,
 *  and are fetched in the background once the stage is on screen. */
const loaders = {
  "finance-operations": () => import("./examples/finance-operations"),
  "creative-editor": () => import("./examples/creative-editor"),
  "image-library": () => import("./examples/image-library"),
  "docs-editor": () => import("./examples/docs-editor"),
};
const lazyScreens = {
  "finance-operations": lazy(loaders["finance-operations"]),
  "creative-editor": lazy(loaders["creative-editor"]),
  "image-library": lazy(loaders["image-library"]),
  "docs-editor": lazy(loaders["docs-editor"]),
} satisfies Record<keyof typeof loaders, ComponentType>;

const useCases = [
  { value: "ai-workspace", label: "AI Workspace", Screen: AiWorkspaceExample, about: "A coding agent's thread: its progress, the changes it made with a diff, and a reply box. Nothing is merged until you approve." },
  { value: "finance-operations", label: "Finance Operations", Screen: lazyScreens["finance-operations"], about: "A finance app's receivables: a navigation rail, a searchable, filterable table of invoices and a panel of activity." },
  { value: "creative-editor", label: "Creative Editor", Screen: lazyScreens["creative-editor"], about: "A design editor: pages and formats, a canvas with a selected text layer and its toolbar, and the layer's settings." },
  { value: "image-library", label: "Image Library", Screen: lazyScreens["image-library"], about: "A studio's image archive: folders, a searchable grid filtered by tag, and an image with pinned notes." },
  { value: "docs-editor", label: "Docs Editor", Screen: lazyScreens["docs-editor"], about: "A docs editor: a page on payment reminders, a suggested rewrite of the selected paragraph, and an assistant thread beside it." },
] as const;

/** The screens are laid out for this box. Narrower stages scale the whole
 *  window down rather than reflowing a desktop app into a phone. */
const CANVAS = { width: 960, height: 562 };

export function UseCaseStage() {
  const [value, setValue] = useState<string>(useCases[0].value);
  const frame = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setScale(Math.min(1, entry!.contentRect.width / CANVAS.width)));
    observer.observe(element);
    const preload = () => Object.values(loaders).forEach(load => void load());
    const hasIdle = typeof window.requestIdleCallback === "function";
    const idle = hasIdle ? window.requestIdleCallback(preload) : window.setTimeout(preload, 1500);
    return () => {
      observer.disconnect();
      if (hasIdle) window.cancelIdleCallback(idle); else window.clearTimeout(idle);
    };
  }, []);

  return (
    <Tabs value={value} onValueChange={setValue} variant="ghost" className="use-case-tabs">
      <Tabs.List aria-label="Example screens" className="use-case-list">
        {useCases.map(({ value: key, label }) => <Tabs.Tab key={key} value={key}>{label}</Tabs.Tab>)}
      </Tabs.List>
      <div className="use-case-stage">
      <div className="use-case-window">
        <div ref={frame} className="use-case-frame" style={{ height: CANVAS.height * scale }}>
          {useCases.map(({ value: key, label, Screen, about }) => (
            <Tabs.Panel key={key} value={key} className="use-case-panel" aria-label={`${label} example`}>
              {/* The screen is a picture of an app, not one: inert keeps its
                  dozen controls out of the tab order (and out of the
                  accessibility tree), so the keyboard goes from the tabs to
                  the next section. This sentence says what the picture shows. */}
              <p className="sr-only">{about}</p>
              <div inert className="use-case-canvas" style={{ width: CANVAS.width, height: CANVAS.height, transform: scale < 1 ? `scale(${scale})` : undefined }}>
                <Suspense fallback={<div className="use-case-loading" aria-busy="true" />}>
                  <Screen />
                </Suspense>
              </div>
            </Tabs.Panel>
          ))}
        </div>
      </div>
      </div>
    </Tabs>
  );
}
