import { ImageOverlay } from "@/ui/image-overlay";

export function Example() {
  return (
    <ImageOverlay
      src="/media/gradient.svg"
      alt="A gradient placeholder from warm white to light blue"
      ratio="landscape"
      className="w-full"
    >
      <ImageOverlay.Title>Placeholder</ImageOverlay.Title>
      <ImageOverlay.Description>
        A gradient, standing in for a picture
      </ImageOverlay.Description>
    </ImageOverlay>
  );
}
