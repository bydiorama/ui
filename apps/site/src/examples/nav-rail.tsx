import { NavRail } from "@/ui/nav-rail";
import { Home, Folder, Settings } from "griddy-icons";

export function Example() {
  return (
    <NavRail label="App navigation" className="rounded-md">
      <NavRail.Section label="Workspace">
        <NavRail.Item
          label="Overview"
          icon={<Home />}
          href="/components/nav-rail/"
          isCurrent
        />
        <NavRail.Item label="Projects" icon={<Folder />} href="/components/" />
        <NavRail.Item label="Settings" icon={<Settings />} href="/docs/" />
      </NavRail.Section>
    </NavRail>
  );
}
