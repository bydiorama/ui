import { useState } from "react";
import { Check, Copy } from "griddy-icons";
import { IconSwap } from "@/ui/icon-swap";
import { Button } from "@/ui/button";

export function Example() {
  const [isCopied, setIsCopied] = useState(false);
  return (
    <Button
      variant="secondary"
      icon={<IconSwap icons={{ copy: <Copy />, check: <Check /> }} show={isCopied ? "check" : "copy"} />}
      onClick={() => setIsCopied((copied) => !copied)}
    >
      {isCopied ? "Copied" : "Copy link"}
    </Button>
  );
}
