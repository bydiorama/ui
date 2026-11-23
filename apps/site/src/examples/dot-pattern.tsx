import { DotPattern } from "@/ui/dot-pattern";

export function Example() {
  return (
    <div className="relative h-40 w-full overflow-hidden rounded-md bg-surface">
      <DotPattern gap={16} />
      <span className="relative flex h-full items-center justify-center text-label-md">
        Space to create
      </span>
    </div>
  );
}
