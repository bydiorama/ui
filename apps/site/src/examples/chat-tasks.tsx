import { ChatTasks } from "@/ui/chat-tasks";

export function Example() {
  return (
    <ChatTasks
      status="running"
      label="Build the project"
      count="1 of 3"
      className="w-full"
      statusLabels={{
        done: "Done",
        current: "In progress",
        pending: "Pending",
      }}
      tasks={[
        { id: "brief", label: "Read the brief", status: "done" },
        { id: "draft", label: "Draft the layout", status: "current" },
        { id: "review", label: "Review the details", status: "pending" },
      ]}
    />
  );
}
