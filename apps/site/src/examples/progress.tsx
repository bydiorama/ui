import { fx } from "@/lib/fx";
import { Progress } from "@/ui/progress";

export function Example({ hasEffects = false }: { hasEffects?: boolean }) { return <Progress label="Reviewed" value={2} max={3} className={`specimen-field ${hasEffects ? fx("sheen") : ""}`} size="sm" />; }
