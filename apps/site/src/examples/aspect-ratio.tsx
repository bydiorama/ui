import { AspectRatio } from "@/ui/aspect-ratio";

export function Example() {
  return (
    <AspectRatio
      ratio="landscape"
      className="w-full overflow-hidden rounded-md bg-surface"
    >
      <img
        src="/media/grid-study.svg"
        alt="Abstract study of circles and a square on a grid"
        className="h-full w-full object-cover"
      />
    </AspectRatio>
  );
}
