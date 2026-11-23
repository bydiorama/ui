import { useMemo, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { Search } from "griddy-icons";

import { cn } from "@/lib/cn";
import { fx } from "@/lib/fx";
import { AspectRatio } from "@/ui/aspect-ratio";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";

import { useAppearance } from "../../lib/use-appearance";

/* ── Sample data (Paper: "Example — Image library") ─────────────────────── */

interface Note {
  text: string;
  by: string;
  /** Where the pin sits on the picture, in % of its width and height. */
  x?: number;
  y?: number;
}

interface Piece {
  id: string;
  title: string;
  tags: string[];
  maker: string;
  src: string;
  alt: string;
  notes: Note[];
}

/** Every picture is 800×537; the frames crop them to 3:2. */
const IMG = { width: 800, height: 537 } as const;

const PIECES: Piece[] = [
  {
    id: "tall-vase", title: "Tall vase, ash glaze", tags: ["stoneware", "vase", "matte"], maker: "Thrown by Cipe Pineles · 28 cm",
    src: "/media/ceramics/tall-vase.webp", alt: "A tall pale green stoneware vase with a crackled ash glaze, on a warm sand backdrop",
    notes: [
      { text: "The glaze pooled at the shoulder. Keep this for the next firing.", by: "Wim Crouwel · 12 Nov", x: 19.4, y: 22.2 },
      { text: "The shadow is too hard on the left. Reshoot with the diffuser.", by: "Cipe Pineles · 14 Nov", x: 56, y: 53.3 },
      { text: "Use this one for the catalogue cover.", by: "Karl Gerstner · 19 Nov", x: 81.3, y: 16.7 },
    ],
  },
  {
    id: "celadon-bowl", title: "Celadon bowl", tags: ["stoneware", "bowl", "celadon"], maker: "Thrown by Wim Crouwel · 18 cm",
    src: "/media/ceramics/celadon-bowl.webp", alt: "A wide speckled celadon bowl on a pale grey backdrop", notes: [],
  },
  {
    id: "black-bottle", title: "Black bottle", tags: ["stoneware", "vase", "matte"], maker: "Thrown by Karl Gerstner · 24 cm",
    src: "/media/ceramics/black-bottle.webp", alt: "A narrow-necked matte black stoneware bottle on an off-white backdrop",
    notes: [{ text: "The matte black holds the light well. Try one from above.", by: "Karl Gerstner · 17 Nov", x: 52, y: 38 }],
  },
  {
    id: "speckled-cups", title: "Speckled cups, set of four", tags: ["stoneware", "set"], maker: "Thrown by Cipe Pineles · 9 cm each",
    src: "/media/ceramics/speckled-cups.webp", alt: "Four small speckled oatmeal cups in a row on a warm wooden ledge", notes: [],
  },
  {
    id: "terracotta-jug", title: "Terracotta jug", tags: ["stoneware", "matte"], maker: "Thrown by Wim Crouwel · 21 cm",
    src: "/media/ceramics/terracotta-jug.webp", alt: "A small terracotta jug with a loop handle against a pale blue wall", notes: [],
  },
  {
    id: "moon-jar", title: "Moon jar", tags: ["stoneware", "vase"], maker: "Thrown by Karl Gerstner · 32 cm",
    src: "/media/ceramics/moon-jar.webp", alt: "A round white moon jar with a short neck on a dark taupe backdrop",
    notes: [
      { text: "The slight lean at the rim is part of it. Keep it in frame.", by: "Wim Crouwel · 15 Nov", x: 46, y: 22 },
      { text: "Lift it on the riser so the foot reads.", by: "Cipe Pineles · 16 Nov", x: 50, y: 80 },
    ],
  },
  {
    id: "cobalt-plate", title: "Cobalt plate", tags: ["stoneware", "celadon"], maker: "Thrown by Cipe Pineles · 26 cm",
    src: "/media/ceramics/cobalt-plate.webp", alt: "A cobalt blue glazed plate seen from above on a cream backdrop", notes: [],
  },
  {
    id: "stacked-bowls", title: "Stacked bowls", tags: ["stoneware", "bowl", "set"], maker: "Thrown by Wim Crouwel · 15 cm",
    src: "/media/ceramics/stacked-bowls.webp", alt: "Five stoneware bowls stacked, glazes running from oatmeal to dark green", notes: [],
  },
  {
    id: "oatmeal-teapot", title: "Oatmeal teapot", tags: ["stoneware", "matte"], maker: "Thrown by Karl Gerstner · 19 cm",
    src: "/media/ceramics/oatmeal-teapot.webp", alt: "An oatmeal glazed teapot with a cane handle on a warm sand backdrop", notes: [],
  },
];

const FOLDERS = [
  { label: "All images", count: 248 },
  { label: "Autumn collection", count: 36 },
  { label: "Glaze tests", count: 58 },
  { label: "Workshop", count: 91 },
  { label: "Exhibitions", count: 63 },
];
const TAGS = ["stoneware", "matte", "celadon", "vase", "bowl", "set"];

const noteCount = (n: number) => (n === 1 ? "1 note" : `${n} notes`);

/* ── Screen ─────────────────────────────────────────────────────────────── */

export default function ImageLibraryExample() {
  const { effects } = useAppearance();
  const glass = effects === "on" ? fx("glass") : undefined;
  const [folder, setFolder] = useState("Autumn collection");
  const [tags, setTags] = useState<string[]>(["stoneware"]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("tall-vase");
  const [added, setAdded] = useState<Record<string, Note[]>>({});
  const [activeNote, setActiveNote] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<{ x: number; y: number } | null>(null);
  const noteInput = useRef<HTMLInputElement>(null);

  const notesOf = (p: Piece) => [...p.notes, ...(added[p.id] ?? [])];
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PIECES.filter(
      (p) =>
        tags.every((t) => p.tags.includes(t)) &&
        (!q || p.title.toLowerCase().includes(q) || notesOf(p).some((n) => n.text.toLowerCase().includes(q))),
    );
    // notesOf reads `added`, which is listed.
  }, [tags, query, added]);
  const selected = PIECES.find((p) => p.id === selectedId)!;
  const notes = notesOf(selected);

  const subtitle =
    tags.length === 1 && tags[0] === "stoneware" && !query
      ? "12 of 36 tagged stoneware"
      : tags.length
        ? `${visible.length} tagged ${tags.join(" and ")}`
        : `${visible.length} of 36`;

  const select = (id: string) => {
    setSelectedId(id);
    setActiveNote(null);
    setPending(null);
  };
  const toggleTag = (tag: string) => setTags((ts) => (ts.includes(tag) ? ts.filter((t) => t !== tag) : [...ts, tag]));

  // A pointer shortcut onto the picture: it places a pin and hands off to the
  // note field, which is the path that works without a pointer too.
  const placePin = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button")) return;
    const r = event.currentTarget.getBoundingClientRect();
    setPending({ x: ((event.clientX - r.left) / r.width) * 100, y: ((event.clientY - r.top) / r.height) * 100 });
    setActiveNote(null);
    noteInput.current?.focus();
  };
  const addNote = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const note: Note = { text, by: "You · 23 Nov", ...(pending ?? {}) };
    setAdded((a) => ({ ...a, [selected.id]: [...(a[selected.id] ?? []), note] }));
    setDraft("");
    setPending(null);
    setActiveNote(notes.length);
  };

  return (
    <div
      role="region"
      aria-label="Image library example"
      className="@container flex h-full w-full overflow-hidden bg-base font-body text-ink-primary"
    >
      {/* ── Sidebar ── */}
      <nav aria-label="Archive" className="flex w-50 shrink-0 flex-col gap-lg border-e border-edge-subtle bg-elevated p-md">
        <div className="flex h-8 items-center px-sm">
          <span className="text-label-md">Studio Archive</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <h4 className="px-sm py-xs text-label-sm text-ink-muted">Folders</h4>
          <ul className="flex flex-col gap-0.5">
            {FOLDERS.map((f) => {
              const isCurrent = f.label === folder;
              return (
                <li key={f.label}>
                  <button
                    type="button"
                    aria-current={isCurrent ? "page" : undefined}
                    onClick={() => setFolder(f.label)}
                    className={cn(
                      "flex h-7 w-full cursor-pointer items-center justify-between rounded-md px-sm text-left",
                      "transition-[background-color] duration-(--ui-duration-fast) ease-(--ui-ease-out)",
                      isCurrent ? "bg-sunken text-label-md" : "text-body-sm font-regular text-ink-secondary hover:bg-hover",
                    )}
                  >
                    {f.label}
                    <span className={cn("text-label-sm tabular-nums text-ink-muted", !isCurrent && "font-regular")}>{f.count}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="flex flex-col gap-sm">
          <h4 className="px-sm pt-xs text-label-sm text-ink-muted">Tags</h4>
          <div role="group" aria-label="Filter by tag" className="flex flex-wrap gap-1.5 px-sm">
            {TAGS.map((tag) => (
              <Button
                key={tag}
                variant="ghost"
                size="sm"
                shape="full"
                aria-pressed={tags.includes(tag)}
                onClick={() => toggleTag(tag)}
                className="px-2.5 aria-pressed:bg-emphasis aria-pressed:text-ink-on-emphasis not-aria-pressed:bg-sunken not-aria-pressed:text-ink-primary"
              >
                {tag}
              </Button>
            ))}
          </div>
        </div>
      </nav>

      {/* ── Grid ── */}
      <div className="flex min-w-0 flex-1 flex-col gap-3.5 overflow-hidden px-5 pt-lg">
        <div className="flex shrink-0 items-center justify-between gap-md">
          <div className="flex min-w-0 flex-col @min-[1100px]:flex-row @min-[1100px]:items-baseline @min-[1100px]:gap-sm">
            <h3 className="truncate text-body-lg font-bold">Autumn collection</h3>
            <p aria-live="polite" className="truncate text-body-sm font-regular text-ink-muted">{subtitle}</p>
          </div>
          <div className="flex shrink-0 gap-sm">
            <Input
              label="Search images"
              isLabelHidden
              size="sm"
              type="search"
              placeholder="Search names and notes"
              icon={<Search aria-hidden />}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-48 @min-[1100px]:w-50"
            />
            <Button variant="primary" size="md">Upload</Button>
          </div>
        </div>

        {visible.length === 0 ? (
          <p className="py-2xl text-center text-body-sm text-ink-muted">No images match. Clear a tag to see more.</p>
        ) : (
          <ul aria-label="Images" className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] content-start gap-lg pb-lg">
            {visible.map((p) => {
              const isSelected = p.id === selected.id;
              const count = notesOf(p).length;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    aria-current={isSelected || undefined}
                    onClick={() => select(p.id)}
                    className="group flex w-full cursor-pointer flex-col gap-sm rounded-md text-left focus-visible:outline-offset-4"
                  >
                    <AspectRatio
                      className={cn(
                        // The hairline sits OVER the picture, so it is drawn by a
                        // pseudo-element; an inset shadow would paint under it.
                        "aspect-[3/2] after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:ring after:ring-inset after:ring-edge-subtle",
                        isSelected && "ring-thick ring-ink-primary ring-offset-2 ring-offset-base",
                      )}
                    >
                      <img src={p.src} alt={p.alt} width={IMG.width} height={IMG.height} loading="lazy" decoding="async" />
                      {count > 0 && (
                        <Badge variant="unselected" className={cn("absolute end-sm top-sm border-transparent bg-surface text-ink-primary tabular-nums", glass)}>
                          {noteCount(count)}
                        </Badge>
                      )}
                    </AspectRatio>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-label-md">{p.title}</span>
                      <span className="truncate text-label-sm font-regular text-ink-muted">{p.tags.join(" · ")}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ── Detail panel ── */}
      <aside aria-label={selected.title} className="flex w-75 shrink-0 flex-col gap-lg border-s border-edge-subtle bg-surface p-lg">
        <div className="-mx-sm flex min-h-0 flex-1 flex-col gap-lg overflow-hidden px-sm">
          <AspectRatio className="aspect-[3/2] shrink-0 cursor-crosshair">
            <div onClick={placePin} className="relative size-full">
              <img src={selected.src} alt={selected.alt} width={IMG.width} height={IMG.height} decoding="async" className="size-full object-cover" />
              {notes.map((n, i) =>
                n.x === undefined || n.y === undefined ? null : (
                  <Button
                    key={i}
                    variant="secondary"
                    size="sm"
                    shape="full"
                    aria-label={`Note ${i + 1}: ${n.text}`}
                    aria-pressed={activeNote === i}
                    onClick={() => setActiveNote(activeNote === i ? null : i)}
                    style={{ insetInlineStart: `${n.x}%`, top: `${n.y}%` }}
                    className={cn(
                      "absolute w-6 -translate-1/2 cursor-pointer justify-center bg-surface px-0 text-ink-primary tabular-nums shadow-md ring-transparent",
                      "aria-pressed:ring-thick aria-pressed:ring-ink-primary",
                      glass,
                    )}
                  >
                    {i + 1}
                  </Button>
                ),
              )}
              {pending && (
                <span
                  aria-hidden
                  style={{ insetInlineStart: `${pending.x}%`, top: `${pending.y}%` }}
                  className="absolute flex size-6 -translate-1/2 items-center justify-center rounded-full bg-emphasis text-label-sm text-ink-on-emphasis shadow-md"
                >
                  {notes.length + 1}
                </span>
              )}
            </div>
          </AspectRatio>

          <div className="flex flex-col gap-0.5">
            <p className="text-body-lg font-bold">{selected.title}</p>
            <p className="text-body-sm font-regular text-ink-muted">{selected.maker}</p>
          </div>

          <div className="flex flex-col gap-sm">
            <h4 className="text-label-sm text-ink-muted">Tags</h4>
            <div className="flex flex-wrap gap-1.5">
              {selected.tags.map((t) => (
                <Badge key={t} variant="neutral" className="border-transparent px-2.5 text-ink-primary">{t}</Badge>
              ))}
              <Button variant="secondary" size="sm" shape="full" className="px-2.5">Add tag</Button>
            </div>
          </div>

          <div className="flex min-h-0 flex-col gap-2.5">
            <h4 className="text-label-sm text-ink-muted">Notes</h4>
            {notes.length === 0 ? (
              <p className="text-body-sm font-regular text-ink-muted">No notes yet. Click the picture to pin one.</p>
            ) : (
              <ol className="flex flex-col gap-2.5">
                {notes.map((n, i) => (
                  <li
                    key={i}
                    className={cn(
                      "-mx-sm flex gap-2.5 rounded-md px-sm py-0.5",
                      "transition-[background-color] duration-(--ui-duration-fast) ease-(--ui-ease-out)",
                      activeNote === i && "bg-elevated",
                    )}
                  >
                    <span className="w-4 shrink-0 text-label-md tabular-nums">{i + 1}</span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-body-sm font-regular">{n.text}</span>
                      <span className="text-label-sm font-regular text-ink-muted">{n.by}</span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        <form onSubmit={addNote} className="shrink-0">
          <Input
            ref={noteInput}
            label="Add a note"
            isLabelHidden
            size="sm"
            placeholder="Click the image to add a note"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setPending(null);
            }}
          />
        </form>
      </aside>
    </div>
  );
}
