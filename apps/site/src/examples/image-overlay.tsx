import { ImageOverlay } from "@/ui/image-overlay";

export function Example() {
  return (
    <ImageOverlay
      src="/media/grid-study.svg"
      alt="Abstract geometric grid study"
      ratio="landscape"
      className="w-full"
    >
      <ImageOverlay.Title>Grid study</ImageOverlay.Title>
      <ImageOverlay.Description>
        Shape, rhythm and space
      </ImageOverlay.Description>
    </ImageOverlay>
  );
}
