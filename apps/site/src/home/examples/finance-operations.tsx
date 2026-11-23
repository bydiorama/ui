import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bank,
  ChartBar,
  CheckDouble,
  Download,
  Home,
  Receipt,
  Search,
  Users,
} from "griddy-icons";

import { cn } from "@/lib/cn";
import { fx, sweep } from "@/lib/fx";
import { Badge, type BadgeVariant } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card } from "@/ui/card";
import { Input } from "@/ui/input";
import { NavRail } from "@/ui/nav-rail";
import { Progress } from "@/ui/progress";
import { Table, type TableColumn } from "@/ui/table";

import { useAppearance } from "../../lib/use-appearance";

/* ── Sample data (Paper: "Example — Finance operations") ─────────────────── */

type Status = "overdue" | "dueSoon" | "open" | "paid";

interface Invoice {
  id: string;
  client: string;
  due: string;
  amount: string;
  status: Status;
  /** The panel's badge: how far past or before its due date it is. */
  timing: string;
  issued: string;
  owner: string;
  vat: string;
  lines: [string, string][];
  activity: [string, string][];
}

const INVOICES: Invoice[] = [
  {
    id: "2026-0412", client: "Müller-Brockmann Druck GmbH", due: "20 Oct", amount: "12,480.00", status: "overdue",
    timing: "34 days overdue", issued: "20 Sep 2026", owner: "Cipe Pineles", vat: "1,992.61",
    lines: [["Catalogue print, 4,000 pcs", "8,200.00"], ["Paper upgrade", "1,640.00"], ["Delivery, two sites", "647.39"]],
    activity: [["Second reminder sent", "18 Nov"], ["Client promised payment", "04 Nov"], ["First reminder sent", "27 Oct"], ["Invoice sent", "20 Sep"]],
  },
  {
    id: "2026-0418", client: "Crouwel Studio BV", due: "02 Nov", amount: "6,200.00", status: "overdue",
    timing: "21 days overdue", issued: "03 Oct 2026", owner: "Wim Crouwel", vat: "989.92",
    lines: [["Studio retainer, October", "4,168.06"], ["Exhibition graphics", "1,042.02"]],
    activity: [["First reminder sent", "09 Nov"], ["Invoice viewed", "06 Oct"], ["Invoice sent", "03 Oct"]],
  },
  {
    id: "2026-0431", client: "Vignelli Trading S.r.l.", due: "25 Nov", amount: "18,900.00", status: "dueSoon",
    timing: "Due in 2 days", issued: "26 Oct 2026", owner: "Karl Gerstner", vat: "3,017.65",
    lines: [["Showroom fit-out, phase 2", "11,117.65"], ["Signage set", "3,494.12"], ["Installation", "1,270.58"]],
    activity: [["Invoice viewed", "29 Oct"], ["Invoice sent", "26 Oct"]],
  },
  {
    id: "2026-0433", client: "Frutiger & Söhne AG", due: "27 Nov", amount: "3,150.00", status: "dueSoon",
    timing: "Due in 4 days", issued: "28 Oct 2026", owner: "Cipe Pineles", vat: "502.94",
    lines: [["Type licence renewal", "2,647.06"]],
    activity: [["Invoice sent", "28 Oct"]],
  },
  {
    id: "2026-0436", client: "Tschichold Papier KG", due: "04 Dec", amount: "9,740.50", status: "open",
    timing: "Due in 11 days", issued: "04 Nov 2026", owner: "Wim Crouwel", vat: "1,555.21",
    lines: [["Uncoated stock, 12 pallets", "6,957.50"], ["Freight", "1,227.79"]],
    activity: [["Invoice viewed", "05 Nov"], ["Invoice sent", "04 Nov"]],
  },
  {
    id: "2026-0437", client: "Pineles Editions SARL", due: "08 Dec", amount: "22,000.00", status: "open",
    timing: "Due in 15 days", issued: "08 Nov 2026", owner: "Karl Gerstner", vat: "3,512.61",
    lines: [["Monograph print run", "13,865.54"], ["Binding, cloth", "4,621.85"]],
    activity: [["Invoice sent", "08 Nov"]],
  },
  {
    id: "2026-0439", client: "Gerstner Logistik AG", due: "11 Dec", amount: "4,860.00", status: "open",
    timing: "Due in 18 days", issued: "11 Nov 2026", owner: "Cipe Pineles", vat: "775.97",
    lines: [["Warehouse labels", "2,450.42"], ["Courier, November", "1,633.61"]],
    activity: [["Invoice sent", "11 Nov"]],
  },
  {
    id: "2026-0440", client: "Jacquard Textil s.r.o.", due: "15 Dec", amount: "1,290.00", status: "open",
    timing: "Due in 22 days", issued: "15 Nov 2026", owner: "Wim Crouwel", vat: "205.97",
    lines: [["Linen samples", "1,084.03"]],
    activity: [["Invoice sent", "15 Nov"]],
  },
  {
    id: "2026-0398", client: "Lovelace Systems Ltd", due: "12 Nov", amount: "15,300.00", status: "paid",
    timing: "Paid 10 Nov", issued: "13 Oct 2026", owner: "Karl Gerstner", vat: "2,442.86",
    lines: [["Data platform licence", "10,285.71"], ["Onboarding days", "2,571.43"]],
    activity: [["Payment received", "10 Nov"], ["Invoice sent", "13 Oct"]],
  },
  {
    id: "2026-0391", client: "Bíró Instruments Kft.", due: "06 Nov", amount: "7,425.00", status: "paid",
    timing: "Paid 05 Nov", issued: "07 Oct 2026", owner: "Cipe Pineles", vat: "1,185.50",
    lines: [["Calibration service", "4,118.07"], ["Spare probes", "2,121.43"]],
    activity: [["Payment received", "05 Nov"], ["Invoice sent", "07 Oct"]],
  },
  {
    id: "2026-0388", client: "Marconi Elettronica S.p.A.", due: "03 Nov", amount: "30,100.00", status: "paid",
    timing: "Paid 31 Oct", issued: "04 Oct 2026", owner: "Wim Crouwel", vat: "4,805.88",
    lines: [["Control units, 40 pcs", "22,764.71"], ["Commissioning", "2,529.41"]],
    activity: [["Payment received", "31 Oct"], ["Invoice sent", "04 Oct"]],
  },
];

