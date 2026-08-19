"use client";

import { Toast as BaseToast } from "@base-ui/react/toast";
import { AlertCircle, AlertTriangle, CheckCircle, Close, InfoCircle } from "griddy-icons";
import { useMemo, type ComponentPropsWithoutRef, type HTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/cn";
import { motionMicro, motionStandard } from "@/lib/motion";
import { Button } from "@/ui/button";

/**
 * Absorbs one impedance mismatch, in one place — same shim, same reasoning as
 * `popover.tsx`: this repo compiles with `exactOptionalPropertyTypes` and
 * Base UI declares its optionals the looser way.
 */
const forBaseUI = <T,>(props: object) => props as T;

/**
 * The toast vocabulary. `danger` is this library's name (shared with Banner
 * and Button, CONVENTIONS §2); Base UI's `promise()` stamps `error` on a
 * rejected toast, so the renderer treats the two as one type. `loading` is
 * what `promise()` stamps while pending.
 */
export type ToastType = "info" | "success" | "warning" | "danger" | "loading";

export interface ToastAction {
  label: string;
  /**
   * Runs on activation; the toast then dismisses itself. An action that
   * should keep the toast open is not a toast action — it is a link to a
   * surface with room for it.
   */
  onClick: () => void;
}

export interface ToastOptions {
  /** Re-adding with the same id updates the toast in place and resets its clock. */
  id?: string;
  title?: ReactNode;
  /** Carries the announcement when there is no title. */
  description?: ReactNode;
  /** Omit for the plain, glyph-less toast. */
  type?: ToastType;
  /** ms before auto-dismiss; 0 never auto-dismisses. Defaults to the provider's. */
  timeout?: number;
  /**
   * `low` announces politely (default); `high` announces assertively —
   * reserve it for danger.
   */
  priority?: "low" | "high";
  /** One optional action, rendered as a secondary Button. */
  action?: ToastAction;
  onClose?: () => void;
  /** After the toast is removed from the DOM, exit animation included. */
  onRemove?: () => void;
}

/**
 * Promise toasts update one toast through loading → success/danger, so the
 * per-state message cannot carry an `id` (the promise owns it) or an `action`
 * (the action auto-dismisses, which would tear down the toast the promise is
 * still updating).
 */
export type ToastPromiseMessage = string | Omit<ToastOptions, "id" | "action">;

export interface ToastPromiseOptions<Value> {
  loading: ToastPromiseMessage;
  success: ToastPromiseMessage | ((value: Value) => ToastPromiseMessage);
  error: ToastPromiseMessage | ((error: unknown) => ToastPromiseMessage);
}

export interface ToastManager {
  /** Returns the toast id, for `update`/`close`. */
  add: (options: ToastOptions) => string;
  /** Without an id, closes every toast. */
  close: (toastId?: string) => void;
  update: (toastId: string, options: Omit<ToastOptions, "id">) => void;
  /** One toast through loading → success/danger, following the promise. */
  promise: <Value>(promise: Promise<Value>, options: ToastPromiseOptions<Value>) => Promise<Value>;
}

export interface ToastProviderProps {
  children: ReactNode;
  /**
   * Visible toasts before the oldest is hidden — kept mounted and inert at
   * opacity 0, so it can return if the stack shrinks. Base UI's default is 3,
   * which is also the sheet's.
   */
  limit?: number;
  /** Default auto-dismiss in ms (Base UI's 5000); 0 never auto-dismisses. */
  timeout?: number;
}

/**
 * Owns the queue. Wrap it around the app once, with one `Toast.Viewport`
 * inside; `useToast()` then works anywhere below it.
 */
function ToastProvider({ children, limit, timeout }: ToastProviderProps) {
  return (
    <BaseToast.Provider
      {...(limit !== undefined ? { limit } : {})}
      {...(timeout !== undefined ? { timeout } : {})}
    >
      {children}
    </BaseToast.Provider>
  );
}

/** Module counter so an action's self-dismiss can close by id without a round trip. */
let nextToastId = 0;

/**
 * Our options → Base UI's. The action becomes `actionProps` (which is what
 * screen-reader announcement reads) with dismissal composed in — pressing an
 * action that leaves the toast standing for the rest of its timeout reads as
 * the press not working.
 */
function toBaseOptions(
  options: Omit<ToastOptions, "id">,
  close: (toastId: string) => void,
  id?: string,
) {
  const { action, ...rest } = options;
  return {
    ...rest,
    ...(id !== undefined ? { id } : {}),
    ...(action && id !== undefined
      ? {
          actionProps: {
            children: action.label,
            onClick: () => {
              action.onClick();
              close(id);
            },
          },
        }
      : {}),
  };
}

function toPromiseMessage(message: ToastPromiseMessage) {
  return typeof message === "string" ? message : { ...message };
}

/**
 * The manager, restated so no Base UI type reaches a consumer signature
 * (`check:boundaries`, ADR 0012). Must be called under `Toast.Provider`.
 */
export function useToast(): ToastManager {
  const manager = BaseToast.useToastManager();
  return useMemo(
    () => ({
      add: (options: ToastOptions) => {
        const { id: givenId, ...rest } = options;
        const id = givenId ?? `ui-toast-${++nextToastId}`;
        return manager.add(toBaseOptions(rest, (toastId) => manager.close(toastId), id));
      },
      close: (toastId?: string) => manager.close(toastId),
      update: (toastId: string, options: Omit<ToastOptions, "id">) =>
        manager.update(toastId, toBaseOptions(options, (t) => manager.close(t), toastId)),
      promise: <Value,>(promise: Promise<Value>, options: ToastPromiseOptions<Value>) =>
        manager.promise(promise, {
          loading: toPromiseMessage(options.loading),
          success:
            typeof options.success === "function"
              ? (value: Value) => toPromiseMessage((options.success as (v: Value) => ToastPromiseMessage)(value))
              : toPromiseMessage(options.success),
          error:
            typeof options.error === "function"
              ? (error: unknown) => toPromiseMessage((options.error as (e: unknown) => ToastPromiseMessage)(error))
              : toPromiseMessage(options.error),
        }),
    }),
    [manager],
  );
}

export interface ToastViewportProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /**
   * Accessible name of the notifications landmark — the region F6 jumps to.
   * A string prop, not a default, because every user-visible string is one
   * (CONVENTIONS §9). Usually "Notifications".
   */
  label: string;
  /** Accessible name of every toast's close button. Usually "Dismiss". */
  dismissLabel: string;
  /**
   * Where to portal the viewport. Defaults to `document.body`. Theme tokens
   * are INHERITED custom properties, so a viewport portalled to the body
   * leaves any brand scope on a wrapper and paints theme zero — pass the
   * themed element to bring it back inside (same note as popover.tsx).
   */
  container?: HTMLElement | null;
}

