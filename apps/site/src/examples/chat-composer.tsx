import { useState } from "react";
import { ChatComposer } from "@/ui/chat-composer";

export function Example() {
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");
  return (
    <div className="specimen-stack w-full">
      <ChatComposer
        label="Message the assistant"
        placeholder="Describe your next project…"
        sendLabel="Send message"
        stopLabel="Stop response"
        value={value}
        onValueChange={setValue}
        onSubmitAction={(text) => {
          setMessage(`Sent: ${text}`);
          setValue("");
        }}
      />
      <p className="text-caption text-ink-muted" role="status">
        {message || "Write a message to try the composer."}
      </p>
    </div>
  );
}
