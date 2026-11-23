import { useId, useRef, useState, type ReactElement } from "react";
import {
  AlignTextCenter,
  AlignTextLeft,
  AlignTextRight,
  ArrowLeft,
  ChevronDown,
  Copy,
  Delete,
  Download,
  Edit,
  Lock,
  MagicWand,
  Maximize,
  Minus,
  Move,
  Plus,
  Redo,
  RefreshCw,
  Sidebar,
  TextFont,
  Undo,
} from "griddy-icons";

import { Accordion } from "@/ui/accordion";
import { Badge } from "@/ui/badge";
import { Button, type ButtonVariant } from "@/ui/button";
import { Card } from "@/ui/card";
import { ColorPicker } from "@/ui/color-picker";
import { DotPattern } from "@/ui/dot-pattern";
import { Menu } from "@/ui/menu";
import { Select } from "@/ui/select";
import { Tabs } from "@/ui/tabs";
import { Textarea } from "@/ui/textarea";
import { Tooltip } from "@/ui/tooltip";
import { cn } from "@/lib/cn";
import { fx } from "@/lib/fx";
import { motionMicro, motionStandard } from "@/lib/motion";
import { useAppearance } from "../../lib/use-appearance";

/*
 * A business card open in a template editor: the stage with its floating
 * islands, the selected text layer with its toolbar, and the inspector that
 * restyles the artwork. The card is CONTENT — its type comes from the brand
 * template (fixed sizes, not the UI's type roles) and its swatches are the
 * accent and data tokens, so it re-themes with the page like everything else.
 */

// ---------------------------------------------------------------- content

type Role = "heading" | "body";
type TextLayerId = "website" | "name" | "role" | "email" | "phone";
type Align = "left" | "center" | "right";

/** Layers in stacking order, as the layer picker lists them ("3 of 6"). */
const LAYERS = [
  { id: "background", label: "Background" },
  { id: "website", label: "Website" },
  { id: "name", label: "Name" },
  { id: "role", label: "Role" },
  { id: "email", label: "Email" },
  { id: "phone", label: "Phone" },
] as const;

const LAYER_ROLE: Record<TextLayerId, Role> = {
  name: "heading",
  role: "body",
  email: "body",
  phone: "body",
  website: "body",
};

const SWATCHES = [
  { id: "ink", label: "Ink", fill: "bg-ink-primary", ink: "text-ink-primary" },
  { id: "graphite", label: "Graphite", fill: "bg-ink-muted", ink: "text-ink-muted" },
  { id: "paper", label: "Paper", fill: "bg-base border-hairline border-edge-subtle", ink: "text-(color:--color-base)" },
  { id: "forest", label: "Forest", fill: "bg-success", ink: "text-success" },
  { id: "sage", label: "Sage", fill: "bg-data-transactional-solid", ink: "text-data-transactional-solid" },
  { id: "clay", label: "Clay", fill: "bg-data-commercial-solid", ink: "text-data-commercial-solid" },
] as const;
type SwatchId = (typeof SWATCHES)[number]["id"];

/** Type styles from the brand template — artwork sizes, not UI type roles. */
const TYPE_STYLES: Record<Role, { value: string; label: string; className: string }[]> = {
  heading: [
    { value: "display", label: "Display", className: "text-[34px] leading-tight" },
    { value: "title", label: "Title", className: "text-[28px] leading-tight" },
    { value: "subtitle", label: "Subtitle", className: "text-[22px] leading-snug" },
  ],
  body: [
    { value: "regular", label: "Regular", className: "text-[16px] leading-snug" },
    { value: "small", label: "Small", className: "text-[14px] leading-snug" },
    { value: "caption", label: "Caption", className: "text-[12px] leading-snug" },
  ],
};

interface TextStyle {
  /** A brand-kit swatch, or "custom" for the colour picked in `custom`. */
  color: SwatchId | "custom";
  /** The last colour picked outside the kit: content, so a literal hex. */
  custom: string | null;
  type: string;
  align: Align;
  bold: boolean;
  caps: boolean;
}

interface Doc {
  texts: Record<TextLayerId, string>;
  heading: TextStyle;
  body: TextStyle;
}