/**
 * The viewport plus every toast in it. The per-toast anatomy is deliberately
 * NOT public API: a toast's content is data handed to `useToast()`, and the
 * twelve call sites this component was measured against all want exactly
 * that. Composing custom toast internals is a design gap to raise, not a
 * render prop to add.
 */
function ToastViewport({ label, dismissLabel, container, className, ...rest }: ToastViewportProps) {
  return (
    <BaseToast.Portal {...(container ? { container } : {})}>
      <BaseToast.Viewport
        {...forBaseUI<ComponentPropsWithoutRef<typeof BaseToast.Viewport>>(rest)}
        aria-label={label}
        data-slot="toast-viewport"
        className={cn(
          // Bottom-right, inset space-xl; the sheet's 416 column is
          // dialog-width-md, shrinking on narrow viewports to 100vw minus
          // space-lg each side.
          "fixed right-xl bottom-xl z-50 w-dialog-md max-w-[calc(100vw-(2*var(--ui-space-lg)))]",
          className,
        )}
      >
        <ToastList dismissLabel={dismissLabel} />
      </BaseToast.Viewport>
    </BaseToast.Portal>
  );
}

/** The glyph is the ONLY thing intent changes — the surface never tints. */
const TYPE_INK = {
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  loading: "text-ink-muted",
} as const satisfies Record<ToastType, string>;

