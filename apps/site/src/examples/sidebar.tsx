import { Sidebar } from "@/ui/sidebar";
import { Home, Folder } from "griddy-icons";

export function Example() {
  return (
    <Sidebar label="Workspace navigation" className="w-full rounded-md">
      <Sidebar.Main>
        <Sidebar.Section label="Workspace">
          <Sidebar.Item href="/components/sidebar/" icon={<Home />} isCurrent>
            Overview
          </Sidebar.Item>
          <Sidebar.Item href="/components/" icon={<Folder />}>
            Projects
          </Sidebar.Item>
        </Sidebar.Section>
      </Sidebar.Main>
    </Sidebar>
  );
}
