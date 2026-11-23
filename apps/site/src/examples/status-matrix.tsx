import { StatusMatrix } from "@/ui/status-matrix";

export function Example() {
  return (
    <div className="specimen-row">
      {(["thinking", "working", "done", "failed"] as const).map((status) => (
        <div key={status} className="specimen-stack">
          <StatusMatrix status={status} label={status} />
          <span className="text-caption text-ink-muted">{status}</span>
        </div>
      ))}
    </div>
  );
}
