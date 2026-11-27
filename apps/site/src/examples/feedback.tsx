import { useState } from "react";
import { SuccessCheck, useShake } from "@/ui/feedback";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";

export function Example() {
  const { ref, shake } = useShake<HTMLInputElement>();
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "wrong" | "right">("idle");
  return (
    <form
      className="flex w-72 flex-col items-start gap-sm"
      onSubmit={(event) => {
        event.preventDefault();
        if (code === "1234") setState("right");
        else {
          setState("wrong");
          shake();
        }
      }}
    >
      <Input
        ref={ref}
        label="Verification code (try 1234)"
        value={code}
        onChange={(event) => {
          setCode(event.target.value);
          setState("idle");
        }}
        {...(state === "wrong" ? { errorText: "That code is not right." } : {})}
      />
      <div className="flex items-center gap-md">
        <Button type="submit">Verify</Button>
        {state === "right" && (
          <span className="flex items-center gap-xs text-label-md text-ink-primary">
            <SuccessCheck /> Verified
          </span>
        )}
      </div>
    </form>
  );
}
