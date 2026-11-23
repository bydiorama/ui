import { AspectRatio } from "@/ui/aspect-ratio";

// A placeholder ground in the theme's own two colours, the same pair every
// gradient on the site is drawn from, so it follows brand and scheme.
export function Example() {
  return (
    <AspectRatio
      ratio="landscape"
      className="w-full overflow-hidden rounded-md bg-linear-to-br from-base to-accent"
    >
      <div role="img" aria-label="A gradient placeholder in a 4:3 frame" className="size-full" />
    </AspectRatio>
  );
}
