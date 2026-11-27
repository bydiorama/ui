import { useEffect, useRef, useState } from "react";
import { subscribeMotionLevel } from "@/lib/motion";
import { TextSwap } from "@/ui/text-swap";
import { Accordion } from "@/ui/accordion";
import { Button } from "@/ui/button";
import { RadioGroup, Radio } from "@/ui/radio";
import { Sheet } from "@/ui/sheet";
import { Skeleton } from "@/ui/skeleton";
import { Switch } from "@/ui/switch";
import { appearanceOptions, setAppearance, type Appearance } from "../lib/appearance";
import { useAppearance } from "../lib/use-appearance";

/** A quarter of real speed: slow enough to see a curve, fast enough to wait for. */
const SLOW_RATE = 0.25;

/**
 * Slows every transition and keyframe that starts inside `root`, and the ones
 * already running there, the way the browser's animation inspector does. It
 * changes playback, never the tokens, so what you watch is what ships.
 */
function useSlowPlayback(root: HTMLElement | null, isSlow: boolean) {
  useEffect(() => {
    if (!root) return;
    const rate = isSlow ? SLOW_RATE : 1;
    for (const animation of root.getAnimations({ subtree: true })) animation.playbackRate = rate;
    if (!isSlow) return;
    const slow = (event: Event) => {
      for (const animation of (event.target as Element).getAnimations()) animation.playbackRate = rate;
    };
    root.addEventListener("transitionrun", slow);
    root.addEventListener("animationstart", slow);
    return () => {
      root.removeEventListener("transitionrun", slow);
      root.removeEventListener("animationstart", slow);
    };
  }, [root, isSlow]);
}

/** The site's own motion setting, with live specimens to judge it by. */
export function MotionLab() {
  const appearance = useAppearance();
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const [screen, setScreen] = useState<HTMLDivElement | null>(null);
  const [isSlow, setIsSlow] = useState(false);
  const [isBusy, setIsBusy] = useState(true);
  useSlowPlayback(root, isSlow && appearance.motion !== "off");

  return (
    <div className="motion-lab" ref={setRoot}>
      <div className="motion-lab-controls">
        <RadioGroup
          label="Motion on this site"
          orientation="horizontal"
          value={appearance.motion}
          onValueChange={value => setAppearance("motion", value as Appearance["motion"])}
          helperText="Saved in this browser and applied to every page."
        >
          {appearanceOptions.motion.map(option => <Radio key={option.value} value={option.value}>{option.label}</Radio>)}
        </RadioGroup>
        <Switch isChecked={isSlow} onCheckedChange={setIsSlow}>Slow down</Switch>
      </div>

      <div className="motion-lab-grid">
        <section className="motion-lab-cell motion-lab-cell-wide" aria-labelledby="motion-travel">
          <h3 id="motion-travel">A surface that travels</h3>
          <p>Slides in at Full. Fades in place at Reduced.</p>
          {/* The transform makes this box the drawer's containing block, so the
              Sheet opens inside the specimen rather than over the page. */}
          <div className="motion-lab-screen" ref={setScreen}>
            <Sheet>
              <Sheet.Trigger render={<Button variant="secondary">Open panel</Button>}></Sheet.Trigger>
              <Sheet.Panel label="Filters" side="right" size="sm" container={screen}>
                <Sheet.Body><p>The panel moves by its own width times the travel token.</p></Sheet.Body>
                <Sheet.Footer><Sheet.Close render={<Button>Done</Button>}></Sheet.Close></Sheet.Footer>
              </Sheet.Panel>
            </Sheet>
          </div>
        </section>

        <section className="motion-lab-cell" aria-labelledby="motion-change">
          <h3 id="motion-change">Change in place</h3>
          <p>Eases at Full and Reduced. Instant at Off.</p>
          <Switch defaultIsChecked>Notifications</Switch>
          <Accordion>
            <Accordion.Item value="details">
              <Accordion.Trigger>Delivery details</Accordion.Trigger>
              <Accordion.Panel>Opening and closing changes height where it stands.</Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </section>

        <section className="motion-lab-cell" aria-labelledby="motion-loops">
          <h3 id="motion-loops">Loops</h3>
          <p>Run at Full only. The words still say what is happening.</p>
          <Button isBusy={isBusy} onClick={() => setIsBusy(value => !value)}>{isBusy ? "Saving" : "Save"}</Button>
          <Skeleton />
        </section>
      </div>
    </div>
  );
}

const INTENTS = [
  { token: "--ui-motion-micro", use: "Interaction feedback: hover, press, a colour settling" },
  { token: "--ui-motion-standard", use: "A surface arriving or leaving" },
  { token: "--ui-motion-deliberate", use: "Something unfolding" },
  { token: "--ui-motion-choreographed", use: "A rare, staged moment" },
] as const;

/**
 * The four intent tokens, each moving a dot across the same track so their
 * durations and curves can be compared side by side. The dot's offset is
 * written against `--ui-motion-travel`, like any surface that moves, so at
 * Reduced and Off it stays where it is.
 */
export function MotionIntents() {
  const [isAtEnd, setIsAtEnd] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sync = () => {
      const style = getComputedStyle(ref.current ?? document.documentElement);
      setValues(Object.fromEntries(INTENTS.map(({ token }) => [token, style.getPropertyValue(token).trim()])));
    };
    sync();
    return subscribeMotionLevel(sync);
  }, []);

  return (
    <div className="motion-intents" ref={ref}>
      <ul>
        {INTENTS.map(({ token, use }) => (
          <li key={token}>
            <span className="motion-intent-name"><code>{token}</code><span>{use}</span></span>
            <span className="motion-intent-track" aria-hidden="true">
              <span className="motion-intent-dot" data-at-end={isAtEnd ? "" : undefined} style={{ transition: `translate var(${token})` }} />
            </span>
            <code className="motion-intent-value">{values[token] ?? ""}</code>
          </li>
        ))}
      </ul>
      <Button variant="secondary" onClick={() => setIsAtEnd(value => !value)}><TextSwap>{isAtEnd ? "Play back" : "Play"}</TextSwap></Button>
    </div>
  );
}
