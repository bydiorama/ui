import { fx } from "@/lib/fx";
import { Switch } from "@/ui/switch";

export function Example({ hasEffects = false }: { hasEffects?: boolean }) { return <div className="specimen-row"><Switch className={hasEffects ? fx("glow") : undefined} defaultIsChecked isLabelHidden>Enable notifications</Switch><Switch className={hasEffects ? fx("glow") : undefined} isLabelHidden>Enable reminders</Switch></div>; }
