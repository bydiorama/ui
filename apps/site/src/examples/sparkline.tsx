import { Sparkline } from "@/ui/sparkline";

export function Example() { return <Sparkline label="Projects over time" description="Projects rise overall, with a small dip in the middle." data={[12, 20, 16, 29, 25, 36]} variant="column" hasEndMarker={false} />; }
