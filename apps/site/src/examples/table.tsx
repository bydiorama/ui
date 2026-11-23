import { useState } from "react";
import { Table, type TableColumn, type TableSort } from "@/ui/table";

const projects = [
  { name: "Brand guidelines", owner: "Alex", stage: "Review" },
  { name: "Website", owner: "Sam", stage: "In progress" },
  { name: "Launch assets", owner: "Jo", stage: "Ready" },
];
type Project = (typeof projects)[number];
const columns: TableColumn<Project>[] = [
  { key: "name", header: "Project", isSortable: true, cell: row => row.name },
  { key: "owner", header: "Owner", width: 72, cell: row => row.owner },
  { key: "stage", header: "Stage", width: 104, cell: row => row.stage },
];
export function Example() {
  const [sort, setSort] = useState<TableSort | null>(null);
  const rows = sort ? [...projects].sort((a, b) => a.name.localeCompare(b.name) * (sort.direction === "ascending" ? 1 : -1)) : projects;
  return <Table caption="Project overview" className="w-full min-w-0" size="sm" minWidth={340} columns={columns} rows={rows} getRowId={row => row.name} sort={sort} onSortChange={setSort} />;
}
