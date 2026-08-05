/** Compile-time contract tests. `tsc --noEmit` is the runner. */
import { Tabs } from "./tabs.tsx";

export function Valid() {
  return (
    <>
      <Tabs defaultValue="a">
        <Tabs.List>
          <Tabs.Tab value="a" count={3}>Links</Tabs.Tab>
          <Tabs.Tab value="b" isDisabled>Appearance</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="a">A</Tabs.Panel>
        <Tabs.Panel value="b">B</Tabs.Panel>
      </Tabs>
      <Tabs value="a" onValueChange={(v) => v.toUpperCase()} className="max-w-lg">
        <Tabs.List><Tabs.Tab value="a">A</Tabs.Tab></Tabs.List>
        <Tabs.Panel value="a">A</Tabs.Panel>
      </Tabs>
    </>
  );
}

export function Invalid() {
  {/* A tab with no value cannot be paired with a panel. */}
  /* @ts-expect-error value is required on Tab */
  const a = <Tabs.Tab>Links</Tabs.Tab>;
  /* @ts-expect-error value is required on Panel */
  const b = <Tabs.Panel>Content</Tabs.Panel>;
  /* @ts-expect-error onValueChange receives a string, not an event */
  const c = <Tabs onValueChange={(e: MouseEvent) => e.type}><Tabs.Panel value="a">A</Tabs.Panel></Tabs>;
  /* @ts-expect-error count is a number */
  const d = <Tabs.Tab value="a" count="3">Links</Tabs.Tab>;
  return [a, b, c, d];
}
