import { ArrowUpRight, Close, Menu } from "griddy-icons";
import { Button } from "@/ui/button";
import { Sheet } from "@/ui/sheet";
import { Sidebar } from "@/ui/sidebar";

type Link = { label: string; href: string; isCurrent?: boolean; isExternal?: boolean };

/**
 * The phone's navigation: the library's own mobile composition, a Sidebar
 * filling a Sheet from the trigger's side. `w-full rounded-none` on the rail
 * because the panel already gives both (the Sheet story's note). Without
 * JavaScript the trigger does nothing, and the footer's links remain.
 */
export function MobileNav({ links }: { links: Link[] }) {
  return (
    <Sheet>
      <Sheet.Trigger render={<Button variant="secondary" size="lg" shape="full" isIconOnly aria-label="Menu" className="mobile-nav-trigger" icon={<Menu aria-hidden="true" />} />} />
      <Sheet.Panel label="Site navigation" side="right" size="sm">
        <Sidebar label="Site navigation" isLabelHidden className="mobile-nav-rail h-full w-full rounded-none">
          <Sidebar.Group>
            <a href="/" className="mobile-nav-home">Diorama UI</a>
            <Sheet.Close render={<Button variant="ghost" size="sm" isIconOnly aria-label="Close menu" icon={<Close />} />} />
          </Sidebar.Group>
          {links.map(link => (
            <Sidebar.Item key={link.href} href={link.href} isCurrent={link.isCurrent ?? false} {...(link.isExternal ? { trailing: <ArrowUpRight aria-hidden="true" /> } : {})}>{link.label}</Sidebar.Item>
          ))}
        </Sidebar>
      </Sheet.Panel>
    </Sheet>
  );
}
