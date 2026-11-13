import { ImageEdit } from "@/ui/image-edit";

export function Example() {
  return (
    <ImageEdit
      src="/media/grid-study.svg"
      alt="Abstract geometric grid study"
      defaultZoom={120}
      hasRotation
      className="w-full"
    />
  );
}
