import { useState } from "react";
import { TextSwap } from "@/ui/text-swap";
import { Button } from "@/ui/button";

export function Example() {
  const [isSaved, setIsSaved] = useState(false);
  return (
    <Button onClick={() => setIsSaved((saved) => !saved)}>
      <TextSwap>{isSaved ? "Saved" : "Save changes"}</TextSwap>
    </Button>
  );
}
