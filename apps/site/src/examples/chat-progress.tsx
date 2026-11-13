import { ChatProgress } from "@/ui/chat-progress";

export function Example() {
  return (
    <ChatProgress
      form="steps"
      label="Preparing your project"
      className="w-full"
      steps={[
        { id: "read", label: "Read the brief", status: "done" },
        { id: "draft", label: "Draft the layout", status: "current" },
        { id: "review", label: "Check the details", status: "pending" },
      ]}
    />
  );
}
