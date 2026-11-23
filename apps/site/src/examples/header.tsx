import { Header } from "@/ui/header";
import { Avatar } from "@/ui/avatar";

export function Example() {
  return (
    <Header className="w-full rounded-md">
      <Header.Start>
        <Header.Nav label="Workspace preview">
          <Header.Item href="/components/header/" isCurrent>
            Workspace
          </Header.Item>
        </Header.Nav>
      </Header.Start>
      <Header.Spacer />
      <Header.End>
        <Avatar name="Alex Kim" size="sm" />
      </Header.End>
    </Header>
  );
}
