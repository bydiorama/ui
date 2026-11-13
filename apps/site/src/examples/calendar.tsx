import { Calendar } from "@/ui/calendar";

export function Example() {
  return (
    <Calendar
      label="Project deadline"
      defaultMonth={new Date(2026, 10, 1)}
      defaultValue={new Date(2026, 10, 18)}
      today={new Date(2026, 10, 13)}
      className="w-full max-w-80 p-sm"
    />
  );
}
