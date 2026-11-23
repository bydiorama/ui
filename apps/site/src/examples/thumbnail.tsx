import { useState } from "react";
import { Thumbnail } from "@/ui/thumbnail";
import { Button } from "@/ui/button";

export function Example() {
  const [hasImage, setHasImage] = useState(true);
  return hasImage ? (
    <Thumbnail
      src="/media/gradient.svg"
      alt="A gradient placeholder"
      onRemove={() => setHasImage(false)}
      removeLabel="Remove image"
    />
  ) : (
    <Button variant="outline" onClick={() => setHasImage(true)}>
      Restore image
    </Button>
  );
}
