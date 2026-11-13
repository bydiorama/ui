import { Banner } from "@/ui/banner";
import { CheckCircle } from "griddy-icons";

export function Example() {
  return (
    <Banner variant="success" icon={<CheckCircle />} title="Ready to share">
      Your project is saved and up to date.
    </Banner>
  );
}