const STATUS: Record<Status, { label: string; variant: BadgeVariant }> = {
  overdue: { label: "Overdue", variant: "danger" },
  dueSoon: { label: "Due soon", variant: "warning" },
  open: { label: "Open", variant: "neutral" },
  paid: { label: "Paid", variant: "success" },
};

type Filter = "all" | "open" | "overdue" | "paid" | "draft";
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "overdue", label: "Overdue" },
  { value: "paid", label: "Paid" },
  { value: "draft", label: "Draft" },
];
const matchesFilter = (status: Status, filter: Filter) =>
  filter === "all" ||
  (filter === "open" && (status === "open" || status === "dueSoon")) ||
  (filter === "overdue" && status === "overdue") ||
  (filter === "paid" && status === "paid");

const NAV = [
  { label: "Overview", icon: <Home aria-hidden /> },
  { label: "Receivables", icon: <ArrowDownLeft aria-hidden />, count: "42" },
  { label: "Payables", icon: <ArrowUpRight aria-hidden />, count: "17" },
  { label: "Bank accounts", icon: <Bank aria-hidden /> },
  { label: "Reconciliation", icon: <CheckDouble aria-hidden /> },
  { label: "Clients", icon: <Users aria-hidden /> },
  { label: "VAT returns", icon: <Receipt aria-hidden /> },
  { label: "Reports", icon: <ChartBar aria-hidden /> },
];

