import { Slider } from "@/ui/slider";

export function Example() {
  return (
    <Slider
      label="Logo size"
      defaultValue={62}
      hasValueText
      className="w-full"
    />
  );
}
