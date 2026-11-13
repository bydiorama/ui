import { ChatSources } from "@/ui/chat-sources";

export function Example() {
  return (
    <ChatSources.Provider
      sources={[
        {
          id: "guide",
          kind: "libraryItem",
          title: "Component guide",
          origin: "Diorama UI",
          excerpt: "Compose components from source you own.",
          href: "/docs/",
        },
        {
          id: "tokens",
          kind: "file",
          title: "Brand tokens",
          origin: "Project library",
          excerpt: "Shared colours, spacing and type roles.",
          href: "/components/",
        },
      ]}
      labels={{
        openSource: "Open source",
        previousSource: "Previous source",
        nextSource: "Next source",
        unavailable: "Unavailable",
      }}
    >
      <div className="specimen-stack w-full">
        <p className="text-body-sm">
          Built from the shared system{" "}
          <ChatSources.Citation sourceIds={["guide"]} />
        </p>
        <ChatSources label="Project sources" defaultIsOpen />
      </div>
    </ChatSources.Provider>
  );
}
