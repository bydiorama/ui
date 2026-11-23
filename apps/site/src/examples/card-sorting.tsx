import { CardSorting } from "@/ui/card-sorting";

export function Example() {
  return (
    <CardSorting label="Project priorities" className="w-full">
      {["Research", "Design", "Build"].map((label) => (
        <CardSorting.Item key={label} id={label} label={label}>
          <CardSorting.Handle />
          <span>{label}</span>
        </CardSorting.Item>
      ))}
    </CardSorting>
  );
}
