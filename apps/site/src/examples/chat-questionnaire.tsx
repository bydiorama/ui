import { useState } from "react";
import { ChatQuestionnaire } from "@/ui/chat-questionnaire";
import { Button } from "@/ui/button";

const options = [
  { id: "warm", label: "Warm and personal" },
  { id: "direct", label: "Clear and direct" },
];
export function Example() {
  const [answer, setAnswer] = useState<string>();
  return (
    <div className="specimen-stack w-full">
      <ChatQuestionnaire
        question="Which tone fits your project?"
        options={options}
        {...(answer ? { answer } : {})}
        onSubmitAction={(values) =>
          setAnswer(options.find((option) => option.id === values[0])?.label)
        }
      />
      {answer && (
        <Button variant="outline" onClick={() => setAnswer(undefined)}>
          Choose again
        </Button>
      )}
    </div>
  );
}
