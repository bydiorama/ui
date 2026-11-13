import { SiteHeader } from "@/ui/site-header";

export function Example() {
  return (
    <SiteHeader
      className="w-full rounded-md"
      brand={{ label: "Studio", href: "/" }}
      items={[
        { label: "Work", href: "/components/", isCurrent: true },
        { label: "About", href: "/docs/" },
      ]}
      cta={{ label: "Get started", href: "/docs/" }}
      navLabel="Studio preview"
      collapseBelow="32rem"
    />
  );
}
