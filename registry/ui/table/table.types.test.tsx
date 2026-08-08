/**
 * Compile-time assertions. Run by `tsc --noEmit`: an `@ts-expect-error` that
 * stops erroring fails the build, so these are as binding as a runtime test.
 */
import { Table, type TableColumn } from "./table.tsx";

interface Designer {
  id: string;
  name: string;
  year: number;
}

const ROWS: Designer[] = [{ id: "a", name: "Jan Tschichold", year: 1928 }];

const COLUMNS: TableColumn<Designer>[] = [
  { key: "name", header: "Name", cell: (row) => row.name },
  { key: "year", header: "Year", width: 96, isNumeric: true, cell: (row) => row.year },
];

const base = { caption: "Designers", columns: COLUMNS, rows: ROWS, getRowId: (row: Designer) => row.id };

export function SelectionRequiresItsLabels() {
  return (
    <>
      {/* A row checkbox with no accessible name announces as "checkbox", and
          eight of them announce as eight of those. Both labels are required
          the moment selection is on.
          NOTE: the directive must lead its comment — TS only reads it on the
          first line, so a block comment that opens with prose is not a
          directive at all and the error escapes as a build failure. */}
      {/* @ts-expect-error — selection without its labels. */}
      <Table {...base} isSelectable />
      {/* @ts-expect-error — getRowLabel alone is not enough; the header box needs naming too. */}
      <Table {...base} isSelectable getRowLabel={(row) => `Select ${row.name}`} />
      <Table
        {...base}
        isSelectable
        getRowLabel={(row) => `Select ${row.name}`}
        selectAllLabel="Select all designers"
      />
    </>
  );
}

export function SelectionPropsNeedSelection() {
  return (
    <>
      {/* @ts-expect-error — a selection callback on a table with no select lane can never fire. The union says so rather than the docs saying so. */}
      <Table {...base} onSelectionChange={() => {}} />
      {/* @ts-expect-error — same for the labels: they name controls that do not exist. */}
      <Table {...base} selectAllLabel="Select all" />
    </>
  );
}

export function CaptionIsRequired() {
  return (
    <>
      {/* @ts-expect-error — an unnamed table announces as "table". */}
      <Table columns={COLUMNS} rows={ROWS} getRowId={(row) => row.id} />
      <Table {...base} />
    </>
  );
}

export function ColumnsAreDirectional() {
  return (
    <>
      <Table
        {...base}
        // @ts-expect-error — `start`/`end`, never `left`/`right` (§10).
        columns={[{ key: "year", header: "Year", align: "right", cell: (row: Designer) => row.year }]}
      />
      <Table
        {...base}
        columns={[{ key: "year", header: "Year", align: "end", cell: (row: Designer) => row.year }]}
      />
    </>
  );
}

export function ColumnHeadersAreStrings() {
  return (
    <Table
      {...base}
      columns={[
        {
          key: "name",
          // @ts-expect-error — the header is the accessible name of every cell
          // beneath it; a <th> full of markup announces the markup.
          header: <strong>Name</strong>,
          cell: (row: Designer) => row.name,
        },
      ]}
    />
  );
}

export function TheRowTypeFlowsThrough() {
  return (
    <Table
      {...base}
      columns={[
        {
          key: "name",
          header: "Name",
          // @ts-expect-error — `discipline` is not on Designer. The generic is
          // the point: a column that reads a field the row does not have is a
          // compile error, not a blank cell.
          cell: (row: Designer) => row.discipline,
        },
      ]}
    />
  );
}

export function ThereIsNoRowActivation() {
  return (
    // @ts-expect-error — deliberately absent. An activatable row makes this a
    // grid, which means APG grid navigation rather than one more prop. Named
    // `onRowActivate` rather than a DOM event, so the directive cannot be
    // satisfied by HTMLAttributes.
    <Table {...base} onRowActivate={() => {}} />
  );
}
