import { ChatMessage } from "@/ui/chat-message";

export function Example() {
  return (
    <div className="specimen-stack w-full">
      <ChatMessage.Sender>Can we simplify this layout?</ChatMessage.Sender>
      <ChatMessage.Receiver meta="Studio assistant">
        Start with a clear heading, then give each section more room.
      </ChatMessage.Receiver>
    </div>
  );
}
