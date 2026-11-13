import { DatePicker } from "@/ui/date-picker";

export function Example() { return <DatePicker label="Choose a date" defaultValue={new Date(2026, 10, 12)} formatValue={date => new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(date)} />; }
