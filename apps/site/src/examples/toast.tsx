import { Toast, useToast } from "@/ui/toast";
import { Button } from "@/ui/button";

function Notify() {
  const toast = useToast();
  return (
    <Button
      variant="outline"
      onClick={() =>
        toast.add({
          title: "Draft saved",
          description: "Your changes are ready to review.",
          type: "success",
        })
      }
    >
      Create toast
    </Button>
  );
}
export function Example() {
  return (
    <Toast.Provider>
      <Notify />
      <Toast.Viewport
        label="Preview notifications"
        dismissLabel="Dismiss notification"
      />
    </Toast.Provider>
  );
}