/** What "Reset to brand template" returns the styles to. */
const TEMPLATE: Pick<Doc, Role> = {
  heading: { color: "forest", custom: null, type: "title", align: "left", bold: false, caps: false },
  body: { color: "graphite", custom: null, type: "regular", align: "left", bold: false, caps: false },
};

const INITIAL: Doc = {
  texts: {
    name: "Josef Müller-Brockmann",
    role: "Co-founder \nand Executive Creative Director",
    email: "hello@bydiorama.com",
    phone: "+1 (646) 736-8372",
    website: "bydiorama.com",
  },
  heading: { ...TEMPLATE.heading, color: "ink", type: "display" },
  body: { ...TEMPLATE.body, color: "ink" },
};

/** The edit before the last, so Undo has something to step back to. */
const PREVIOUS: Doc = { ...INITIAL, heading: { ...INITIAL.heading, type: "title" } };

function countChanges(doc: Doc): number {
  let changes = 0;
  for (const role of ["heading", "body"] as const) {
    for (const key of Object.keys(TEMPLATE[role]) as (keyof TextStyle)[]) {
      // The picked colour counts through `color`; the remembered hex is not a second change.
      if (key !== "custom" && doc[role][key] !== TEMPLATE[role][key]) changes += 1;
    }
  }
  return changes;
}

const ALIGN_CLASS: Record<Align, string> = { left: "text-start", center: "text-center", right: "text-end" };

function textClass(doc: Doc, role: Role): string {
  const style = doc[role];
  return cn(
    TYPE_STYLES[role].find((entry) => entry.value === style.type)?.className,
    SWATCHES.find((swatch) => swatch.id === style.color)?.ink,
    role === "heading" ? (style.bold ? "font-bold" : "font-[550]") : style.bold ? "font-semibold" : "font-normal",
    role === "heading" ? "tracking-tight" : "tracking-normal",
    style.caps && "uppercase",
    "transition-colors",
    motionMicro,
  );
}

// ---------------------------------------------------------------- history

interface History {
  past: Doc[];
  present: Doc;
  future: Doc[];
  /** Consecutive keystrokes in one field collapse into one undo step. */
  lastKey: string | null;
}

function useDocHistory() {
  const [history, setHistory] = useState<History>({ past: [PREVIOUS], present: INITIAL, future: [], lastKey: null });
  const commit = (next: Doc, key: string | null = null) =>
    setHistory((current) =>
      key !== null && key === current.lastKey
        ? { ...current, present: next }
        : { past: [...current.past, current.present], present: next, future: [], lastKey: key },
    );
  const undo = () =>
    setHistory((current) => {
      const previous = current.past.at(-1);
      if (!previous) return current;
      return { past: current.past.slice(0, -1), present: previous, future: [current.present, ...current.future], lastKey: null };
    });
  const redo = () =>
    setHistory((current) => {
      const [next, ...rest] = current.future;
      if (!next) return current;
      return { past: [...current.past, current.present], present: next, future: rest, lastKey: null };
    });
  return { doc: history.present, canUndo: history.past.length > 0, canRedo: history.future.length > 0, commit, undo, redo };
}

// ---------------------------------------------------------------- parts

interface IconActionProps {
  label: string;
  icon: ReactElement;
  variant?: ButtonVariant | undefined;
  size?: "md" | "sm" | undefined;
  isPressed?: boolean | undefined;
  isDisabled?: boolean | undefined;
  className?: string | undefined;
  onClick?: (() => void) | undefined;
}

/** An icon-only Button named by its aria-label and shown by a Tooltip. */
function IconAction({ label, icon, variant = "ghost", size = "md", isPressed, isDisabled, className, onClick }: IconActionProps) {
  return (
    <Tooltip>
      <Tooltip.Trigger
        render={
          <Button
            variant={variant}
            size={size}
            isIconOnly
            aria-label={label}
            icon={icon}
            isDisabled={isDisabled ?? false}
            aria-pressed={isPressed}
            onClick={onClick}
            className={cn(isPressed !== undefined && "aria-pressed:bg-active aria-pressed:text-ink-primary", className)}
          />
        }
      />
      <Tooltip.Content>{label}</Tooltip.Content>
    </Tooltip>
  );
}

const ISLAND = "absolute z-10 flex items-center rounded-lg border border-edge-subtle bg-elevated p-sm shadow-lg";

