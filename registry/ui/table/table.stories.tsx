import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Inbox, MoreVertical } from "griddy-icons";

import {
  resolveThemePair,
  toStyleObject,
  THEME_ZERO,
  ZERO_AUTHORED,
  type ThemeSeed,
} from "@bydiorama/tokens";

import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { EmptyState } from "../empty-state/empty-state.tsx";
import { Table, type TableColumn, type TableSort } from "./table.tsx";

interface Designer {
  id: string;
  name: string;
  discipline: string;
  status: "Active" | "Pending" | "Archived";
  year: number;
}

const DESIGNERS: Designer[] = [
  { id: "tschichold", name: "Jan Tschichold", discipline: "Asymmetric typography", status: "Active", year: 1928 },
  { id: "muller-brockmann", name: "Josef Müller-Brockmann", discipline: "Grid systems", status: "Active", year: 1961 },
  { id: "marconi", name: "Guglielmo Marconi", discipline: "Radio telegraphy", status: "Pending", year: 1895 },
  { id: "crouwel", name: "Wim Crouwel", discipline: "New Alphabet", status: "Pending", year: 1967 },
  { id: "frutiger", name: "Adrian Frutiger", discipline: "Univers", status: "Active", year: 1957 },
  { id: "aicher", name: "Otl Aicher", discipline: "Munich pictograms", status: "Active", year: 1972 },
  { id: "vignelli", name: "Massimo Vignelli", discipline: "Subway signage", status: "Archived", year: 1972 },
  { id: "biro", name: "László Bíró", discipline: "Ballpoint pen", status: "Archived", year: 1938 },
];

const STATUS_VARIANT = {
  Active: "success",
  Pending: "warning",
  Archived: "unselected",
} as const;

const status = (designer: Designer) => (
  <Badge variant={STATUS_VARIANT[designer.status]}>{designer.status}</Badge>
);

const actions = (designer: Designer) => (
  <Button
    isIconOnly
    variant="ghost"
    size="sm"
    aria-label={`Actions for ${designer.name}`}
    icon={<MoreVertical />}
    onClick={fn()}
  />
);

/** The sheet's anatomy lanes at md: 48 · flex · 260 · 132 · 96 · 56. */
const COLUMNS: TableColumn<Designer>[] = [
  { key: "name", header: "Name", isSortable: true, cell: (row) => row.name },
  { key: "discipline", header: "Discipline", width: 260, cell: (row) => row.discipline },
  { key: "status", header: "Status", width: 132, cell: status },
  { key: "year", header: "Year", width: 96, isNumeric: true, cell: (row) => row.year },
  { key: "actions", header: "Actions", isHeaderHidden: true, width: 56, align: "end", cell: actions },
];

/** Narrower, for the states matrix: no discipline lane to spare. */
const SHORT_COLUMNS: TableColumn<Designer>[] = [
  { key: "name", header: "Name", isSortable: true, cell: (row) => row.name },
  { key: "status", header: "Status", width: 132, cell: status },
  { key: "year", header: "Year", width: 96, isNumeric: true, cell: (row) => row.year },
];

const EMPTY = (
  <EmptyState
    icon={<Inbox />}
    title="No designers match this filter"
    description="Clear the status filter to see all 24 records."
    action={
      <Button variant="secondary" size="md" shape="full" onClick={fn()}>
        Clear Filter
      </Button>
    }
  />
);

const meta = {
  title: "UI/Table",
  component: Table<Designer>,
  parameters: { layout: "padded" },
  args: {
    caption: "Designers",
    columns: COLUMNS,
    rows: DESIGNERS.slice(0, 3),
    getRowId: (row: Designer) => row.id,
  },
} satisfies Meta<typeof Table<Designer>>;

export default meta;
type Story = StoryObj<typeof meta>;

const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-sm">
    <span className="text-caption text-ink-muted">{label}</span>
    {children}
  </div>
);

/**
 * Live selection and live sort, because the sheet can only draw them at rest.
 * Selection is held here rather than by the Table for the same reason every
 * example should: the caller owns the data, and sorting is what proves it.
 */
export const Playground: Story = {
  render: function Playground() {
    const [selectedIds, setSelectedIds] = useState<string[]>(["frutiger"]);
    const [sort, setSort] = useState<TableSort | null>({
      columnKey: "name",
      direction: "ascending",
    });

    const rows = [...DESIGNERS].sort((a, b) => {
      if (!sort) return 0;
      const key = sort.columnKey as keyof Designer;
      const order = a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0;
      return sort.direction === "ascending" ? order : -order;
    });

    return (
      <Table
        caption="Designers"
        columns={COLUMNS}
        rows={rows}
        getRowId={(row) => row.id}
        isSelectable
        getRowLabel={(row) => `Select ${row.name}`}
        selectAllLabel="Select all designers"
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        sort={sort}
        onSortChange={setSort}
        isRowDisabled={(row) => row.id === "biro"}
      />
    );
  },
};

/**
 * The sheet's Sizes section, in its order and with its own annotations.
 *
 * Density moves five things and the lane system is not one of them — the three
 * tables below declare identical column widths.
 */
