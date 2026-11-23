import { useState } from "react";
import { fx } from "@/lib/fx";
import { Button } from "@/ui/button";

export function Example({ hasEffects = false }: { hasEffects?: boolean }) {
  const [isSaved, setIsSaved] = useState(false);
  return <div className="specimen-row"><Button className={hasEffects ? fx("grain") : undefined} onClick={() => setIsSaved(true)}>{isSaved ? "Saved" : "Save changes"}</Button><Button variant="outline" onClick={() => setIsSaved(false)}>Discard</Button><span className="sr-only" role="status">{isSaved ? "Changes saved" : "Ready to edit"}</span></div>;
}