function IslandDivider() {
  return <span aria-hidden="true" className="h-6 w-px shrink-0 bg-edge-subtle" />;
}

interface SelectionProps {
  isGlass: boolean;
  alignToolbar: "start" | "end";
  onEditText: () => void;
}

/** The selection frame, its four handles, and the floating toolbar above it. */
function Selection({ isGlass, alignToolbar, onEditText }: SelectionProps) {
  const variant: ButtonVariant = isGlass ? "ghost" : "inverse";
  // The inverse button's ring is for a lone control on the band; in a
  // toolbar the band itself is the edge.
  const actionClass = isGlass ? undefined : "ring-transparent";
  return (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -inset-x-xs -inset-y-0.5 rounded-sm border-hairline border-edge-focus bg-accent/15"
      >
        {(["left-0 top-0", "right-0 top-0", "left-0 bottom-0", "right-0 bottom-0"] as const).map((corner) => (
          <span
            key={corner}
            className={cn(
              "absolute size-1.5 rounded-full bg-accent ring-thick ring-base",
              corner,
              corner.includes("left") ? "-translate-x-1/2" : "translate-x-1/2",
              corner.includes("top") ? "-translate-y-1/2" : "translate-y-1/2",
            )}
          />
        ))}
      </span>
      <Card
        role="group"
        aria-label="Selected layer"
        className={cn(
          "absolute bottom-full z-10 mb-md w-max flex-row items-center gap-sm rounded-md p-xs shadow-lg",
          alignToolbar === "start" ? "-left-xs" : "-right-xs",
          isGlass ? fx("glass") : "border-transparent bg-inverse text-ink-inverse",
        )}
      >
        <IconAction label="Edit text" icon={<Edit />} variant={variant} className={actionClass} onClick={onEditText} />
        <IconAction label="Ask agent" icon={<MagicWand />} variant={variant} className={actionClass} />
        <div className="flex items-center gap-xs">
          <IconAction label="Duplicate" icon={<Copy />} variant={variant} className={actionClass} />
          <IconAction label="Delete" icon={<Delete />} variant={variant} className={actionClass} />
        </div>
      </Card>
    </>
  );
}

interface TextLayerProps {
  id: TextLayerId;
  doc: Doc;
  selected: string;
  isGlass: boolean;
  alignToolbar?: "start" | "end" | undefined;
  onSelect: (id: TextLayerId) => void;
  onEditText: () => void;
}

function TextLayer({ id, doc, selected, isGlass, alignToolbar = "start", onSelect, onEditText }: TextLayerProps) {
  const role = LAYER_ROLE[id];
  const isSelected = selected === id;
  return (
    <div className={ALIGN_CLASS[doc[role].align]}>
      <span className="relative inline-block max-w-full align-top">
        {isSelected && <Selection isGlass={isGlass} alignToolbar={alignToolbar} onEditText={onEditText} />}
        <button
          type="button"
          aria-pressed={isSelected}
          onClick={() => onSelect(id)}
          className={cn(
            "relative block min-h-[1lh] min-w-8 max-w-full cursor-default whitespace-pre-line rounded-sm",
            ALIGN_CLASS[doc[role].align],
            textClass(doc, role),
          )}
          style={doc[role].color === "custom" && doc[role].custom ? { color: doc[role].custom } : undefined}
        >
          {doc.texts[id]}
        </button>
      </span>
    </div>
  );
}

// ---------------------------------------------------------------- inspector

interface StyleControlsProps {
  role: Role;
  style: TextStyle;
  onChange: (patch: Partial<TextStyle>, key?: string) => void;
}

