import { RadioGroup, Radio } from "@/ui/radio";

export function Example() {
  return (
    <RadioGroup label="Project access" defaultValue="team">
      <Radio value="team" description="Everyone in your workspace">
        Team
      </Radio>
      <Radio value="private" description="Only people you invite">
        Private
      </Radio>
    </RadioGroup>
  );
}
