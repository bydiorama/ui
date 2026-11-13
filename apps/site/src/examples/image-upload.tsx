import { useState } from "react";
import { ImageUpload } from "@/ui/image-upload";

export function Example() {
  const [names, setNames] = useState<string[]>([]);
  return (
    <div className="specimen-stack w-full">
      <ImageUpload
        label="Project images"
        accept="image/*"
        isMultiple
        helperText="Choose an image or drop it here."
        onSelect={(files) => setNames(files.map((file) => file.name))}
      />
      <p className="text-caption text-ink-muted" role="status">
        {names.length ? `Selected: ${names.join(", ")}` : "No images selected"}
      </p>
    </div>
  );
}
