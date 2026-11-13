import { ChatWidget } from "@/ui/chat-widget";
import { Badge } from "@/ui/badge";
import { FileText } from "griddy-icons";

export function Example() {
  return (
    <ChatWidget className="w-full">
      <ChatWidget.Header
        name="Project brief"
        icon={<FileText />}
        chip={<Badge>Draft</Badge>}
      />
      <ChatWidget.Body scrollLabel="Project brief draft">
        <p>
          A simple workspace for collecting ideas and turning them into finished
          work.
        </p>
      </ChatWidget.Body>
      <ChatWidget.Caption>Ready for your feedback</ChatWidget.Caption>
    </ChatWidget>
  );
}