function StyleControls({ role, style, onChange }: StyleControlsProps) {
  const id = useId();
  const roleName = role === "heading" ? "Heading" : "Body";
  return (
    <div className="flex flex-col gap-md">
      <span id={`${id}-colour`} className="text-caption text-ink-secondary">
        Text colour
      </span>
      <div className="flex items-center gap-sm">
        <div role="radiogroup" aria-labelledby={`${id}-colour`} className="flex items-center">
          {SWATCHES.map((swatch) => (
            <label
              key={swatch.id}
              className={cn(
                "flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full border-hairline border-transparent",
                "transition-[border-color]",
                motionMicro,
                "has-checked:border-edge-strong",
                "has-[:focus-visible]:outline-focus has-[:focus-visible]:outline-offset-focus has-[:focus-visible]:outline-edge-focus",
              )}
            >
              <input
                type="radio"
                name={`${id}-swatch`}
                value={swatch.id}
                checked={style.color === swatch.id}
                onChange={() => onChange({ color: swatch.id })}
                className="sr-only"
              />
              <span className="sr-only">{swatch.label}</span>
              <span aria-hidden="true" className={cn("size-6 rounded-full", swatch.fill)} />
            </label>
          ))}
        </div>
        {/* A colour outside the kit. The picker streams every move, so the
            moves of one drag collapse into a single undo step. */}
        <ColorPicker
          label={`${roleName} custom colour`}
          variant="swatch"
          size="md"
          value={style.custom}
          onValueChange={(value) => value && onChange({ color: "custom", custom: value }, `${role}:custom`)}
          className="ms-auto"
        />
      </div>
      <Select
        label={`${roleName} type style`}
        isLabelHidden
        size="sm"
        items={TYPE_STYLES[role].map(({ value, label }) => ({ value, label }))}
        value={style.type}
        onValueChange={(value) => value && onChange({ type: value })}
        // Select has no `surface` prop yet; Input and Textarea do. The
        // chrome fill is the inspector's ground (ADR 0017).
        className="w-full min-w-0 [&_[data-slot=select-trigger]]:bg-field-chrome"
      />
      <div className="flex items-center justify-between gap-sm">
        <div
          role="group"
          aria-label="Alignment"
          className="flex items-center gap-xs rounded-md border-hairline border-edge-subtle bg-sunken p-0.5"
        >
          {(
            [
              ["left", "Align left", <AlignTextLeft key="left" />],
              ["center", "Align centre", <AlignTextCenter key="center" />],
              ["right", "Align right", <AlignTextRight key="right" />],
            ] as const
          ).map(([value, label, icon]) => (
            <IconAction
              key={value}
              label={label}
              icon={icon}
              size="sm"
              isPressed={style.align === value}
              className="w-8 rounded-sm"
              onClick={() => onChange({ align: value })}
            />
          ))}
        </div>
        <div className="flex items-center gap-sm">
          <ToggleText label="Bold" glyph="B" isPressed={style.bold} onClick={() => onChange({ bold: !style.bold })} />
          <ToggleText label="All caps" glyph="AA" isPressed={style.caps} onClick={() => onChange({ caps: !style.caps })} />
        </div>
      </div>
    </div>
  );
}

/** A toggle whose face is a typographic glyph rather than an icon. */
function ToggleText({ label, glyph, isPressed, onClick }: { label: string; glyph: string; isPressed: boolean; onClick: () => void }) {
  return (
    <Tooltip>
      <Tooltip.Trigger
        render={
          <Button
            variant="ghost"
            size="md"
            aria-pressed={isPressed}
            aria-label={label}
            onClick={onClick}
            className="size-control-md bg-sunken px-0 text-ink-muted aria-pressed:bg-active aria-pressed:text-ink-primary"
          >
            <span aria-hidden="true">{glyph}</span>
          </Button>
        }
      />
      <Tooltip.Content>{label}</Tooltip.Content>
    </Tooltip>
  );
}

// ---------------------------------------------------------------- screen

const ZOOM_STEPS = [50, 75, 100, 125, 150] as const;

