import { Search } from "griddy-icons";
import { Input } from "@/ui/input";

export function Example() {
  return <Input label="Name or email" isLabelHidden placeholder="Name or email" size="md" icon={<Search />} className="specimen-field" />;
}
