import { Meter } from "@/ui/meter";

export function Example() {
  return (
    <div className="specimen-stack w-full">
      <Meter label="Storage used" value={64} valueText="64 of 100 GB" />
      <Meter
        label="Monthly budget"
        value={72}
        shape="radial"
        valueText="72% used"
      />
    </div>
  );
}