function typeIcon(type: ToastType): ReactNode {
  switch (type) {
    case "info":
      return <InfoCircle size={16} />;
    case "success":
      return <CheckCircle size={16} />;
    case "warning":
      return <AlertTriangle size={16} />;
    case "danger":
      return <AlertCircle size={16} />;
    case "loading":
      // Button's busy spinner, verbatim: border-drawn so it inherits the ink,
      // guarded because reduced motion must stop a spinner that never ends.
      return (
        <span
          data-slot="toast-spinner"
          className="size-4 shrink-0 animate-spin rounded-full border-2 border-current/30 border-r-current motion-reduce:animate-none"
        />
      );
  }
}

function ToastList({ dismissLabel }: { dismissLabel: string }) {
  const { toasts } = BaseToast.useToastManager();
  return toasts.map((toast) => (
    <ToastRoot key={toast.id} toast={toast} dismissLabel={dismissLabel} />
  ));
}

function ToastRoot({
  toast,
  dismissLabel,
}: {
  toast: ReturnType<typeof BaseToast.useToastManager>["toasts"][number];
  dismissLabel: string;
}) {
  // `promise()` stamps `error`; this library's name for that intent is danger.
  const type = (toast.type === "error" ? "danger" : toast.type) as ToastType | undefined;
  const icon = type ? typeIcon(type) : null;

  return (
    <BaseToast.Root
      toast={toast}
      data-slot="toast"
      className={cn(
        // The stack math, from the sheet: each toast behind the front one
        // peeks space-sm above it, scaled 5% per index, clamped to the
        // frontmost height while collapsed. All of it runs on Base UI's
        // measured vars (--toast-index, --toast-height, …).
        "[--peek:var(--ui-space-sm)]",
        "[--gap:var(--ui-space-md)]",
        "[--scale:calc(max(0,1-(var(--toast-index)*0.05)))]",
        "[--shrink:calc(1-var(--scale))]",
        "[--height:var(--toast-frontmost-height,var(--toast-height))]",
        "[--offset-y:calc((var(--toast-offset-y)*-1)-(var(--toast-index)*var(--gap))+var(--toast-swipe-movement-y))]",
        // Newest at the bottom; index 0 is frontmost.
        "absolute right-0 bottom-0 w-full origin-bottom select-none",
        "z-[calc(1000-var(--toast-index))]",
        // The surface: the Popover panel's recipe on radius-lg. bg-elevated
        // sits BELOW the dark page ground, so the hairline and shadow-lg
        // carry the boundary there (ADR 0010; the sheet's Dark section).
        "rounded-lg border border-edge-subtle bg-elevated text-ink-primary shadow-lg",
        // Collapsed geometry. Height is the frontmost toast's; toasts behind
        // scale down around the bottom edge and peek out above.
        "h-(--height) scale-(--scale)",
        "translate-x-(--toast-swipe-movement-x)",
        "translate-y-[calc(var(--toast-swipe-movement-y)-(var(--toast-index)*var(--peek))-(var(--shrink)*var(--height)))]",
        // Expanded: full height, real gaps, no scale.
        "data-[expanded]:h-(--toast-height) data-[expanded]:scale-100",
        "data-[expanded]:translate-y-(--offset-y)",
        // Enter from below; exit the same way unless a swipe chose an axis.
        // The `not-` guard keeps the two ending transforms mutually exclusive
        // by construction rather than by stylesheet order.
        "data-[starting-style]:translate-y-[150%]",
        "data-[ending-style]:not-data-[swipe-direction]:translate-y-[150%]",
        "data-[ending-style]:data-[swipe-direction=down]:translate-y-[calc(var(--toast-swipe-movement-y)+150%)]",
        "data-[ending-style]:data-[swipe-direction=right]:translate-x-[calc(var(--toast-swipe-movement-x)+150%)]",
        "data-[ending-style]:opacity-0",
        "data-[limited]:opacity-0",
        // Split timings, longhand: the sheet runs transforms on the spring
        // pair (duration-enter), opacity on duration-slow, and the stack's
        // height settle on duration-fast. Longhand properties rather than
        // `transition-[…]` so the per-property lists cannot be reordered
        // against a shorthand's defaults.
        "[transition-property:translate,scale,opacity,height]",
        "[transition-duration:var(--ui-duration-enter),var(--ui-duration-enter),var(--ui-duration-slow),var(--ui-duration-fast)]",
        "[transition-timing-function:var(--ui-ease-spring),var(--ui-ease-spring),var(--ui-ease-out),var(--ui-ease-out)]",
        // Bridges the expanded gap so the pointer can travel between toasts
        // without the stack collapsing under it.
        "after:absolute after:top-full after:left-0 after:h-[calc(var(--gap)+1px)] after:w-full after:content-['']",
        // F6 lands here. Outline, not box-shadow, so it survives forced
        // colors — Button's rule.
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-edge-focus",
      )}
    >
      <BaseToast.Content
        data-slot="toast-content"
        className={cn(
          "flex items-center gap-md overflow-hidden p-lg",
          // Content behind the frontmost toast is hidden while collapsed and
          // cross-fades back in when the viewport expands.
          "transition-opacity", motionStandard,
          "data-[behind]:opacity-0 data-[expanded]:opacity-100",
        )}
      >
        {icon && type ? (
          <span
            data-slot="toast-icon"
            aria-hidden="true"
            className={cn(
              // The slot is one title line tall (h-lh at the title's own type
              // settings), so the glyph centres on the first line however far
              // the description wraps.
              "flex w-4 shrink-0 items-center justify-center self-start",
              "h-[1lh] text-body-lg leading-normal",
              "[&_svg]:size-4 [&_svg]:shrink-0",
              TYPE_INK[type],
            )}
          >
            {icon}
          </span>
        ) : null}
        <div data-slot="toast-text" className="flex min-w-0 flex-1 flex-col gap-xs">
          {toast.title != null ? (
            <BaseToast.Title
              data-slot="toast-title"
              // body-lg, not title-sm: the title roles are fluid (clamp on
              // vw) and this is a fixed 416px surface that does not follow
              // the viewport — title-sm would render below the sheet's 16px
              // exactly where the sheet draws it. The browser test asserts
              // the computed 16px, which is the only thing telling them apart.
              className="text-body-lg font-body font-bold leading-normal tracking-tight text-ink-primary"
            />
          ) : null}
          {toast.description != null ? (
            <BaseToast.Description
              data-slot="toast-description"
              className="text-body-sm font-body font-medium leading-normal tracking-normal text-ink-muted"
            />
          ) : null}
        </div>
        {toast.actionProps ? (
          <BaseToast.Action
            data-slot="toast-action"
            render={
              <Button variant="secondary" size="md">
                {toast.actionProps.children}
              </Button>
            }
          />
        ) : null}
        <BaseToast.Close
          data-slot="toast-close"
          aria-label={dismissLabel}
          className={cn(
            // Banner's dismiss recipe: a 24px hit area (SC 2.5.8 floor)
            // around a 16px glyph held at full ink strength — dimming it
            // measured under the 3:1 non-text floor there, so hover tints
            // the ground with currentColor instead of touching the glyph.
            // Not Button ghost: ghost's hover fill IS bg-elevated, which is
            // this surface, so its hover state would be invisible here.
            "flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-sm",
            "text-ink-muted [&_svg]:size-4 [&_svg]:shrink-0",
            "transition-[background-color]", motionMicro,
            "hover:bg-current/10",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-edge-focus",
          )}
        >
          <Close size={16} aria-hidden="true" />
        </BaseToast.Close>
      </BaseToast.Content>
    </BaseToast.Root>
  );
}

export const Toast = {
  Provider: ToastProvider,
  Viewport: ToastViewport,
};
