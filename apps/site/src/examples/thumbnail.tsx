import { useState } from "react";
import { Thumbnail } from "@/ui/thumbnail";
import { Button } from "@/ui/button";

export function Example() {
  const [hasImage, setHasImage] = useState(true);
  return hasImage ? (
    <Thumbnail
      src="/media/grid-study.svg"
      alt="Geometric grid study"
      onRemove={() => setHasImage(false)}
      removeLabel="Remove grid study"
    />
  ) : (
    <Button variant="outline" onClick={() => setHasImage(true)}>
      Restore image
    </Button>
  );
}
