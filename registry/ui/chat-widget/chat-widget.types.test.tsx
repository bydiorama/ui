/**
 * Compile-time contract tests. `tsc --noEmit` is the runner — a
 * `@ts-expect-error` that stops erroring fails the build.
 */

import { Badge } from "@/ui/badge/badge.tsx";
import { Button } from "@/ui/button/button.tsx";
import { ChatWidget } from "./chat-widget.tsx";

export function Valid() {
  return (
    <>
      <ChatWidget>
        <ChatWidget.Header name="A draft" />
        <ChatWidget.Body scrollLabel="A draft">Some prose</ChatWidget.Body>
      </ChatWidget>

      <ChatWidget className="max-w-[640px]" id="artifact-1">
        <ChatWidget.Header name="A draft" icon={<span />} chip={<Badge>Draft</Badge>} />
        <ChatWidget.Body scrollLabel="A draft">
          <p>Some prose</p>
        </ChatWidget.Body>
        <ChatWidget.Actions end={<Button isIconOnly aria-label="Save" />}>
          <Button variant="secondary">Copy</Button>
        </ChatWidget.Actions>
      </ChatWidget>

      <ChatWidget>
        <ChatWidget.Media>
          <img src="x" alt="A picture" />
        </ChatWidget.Media>
        <ChatWidget.Media ratio="story" overlay={<Button isIconOnly aria-label="Next" />}>
          <img src="x" alt="A picture" />
        </ChatWidget.Media>
        <ChatWidget.Rail label="Frames">
          <li>frame</li>
        </ChatWidget.Rail>
        <ChatWidget.Caption>Grounded in brand palette</ChatWidget.Caption>
        <ChatWidget.Actions>
          <Button variant="secondary">Edit</Button>
        </ChatWidget.Actions>
      </ChatWidget>
    </>
  );
}

export function Invalid() {
  return (
    <>
      {/* The header's whole job is to say what the artifact IS. */}
      {/* @ts-expect-error name is required */}
      <ChatWidget.Header />

      {/* A capped body that scrolls is a scrollable region and needs a keyboard
          path AND a name (SC 2.1.1). Requiring the name is what stops the pair
          being applied half-way. */}
      {/* @ts-expect-error scrollLabel is required */}
      <ChatWidget.Body>Some prose</ChatWidget.Body>

      {/* A list of unnamed thumbnails announces as a list of images. */}
      {/* @ts-expect-error label is required */}
      <ChatWidget.Rail>
        <li>frame</li>
      </ChatWidget.Rail>

      {/* The ratio vocabulary is AspectRatio's own six — a seventh is a design
          decision, not a string. */}
      {/* @ts-expect-error unknown ratio */}
      <ChatWidget.Media ratio="cinema">
        <img src="x" alt="A picture" />
      </ChatWidget.Media>

      {/* The header takes ELEMENTS in its slots and never wraps them (§3), so a
          config object is not an icon. */}
      {/* @ts-expect-error icon is a slot, not a name */}
      <ChatWidget.Header name="A draft" icon="FileText" />
    </>
  );
}
