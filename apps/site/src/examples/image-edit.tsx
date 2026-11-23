import { ImageEdit } from "@/ui/image-edit";

export function Example() {
  return (
    <ImageEdit
      src="/media/gradient.svg"
      alt="A gradient placeholder from warm white to light blue"
      defaultZoom={120}
      hasRotation
      className="w-full"
    />
  );
}
