/** Compile-time contract tests. `tsc --noEmit` is the runner. */

import { useRef } from "react";

import { MediaToggle } from "./media-toggle.tsx";

export function Valid() {
  const video = useRef<HTMLVideoElement>(null);
  return (
    <>
      <MediaToggle target={video} pauseLabel="Pause background video" playLabel="Play background video" />
      <MediaToggle isPaused onPausedChange={() => undefined} pauseLabel="Pause" playLabel="Play" size="lg" />
    </>
  );
}

export function LabelsAreRequired() {
  return (
    <>
      {/* @ts-expect-error — both names are required: the accessible name changes with the state. */}
      <MediaToggle pauseLabel="Pause background video" />
    </>
  );
}