export const Matrix: Story = {
  render: () => (
    <div className="flex flex-col gap-2xl">
      <Section label="sm · row 36 · inline 12 · body-sm 13">
        <Table
          size="sm"
          caption="Designers, small"
          columns={COLUMNS}
          rows={DESIGNERS.slice(0, 3)}
          getRowId={(row) => row.id}
          isSelectable
          getRowLabel={(row) => `Select ${row.name}`}
          selectAllLabel="Select all designers, small"
          defaultSort={{ columnKey: "name", direction: "descending" }}
        />
      </Section>
      <Section label="md · row 44 · inline 16 · body-md 14 — the default">
        <Table
          caption="Designers, medium"
          columns={COLUMNS}
          rows={DESIGNERS.slice(0, 3)}
          getRowId={(row) => row.id}
          isSelectable
          getRowLabel={(row) => `Select ${row.name}`}
          selectAllLabel="Select all designers, medium"
          defaultSort={{ columnKey: "name", direction: "descending" }}
        />
      </Section>
      <Section label="lg · row 56 · inline 24 · body-lg 16">
        <Table
          size="lg"
          caption="Designers, large"
          columns={COLUMNS}
          rows={DESIGNERS.slice(0, 3)}
          getRowId={(row) => row.id}
          isSelectable
          getRowLabel={(row) => `Select ${row.name}`}
          selectAllLabel="Select all designers, large"
          defaultSort={{ columnKey: "name", direction: "descending" }}
        />
      </Section>
    </div>
  ),
};

/**
 * The sheet's Row States and Data States, which is everything a screenshot of
 * a resting table cannot show.
 *
 * Hover and press are live rather than drawn: the sheet paints them the same
 * value, which is the defect this story exists to make visible.
 */
export const States: Story = {
  render: function States() {
    const [selectedIds, setSelectedIds] = useState<string[]>(["frutiger", "aicher"]);
    return (
      <div className="flex flex-col gap-2xl">
        <Section label="rows — hover one, hold it down, tab into the checkboxes">
          <Table
            caption="Designers, row states"
            columns={SHORT_COLUMNS}
            rows={DESIGNERS}
            getRowId={(row) => row.id}
            isSelectable
            getRowLabel={(row) => `Select ${row.name}`}
            selectAllLabel="Select all designers"
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            isRowDisabled={(row) => row.id === "biro"}
          />
        </Section>
        <Section label="header — the sort indicator is latent until the column is asked about">
          <Table
            caption="Designers, sorted descending"
            columns={SHORT_COLUMNS}
            rows={DESIGNERS.slice(0, 3)}
            getRowId={(row) => row.id}
            isSelectable
            getRowLabel={(row) => `Select ${row.name}`}
            selectAllLabel="Select all designers, sorted"
            defaultSort={{ columnKey: "name", direction: "descending" }}
          />
        </Section>
        <Section label="loading — the frame never collapses, and aria-busy is on the body">
          <Table
            caption="Designers, loading"
            columns={SHORT_COLUMNS}
            rows={[]}
            getRowId={(row) => row.id}
            isSelectable
            getRowLabel={(row) => `Select ${row.name}`}
            selectAllLabel="Select all designers, loading"
            isLoading
          />
        </Section>
        <Section label="empty — the header stays, the body carries the recovery">
          <Table
            caption="Designers, no matches"
            columns={SHORT_COLUMNS}
            rows={[]}
            getRowId={(row) => row.id}
            isSelectable
            getRowLabel={(row) => `Select ${row.name}`}
            selectAllLabel="Select all designers, empty"
            empty={EMPTY}
          />
        </Section>
        <Section label="no selection lane — the primary column opens the row">
          <Table
            caption="Designers, read only"
            columns={SHORT_COLUMNS}
            rows={DESIGNERS.slice(0, 3)}
            getRowId={(row) => row.id}
          />
        </Section>
        <Section label="emphasis moved — the year lane is primary, the name is not">
          {/*
            `isPrimary` defaults by position, and the override existed in the
            type and in no story. A prop nobody can see is a prop nobody
            checks.
          */}
          <Table
            caption="Designers, emphasis moved"
            columns={[
              { ...SHORT_COLUMNS[0]!, isPrimary: false },
              SHORT_COLUMNS[1]!,
              { ...SHORT_COLUMNS[2]!, isPrimary: true },
            ]}
            rows={DESIGNERS.slice(0, 3)}
            getRowId={(row) => row.id}
          />
        </Section>
      </div>
    );
  },
};

const STRESS_BRAND: ThemeSeed = {
  colors: {
    bg: "#fffdf5",
    surface: "#ffffff",
    muted: "#f4ecd8",
    textPrimary: "#1a1400",
    textMuted: "#6b5d3f",
    border: "rgba(26, 20, 0, 0.12)",
    accent: "#ffe066",
  },
};

/**
 * Selection is the only place this component spends colour, so it is the only
 * place a hostile brand can break it. Both panels show a selected row.
 */
export const BrandThemed: Story = {
  render: () => {
    const zero = toStyleObject(resolveThemePair(THEME_ZERO, { authored: ZERO_AUTHORED }));
    const brand = toStyleObject(resolveThemePair(STRESS_BRAND));
    const Panel = ({ style, title }: { style: React.CSSProperties; title: string }) => (
      <div style={style} className="flex-1 rounded-lg bg-base p-xl">
        <p className="pb-md text-caption text-ink-muted">{title}</p>
        <Table
          caption={`Designers — ${title}`}
          columns={SHORT_COLUMNS}
          rows={DESIGNERS.slice(0, 4)}
          getRowId={(row) => row.id}
          isSelectable
          getRowLabel={(row) => `Select ${row.name}`}
          selectAllLabel={`Select all designers — ${title}`}
          defaultSelectedIds={["marconi"]}
          defaultSort={{ columnKey: "name", direction: "ascending" }}
        />
      </div>
    );
    return (
      <div className="flex gap-xl">
        <Panel style={zero as React.CSSProperties} title="theme zero" />
        <Panel style={brand as React.CSSProperties} title="stress brand" />
      </div>
    );
  },
};
