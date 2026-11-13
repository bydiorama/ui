import { Skeleton } from "@/ui/skeleton";

export function Example() {
  return (
    <div
      className="flex w-full items-center gap-lg"
      role="status"
      aria-label="Loading profile"
    >
      <Skeleton className="size-12 shrink-0 rounded-full" />
      <div className="flex flex-1 flex-col gap-sm">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}
