/** Compile-time contract tests. `tsc --noEmit` is the runner. */

import { Toast, useToast, type ToastManager, type ToastOptions } from "./toast.tsx";

export function Valid() {
  const manager: ToastManager = useToast();
  manager.add({ title: "Draft saved" });
  manager.add({ description: "Carries the announcement alone" });
  manager.add({
    id: "save-status",
    type: "success",
    title: "Brand kit exported",
    description: "Grid systems — Josef Müller-Brockmann, 1961",
    timeout: 0,
    priority: "high",
    action: { label: "Undo", onClick: () => {} },
    onClose: () => {},
    onRemove: () => {},
  });
  manager.close();
  manager.close("save-status");
  manager.update("save-status", { title: "Saved again" });
  void manager.promise(Promise.resolve("ok"), {
    loading: "Exporting…",
    success: (value: string) => `Exported ${value}`,
    error: { title: "Export failed", priority: "high" },
  });

  return (
    <Toast.Provider limit={3}>
      <Toast.Viewport label="Notifications" dismissLabel="Dismiss" />
      <Toast.Viewport
        label="Notifications"
        dismissLabel="Dismiss"
        container={null}
        className="bottom-lg"
      />
    </Toast.Provider>
  );
}

export function Invalid() {
  const manager = useToast();

  // The landmark and the close control both need names — required, not defaulted.
  return (
    <>
      {/* @ts-expect-error the viewport landmark requires a label */}
      <Toast.Viewport dismissLabel="Dismiss" />
      {/* @ts-expect-error every close button requires an accessible name */}
      <Toast.Viewport label="Notifications" />
      {/* @ts-expect-error the viewport renders the stack itself — no children */}
      <Toast.Viewport label="Notifications" dismissLabel="Dismiss">
        <div />
      </Toast.Viewport>

      {(() => {
        // `error` is Base UI's internal promise() name; this library's vocabulary
        // is `danger` (CONVENTIONS §2, shared with Banner and Button).
        // @ts-expect-error use type "danger", not "error"
        manager.add({ title: "Export failed", type: "error" });

        // An action must carry both halves — a label alone renders a button
        // that does nothing, an onClick alone renders one nobody can name.
        // @ts-expect-error an action requires onClick
        manager.add({ title: "Saved", action: { label: "Undo" } });
        // @ts-expect-error an action requires a label
        manager.add({ title: "Saved", action: { onClick: () => {} } });

        // Promise messages update ONE toast the promise owns.
        void manager.promise(Promise.resolve(1), {
          loading: "Working…",
          // @ts-expect-error a promise message cannot re-key the toast
          success: { id: "other-toast", title: "Done" },
          error: "Failed",
        });

        const options: ToastOptions = { title: "Saved" };
        return options;
      })()}
    </>
  );
}