/** Thousands of euros. November collected (96.4) is 19% over October (81.0). */
const MONTHS = [
  { month: "Jun", invoiced: 62.8, collected: 56.1 },
  { month: "Jul", invoiced: 71.7, collected: 65.0 },
  { month: "Aug", invoiced: 85.2, collected: 70.6 },
  { month: "Sep", invoiced: 78.5, collected: 75.1 },
  { month: "Oct", invoiced: 96.4, collected: 81.0 },
  { month: "Nov", invoiced: 88.6, collected: 96.4 },
];
const CHART_MAX = 100;

/** Receivables by age. The fills are the data roles; over 30 days is the danger ink. */
const AGES = [
  { label: "Not yet due", value: 152_570, fill: "bg-data-cat-1-solid" },
  { label: "1 to 30 days late", value: 21_300, fill: "bg-data-cat-2-solid" },
  { label: "Over 30 days late", value: 10_450, fill: "bg-danger" },
];

const euro = (n: number) => n.toLocaleString("en-GB");

/** The panel's bands sit on the scale the design draws: 13px rows, 12px muted labels. */
const SECTION_LABEL = "text-label-sm text-ink-muted";

/* ── Screen ─────────────────────────────────────────────────────────────── */

export default function FinanceOperationsExample() {
  const { effects } = useAppearance();
  const [current, setCurrent] = useState("Receivables");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("2026-0412");
  const [paid, setPaid] = useState<string[]>([]);
  const [reminded, setReminded] = useState<string[]>([]);
  const recordRef = useRef<HTMLElement>(null);

  // Recording a payment is the one state change the screen keeps.
  const invoices = useMemo(
    () => INVOICES.map((inv) => (paid.includes(inv.id) ? { ...inv, status: "paid" as const, timing: "Paid 23 Nov" } : inv)),
    [paid],
  );
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return invoices.filter(
      (inv) => matchesFilter(inv.status, filter) && (!q || inv.client.toLowerCase().includes(q) || inv.id.includes(q)),
    );
  }, [invoices, filter, query]);
  const selected = invoices.find((inv) => inv.id === selectedId) ?? invoices[0]!;

  const columns: TableColumn<Invoice>[] = [
    { key: "id", header: "Invoice", width: 104, isPrimary: false, cell: (inv) => <span className="text-ink-muted">{inv.id}</span> },
    {
      key: "client",
      header: "Client",
      isPrimary: true,
      cell: (inv) => {
        const isSelected = inv.id === selected.id;
        return (
          <button
            type="button"
            aria-current={isSelected || undefined}
            onClick={() => setSelectedId(inv.id)}
            className={cn(
              // The whole row is the target: the pseudo-element covers it, and
              // the row's own ring draws focus where the reader is looking.
              "block w-full cursor-pointer truncate text-left text-ink-primary",
              "after:absolute after:inset-0 after:content-['']",
              "focus-visible:outline-none focus-visible:after:outline-focus focus-visible:after:-outline-offset-2 focus-visible:after:outline-edge-focus",
              isSelected ? "font-bold" : "font-regular",
            )}
          >
            {inv.client}
          </button>
        );
      },
    },
    {
      key: "due",
      header: "Due",
      width: 84,
      cell: (inv) => (
        <span className={inv.status === "overdue" ? "text-danger" : inv.status === "paid" ? "text-ink-muted" : "text-ink-primary"}>
          {inv.due}
        </span>
      ),
    },
    { key: "amount", header: "Amount", width: 100, isNumeric: true, cell: (inv) => <span className="text-ink-primary">{inv.amount}</span> },
    {
      key: "status",
      header: "Status",
      width: 96,
      cell: (inv) => <Badge variant={STATUS[inv.status].variant}>{STATUS[inv.status].label}</Badge>,
    },
  ];

  const isPaid = selected.status === "paid";
  const wasReminded = reminded.includes(selected.id);
  const activity: [string, string][] = [
    ...(paid.includes(selected.id) ? [["Payment recorded", "23 Nov"] as [string, string]] : []),
    ...(wasReminded ? [["Reminder sent", "23 Nov"] as [string, string]] : []),
    ...selected.activity,
  ].slice(0, 4);

  return (
    <div
      role="region"
      aria-label="Finance operations example"
      className="@container flex h-full w-full overflow-hidden bg-base font-body text-ink-primary"
    >
      {/* Full sidebar where there is room for it; the library's rail below. */}
      <nav aria-label="Finance" className="hidden w-50 shrink-0 flex-col gap-lg border-e border-edge-subtle bg-elevated p-md @min-[1100px]:flex">
        <div className="flex h-8 items-center gap-sm px-sm">
          <span className="text-label-md">Aicher Werkstatt</span>
        </div>
        <ul className="flex flex-col gap-0.5">
          {NAV.map((item) => {
            const isCurrent = item.label === current;
            return (
              <li key={item.label}>
                <button
                  type="button"
                  aria-current={isCurrent ? "page" : undefined}
                  onClick={() => setCurrent(item.label)}
                  className={cn(
                    "flex h-7 w-full cursor-pointer items-center justify-between rounded-md px-sm text-left",
                    "transition-[background-color] duration-(--ui-duration-fast) ease-(--ui-ease-out)",
                    isCurrent ? "bg-sunken text-label-md text-ink-primary" : "text-body-sm font-regular text-ink-secondary hover:bg-hover",
                  )}
                >
                  {item.label}
                  {item.count && <span className={cn("text-label-sm tabular-nums text-ink-muted", !isCurrent && "font-regular")}>{item.count}</span>}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="flex flex-col gap-1.5 rounded-md border border-edge-subtle bg-surface p-2.5">
          <Progress label="Q4 close" value={17} max={25} size="xs" className="gap-1.5 [&_[data-slot=progress-label]]:text-label-sm" />
          <span className="text-label-sm font-regular text-ink-muted">17 of 25 tasks done</span>
        </div>
      </nav>
      <NavRail label="Finance" className="shrink-0 rounded-none border-e border-edge-subtle @min-[1100px]:hidden">
        <NavRail.Section label="Finance">
          {NAV.map((item) => (
            <NavRail.Item key={item.label} icon={item.icon} label={item.label} isCurrent={item.label === current} onClick={() => setCurrent(item.label)} />
          ))}
        </NavRail.Section>
      </NavRail>

      {/* ── Main ── */}
      <div className="flex min-w-0 flex-1 flex-col gap-3.5 overflow-hidden px-5 pt-lg">
        <div className="flex items-center justify-between gap-md">
          <h3 className="text-body-lg font-bold">Receivables</h3>
          <div className="flex gap-sm">
            <Button variant="secondary" size="md" icon={<Download aria-hidden />}>Export</Button>
            <Button variant="secondary" size="md">New invoice</Button>
          </div>
        </div>

        <div className="flex h-54 shrink-0 gap-sm">
          <CollectedCard />
          <AgeCard />
        </div>

        <div className="flex shrink-0 items-center justify-between gap-md">
          <div role="group" aria-label="Filter by status" className="flex gap-0.5">
            {FILTERS.map((f) => (
              <Button
                key={f.value}
                variant="ghost"
                size="md"
                aria-pressed={filter === f.value}
                onClick={() => setFilter(f.value)}
                className="px-2.5 aria-pressed:bg-sunken aria-pressed:text-ink-primary not-aria-pressed:text-ink-muted"
              >
                {f.label}
              </Button>
            ))}
          </div>
          <Input
            label="Search invoices"
            isLabelHidden
            size="sm"
            type="search"
            placeholder="Client or invoice number"
            icon={<Search aria-hidden />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-55 shrink"
          />
        </div>

        <Table
          caption="Receivables"
          size="sm"
          columns={columns}
          rows={rows}
          getRowId={(inv) => inv.id}
          empty={<p className="py-lg text-center text-body-sm text-ink-muted">{filter === "draft" ? "No drafts. Invoices you start and don't send wait here." : "No invoices match."}</p>}
          className={cn(
            "shrink-0",
            // Denser than sm's 36px, as drawn: 32px rows.
            "[&_[data-slot=table-row]]:relative [&_[data-slot=table-row]]:h-8",
            "[&_[data-slot=table-row]:hover>[data-slot=table-cell]]:bg-hover",
            "[&_[data-slot=table-row]:has([aria-current=true])>[data-slot=table-cell]]:bg-sunken",
          )}
        />
      </div>

      {/* ── Invoice panel ── */}
      <aside
        aria-label={`Invoice ${selected.id}`}
        className="flex w-68 shrink-0 flex-col gap-lg border-s border-edge-subtle bg-surface p-lg @min-[1100px]:w-75"
      >
        <div className="flex min-h-0 flex-1 flex-col gap-lg overflow-hidden">
          <div className="flex flex-col gap-xs">
            <div className="flex items-center justify-between gap-sm">
              <span className="text-label-sm font-regular tabular-nums text-ink-muted">Invoice {selected.id}</span>
              <Badge variant={STATUS[selected.status].variant}>{selected.timing}</Badge>
            </div>
            <p className="truncate text-body-lg font-bold">{selected.client}</p>
            <p className="text-figure tabular-nums">€ {selected.amount}</p>
          </div>

          <dl className="flex flex-col gap-1.5 text-body-sm font-regular">
            <Fact term="Issued">{selected.issued}</Fact>
            <Fact term="Terms">30 days net</Fact>
            <Fact term="Owner">{selected.owner}</Fact>
            <Fact term="VAT">19% · € {selected.vat}</Fact>
          </dl>

          <ul aria-label="Lines" className="flex flex-col rounded-md bg-elevated px-2.5 py-xs text-body-sm font-regular">
            {selected.lines.map(([label, amount]) => (
              <li key={label} className="flex h-7 items-center justify-between gap-sm">
                <span className="truncate">{label}</span>
                <span className="tabular-nums">{amount}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-sm">
            <h4 className={SECTION_LABEL}>Activity</h4>
            <ul className="flex flex-col gap-sm text-body-sm font-regular">
              {activity.map(([what, when]) => (
                <li key={what + when} className="flex justify-between gap-sm">
                  <span>{what}</span>
                  <span className="tabular-nums text-ink-muted">{when}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex shrink-0 gap-sm">
          <Button
            ref={recordRef}
            variant="primary"
            size="md"
            isDisabled={isPaid}
            className={cn("min-w-0 flex-1", effects === "on" && fx("sheen"))}
            onClick={() => {
              setPaid((ids) => [...ids, selected.id]);
              if (effects === "on" && recordRef.current) sweep(recordRef.current);
            }}
          >
            {isPaid ? "Paid" : "Record payment"}
          </Button>
          <Button
            variant="secondary"
            size="md"
            isDisabled={isPaid || wasReminded}
            className="min-w-0 flex-1"
            onClick={() => setReminded((ids) => [...ids, selected.id])}
          >
            {wasReminded ? "Reminder sent" : "Send reminder"}
          </Button>
        </div>
      </aside>
    </div>
  );
}

function Fact({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-sm">
      <dt className="text-ink-muted">{term}</dt>
      <dd className="tabular-nums">{children}</dd>
    </div>
  );
}

/* ── Charts ─────────────────────────────────────────────────────────────── */

const CARD = "min-w-0 gap-md rounded-md bg-surface px-lg py-3.5 shadow-none";

function LegendKey({ fill, children }: { fill: string; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden className={cn("size-2 shrink-0 rounded-[2px]", fill)} />
      {children}
    </span>
  );
}

/**
 * Invoiced against collected, six months. Library Chart's smallest frame is a
 * 160px plot under a legend, axis and table toggle; this card has 112px for
 * the whole figure, so the bars are drawn here on the same data roles.
 */
function CollectedCard() {
  const summary = MONTHS.map((m) => `${m.month} ${m.invoiced} and ${m.collected}`).join(", ");
  return (
    <Card surface="outlined" aria-label="Invoiced and collected" className={cn(CARD, "flex-1")}>
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center justify-between gap-md">
          <span className="text-label-sm font-regular text-ink-muted">Collected in November</span>
          <div className="flex gap-md text-label-sm font-regular text-ink-muted">
            <LegendKey fill="bg-data-cat-1-bg">Invoiced</LegendKey>
            <LegendKey fill="bg-data-cat-1-solid">Collected</LegendKey>
          </div>
        </div>
        <div className="flex items-baseline gap-sm">
          <span className="text-figure tabular-nums">€ 96,400</span>
          <span className="text-label-sm text-success">19% more than October</span>
        </div>
      </div>

      <figure className="flex min-h-0 flex-1 flex-col gap-xs">
        <div
          role="img"
          aria-label={`Invoiced and collected by month, thousands of euros: ${summary}.`}
          className="relative min-h-0 flex-1"
        >
          <span aria-hidden className="absolute inset-x-0 top-0 border-t border-edge-subtle" />
          <span aria-hidden className="absolute inset-x-0 top-1/2 border-t border-edge-subtle" />
          <div aria-hidden className="absolute inset-0 flex items-end justify-around border-b border-edge-default">
            {MONTHS.map((m) => (
              <div key={m.month} className="flex h-full items-end gap-0.5">
                <span className="w-3.5 rounded-t-sm bg-data-cat-1-bg" style={{ height: `${(m.invoiced / CHART_MAX) * 100}%` }} />
                <span className="w-3.5 rounded-t-sm bg-data-cat-1-solid" style={{ height: `${(m.collected / CHART_MAX) * 100}%` }} />
              </div>
            ))}
          </div>
        </div>
        <div aria-hidden className="flex justify-around text-label-sm font-regular text-ink-muted">
          {MONTHS.map((m) => (
            <span key={m.month} className="w-8 text-center">{m.month}</span>
          ))}
        </div>
      </figure>
    </Card>
  );
}

/**
 * Outstanding receivables split by age. Meter measures ONE value against a
 * range; a split of a whole into parts is composed here on the same track.
 */
function AgeCard() {
  const total = AGES.reduce((sum, a) => sum + a.value, 0);
  return (
    <Card surface="outlined" aria-label="Receivables by age" className={cn(CARD, "w-62 shrink-0")}>
      <div className="flex flex-col gap-0.5">
        <span className="text-label-sm font-regular text-ink-muted">Outstanding</span>
        <span className="text-figure tabular-nums">€ {euro(total)}</span>
      </div>
      <div
        role="img"
        aria-label={AGES.map((a) => `${a.label} € ${euro(a.value)}`).join(", ")}
        className="flex h-2 shrink-0 gap-0.5"
      >
        {AGES.map((a) => (
          <span key={a.label} className={cn("h-full rounded-full", a.fill)} style={{ flexGrow: a.value, flexBasis: 0 }} />
        ))}
      </div>
      <ul className="flex flex-col gap-1.5 text-body-sm font-regular">
        {AGES.map((a) => (
          <li key={a.label} className="flex justify-between gap-sm">
            <LegendKey fill={a.fill}>{a.label}</LegendKey>
            <span className="tabular-nums">{euro(a.value)}</span>
          </li>
        ))}
      </ul>
      <p className="text-label-sm font-regular text-ink-muted">Clients pay in 27 days on average, 3 days faster than in Q3.</p>
    </Card>
  );
}