export default function CreativeEditorExample() {
  const { effects } = useAppearance();
  const isGlass = effects === "on";
  const { doc, canUndo, canRedo, commit, undo, redo } = useDocHistory();
  const [selected, setSelected] = useState<TextLayerId>("name");
  const [styleRole, setStyleRole] = useState<Role>("heading");
  const [savedDoc, setSavedDoc] = useState<Doc | null>(null);
  const [zoom, setZoom] = useState(100);
  const [isPanning, setIsPanning] = useState(false);
  const [isNavigatorOpen, setIsNavigatorOpen] = useState(true);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const changes = countChanges(doc);
  const isSaved = savedDoc === doc;
  const layerIndex = LAYERS.findIndex((layer) => layer.id === selected);
  const layerLabel = LAYERS[layerIndex]?.label ?? "";
  const zoomIndex = ZOOM_STEPS.indexOf(zoom as (typeof ZOOM_STEPS)[number]);

  const select = (id: TextLayerId) => {
    setSelected(id);
    setStyleRole(LAYER_ROLE[id]);
  };
  const editStyle = (role: Role, patch: Partial<TextStyle>, key?: string) =>
    commit({ ...doc, [role]: { ...doc[role], ...patch } }, key ?? null);
  const editText = (text: string) => commit({ ...doc, texts: { ...doc.texts, [selected]: text } }, `text:${selected}`);
  const resetStyles = () => commit({ ...doc, heading: { ...TEMPLATE.heading }, body: { ...TEMPLATE.body } });
  const layer = (id: TextLayerId, alignToolbar?: "start" | "end") => (
    <TextLayer
      id={id}
      doc={doc}
      selected={selected}
      isGlass={isGlass}
      alignToolbar={alignToolbar}
      onSelect={select}
      onEditText={() => contentRef.current?.focus()}
    />
  );

  return (
    <div
      role="region"
      aria-label="Creative editor example"
      className="flex h-full w-full overflow-hidden bg-sunken font-body text-ink-primary"
    >
      <Tooltip.Provider>
        {/* ---------------------------------------------------- stage */}
        <div
          className={cn(
            "relative flex min-w-0 flex-1 items-center justify-center overflow-hidden px-3xl py-4xl",
            isPanning && "cursor-grab",
          )}
        >
          <DotPattern />

          <div className={cn(ISLAND, "left-lg top-lg gap-xs")}>
            <IconAction label="Back to templates" icon={<ArrowLeft />} />
            <IconAction
              label="Pages and formats"
              icon={<Sidebar />}
              isPressed={isNavigatorOpen}
              onClick={() => setIsNavigatorOpen((open) => !open)}
            />
          </div>

          <div className={cn(ISLAND, "right-lg top-lg gap-sm")}>
            <div className="flex items-center gap-xs">
              <IconAction label="Undo" icon={<Undo />} isDisabled={!canUndo} onClick={undo} />
              <IconAction label="Redo" icon={<Redo />} isDisabled={!canRedo} onClick={redo} />
            </div>
            <IslandDivider />
            <Button variant="secondary" size="md" isDisabled={isSaved} onClick={() => setSavedDoc(doc)}>
              {isSaved ? "Saved" : "Save"}
            </Button>
            <Button variant="primary" size="md" icon={<Download />}>
              Export
            </Button>
          </div>

          <div className={cn(ISLAND, "bottom-lg left-1/2 -translate-x-1/2 gap-sm")}>
            <Button variant="secondary" size="md" icon={<Plus />}>
              Insert
            </Button>
            <IslandDivider />
            <div className="flex items-center gap-xs">
              <IconAction label="Pan the canvas" icon={<Move />} isPressed={isPanning} onClick={() => setIsPanning((on) => !on)} />
              <IconAction
                label="Zoom out"
                icon={<Minus />}
                isDisabled={zoomIndex <= 0}
                onClick={() => setZoom(ZOOM_STEPS[Math.max(0, zoomIndex - 1)] ?? 100)}
              />
              <output aria-live="polite" aria-label="Zoom" className="w-10 text-center text-button-sm tabular-nums text-ink-secondary">
                {zoom}%
              </output>
              <IconAction
                label="Zoom in"
                icon={<Plus />}
                isDisabled={zoomIndex >= ZOOM_STEPS.length - 1}
                onClick={() => setZoom(ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, zoomIndex + 1)] ?? 100)}
              />
              <IconAction label="Fit to screen" icon={<Maximize />} onClick={() => setZoom(100)} />
            </div>
          </div>

          {/* The artwork: content, not chrome. */}
          <div
            className={cn("relative w-full max-w-[620px] transition-[scale] motion-reduce:transition-none", motionStandard)}
            style={{ scale: zoom / 100 }}
          >
            <div
              role="group"
              aria-label="Business card"
              className="flex aspect-[620/401] w-full flex-col justify-between rounded-sm bg-base p-3xl shadow-xl"
            >
              <div className="flex flex-col gap-sm">
                {layer("name")}
                {layer("role")}
              </div>
              <div className="flex items-end justify-between gap-2xl">
                <div className="flex flex-col gap-xs">
                  {layer("email")}
                  {layer("phone")}
                </div>
                {layer("website", "end")}
              </div>
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------- inspector */}
        <div className="relative z-10 flex w-80 shrink-0 flex-col rounded-s-lg border border-e-0 border-edge-subtle bg-elevated shadow-lg">
          <div className="flex h-12 shrink-0 items-center border-b border-edge-subtle px-sm">
            <Menu>
              <Menu.Trigger
                render={
                  <button
                    type="button"
                    className={cn(
                      "flex h-8 min-w-0 flex-1 items-center gap-sm rounded-md px-sm text-start",
                      "transition-[background-color] hover:bg-hover",
                      motionMicro,
                    )}
                  />
                }
              >
                <TextFont aria-hidden="true" className="size-4 shrink-0 text-ink-primary" />
                <span className="min-w-0 flex-1 truncate text-label-md text-ink-primary">{layerLabel}</span>
                <span className="shrink-0 text-caption font-medium text-ink-muted">Template field</span>
                <span className="shrink-0 text-caption font-medium tabular-nums text-ink-muted">
                  {layerIndex + 1} of {LAYERS.length}
                </span>
                <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-ink-muted" />
              </Menu.Trigger>
              <Menu.Panel align="start">
                {LAYERS.map((entry) =>
                  entry.id === "background" ? (
                    <Menu.Item key={entry.id} isDisabled trailing={<Lock aria-hidden="true" />}>
                      {entry.label}
                    </Menu.Item>
                  ) : (
                    <Menu.Item key={entry.id} onSelect={() => select(entry.id)}>
                      {entry.label}
                    </Menu.Item>
                  ),
                )}
              </Menu.Panel>
            </Menu>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <Accordion isMultiple headingLevel={3} defaultValue={["content", "brand"]}>
              <Accordion.Item value="content" className="border-b border-edge-subtle">
                <Accordion.Trigger>Content</Accordion.Trigger>
                <Accordion.Panel className="pt-0">
                  <div className="relative">
                    <Textarea
                      ref={contentRef}
                      label={`${layerLabel} text`}
                      isLabelHidden
                      size="sm"
                      surface="chrome"
                      isResizable={false}
                      rows={Math.max(1, doc.texts[selected].split("\n").length)}
                      value={doc.texts[selected]}
                      onChange={(event) => editText(event.target.value)}
                      className="[&_[data-slot=textarea]]:py-sm [&_[data-slot=textarea]]:pe-2xl"
                    />
                    <div className="absolute end-xs top-xs">
                      <IconAction label="Rewrite with the agent" icon={<MagicWand />} size="sm" className="text-ink-muted" />
                    </div>
                  </div>
                </Accordion.Panel>
              </Accordion.Item>
              <Accordion.Item value="brand" className="border-b border-edge-subtle">
                <Accordion.Trigger>Brand style</Accordion.Trigger>
                <Accordion.Panel className="pt-0">
                  <Tabs
                    variant="ghost"
                    value={styleRole}
                    onValueChange={(value) => setStyleRole(value as Role)}
                    className="flex flex-col gap-md"
                  >
                    <div className="flex items-center gap-xs">
                      <span aria-hidden="true" className="flex-1 text-label-sm text-ink-muted">
                        Typography
                      </span>
                      <Tabs.List aria-label="Typography">
                        <Tabs.Tab value="heading">Heading</Tabs.Tab>
                        <Tabs.Tab value="body">Body</Tabs.Tab>
                      </Tabs.List>
                    </div>
                    {(["heading", "body"] as const).map((role) => (
                      <Tabs.Panel key={role} value={role}>
                        <StyleControls role={role} style={doc[role]} onChange={(patch, key) => editStyle(role, patch, key)} />
                      </Tabs.Panel>
                    ))}
                  </Tabs>
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>
          </div>

          <div className="flex h-12 shrink-0 items-center gap-sm rounded-t-sm bg-surface px-sm shadow-md-up">
            <Button
              variant="ghost"
              size="sm"
              icon={<RefreshCw />}
              isDisabled={changes === 0}
              onClick={resetStyles}
              className="text-ink-secondary"
            >
              Reset to brand template
            </Button>
            {changes > 0 && (
              <Badge variant="warning" size="sm" className="ms-auto">
                {changes} changed
              </Badge>
            )}
          </div>
        </div>
      </Tooltip.Provider>
    </div>
  );
}
