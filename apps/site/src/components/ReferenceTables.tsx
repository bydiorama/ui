import { useId, useState } from "react";
import { ChevronDown } from "griddy-icons";
import { Button } from "@/ui/button";
import { Table, type TableColumn } from "@/ui/table";
import type { Item } from "../lib/catalog";

type PropRow = Item["docs"]["props"][string] & { name: string };
export function PropsTable({ title, props }: { title: string; props: Item["docs"]["props"] }) {
  const id = useId();
  const noteId = (name: string) => `${id}-${encodeURIComponent(name)}`;
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const columns: TableColumn<PropRow>[] = [
    { key: "name", header: "Prop", cell: row => <div className="prop-heading"><code className="prop-name" data-composite={/\s/.test(row.name) || undefined}>{row.name}</code>{row.notes && <Button
      variant="ghost" size="sm" shape="soft" isIconOnly
      className="prop-disclosure" aria-label={`${row.name} details`}
      aria-expanded={expanded.has(row.name)}
      aria-controls={expanded.has(row.name) ? noteId(row.name) : undefined}
      onClick={() => setExpanded(current => {
        const next = new Set(current);
        if (next.has(row.name)) next.delete(row.name); else next.add(row.name);
        return next;
      })}
      icon={<ChevronDown aria-hidden="true" />}
    />}</div> },
    { key: "type", header: "Type", cell: row => <><span className="mobile-cell-label" aria-hidden="true">Type</span><code>{row.type ?? "—"}</code></> },
    { key: "default", header: "Default", cell: row => <><span className="mobile-cell-label" aria-hidden="true">Default</span><code>{String(row.default ?? "—")}</code></> },
  ];
  return <Table caption={`${title} props`} className="reference-table props-table table-scroll" size="sm" columns={columns} rows={Object.entries(props).map(([name, prop]) => ({ name, ...prop }))} getRowId={row => row.name}
    rowDetails={row => expanded.has(row.name) && row.notes ? <div className="prop-note" id={noteId(row.name)}><p>{row.notes}</p></div> : null}
  />;
}

type KeyRow = { key: string; does: string };
const keyColumns: TableColumn<KeyRow>[] = [
  { key: "key", header: "Key", width: 120, cell: row => row.key },
  { key: "does", header: "What happens", cell: row => row.does },
];
export function KeyboardTable({ title, rows }: { title: string; rows: KeyRow[] }) {
  return <Table caption={`${title} keyboard shortcuts`} className="reference-table keyboard-table" size="sm" columns={keyColumns} rows={rows} getRowId={row => row.key} />;
}
