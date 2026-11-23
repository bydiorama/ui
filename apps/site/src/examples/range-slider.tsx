import { RangeSlider } from "@/ui/range-slider";

export function Example() {
  return (
    <RangeSlider
      label="Budget range"
      startThumbLabel="Minimum budget"
      endThumbLabel="Maximum budget"
      defaultValue={[20, 80]}
      hasValueText
      className="w-full"
    />
  );
}
