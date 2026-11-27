import { useState } from "react";
import { Count } from "@/ui/count";
import { Button } from "@/ui/button";

export function Example() {
  const [orders, setOrders] = useState(1249);
  return (
    <div className="flex items-center gap-md">
      <Count value={orders} className="text-title-lg text-ink-primary" />
      <Button variant="secondary" onClick={() => setOrders((n) => n + 1)}>
        New order
      </Button>
    </div>
  );
}
