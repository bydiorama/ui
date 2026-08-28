/** Compile-time contract tests. `tsc --noEmit` is the runner. */
import { Header } from "./header.tsx";

export function Valid() {
  return (
    <Header className="sticky top-0">
      <Header.Start><button type="button">Brand</button></Header.Start>
      <Header.Spacer />
      <Header.Nav label="Primary">
        <Header.Item href="/agent">Agent</Header.Item>
        <Header.Item trailing={<span aria-hidden="true">.</span>}>Create</Header.Item>
        <Header.Item href="/library" isCurrent icon={<svg aria-hidden="true" />}>Library</Header.Item>
        <Header.Item href="/reports" render={<a href="/reports" />}>Reports</Header.Item>
        {/* An external destination through the item's OWN API. Before Item
            extended AnchorHTMLAttributes this needed `render`, which meant
            writing the href twice and keeping the two copies in step. */}
        <Header.Item href="https://status.example.com" target="_blank" rel="noreferrer">Status</Header.Item>
      </Header.Nav>
      <Header.Spacer />
      <Header.End><button type="button">Menu</button></Header.End>
    </Header>
  );
}

export function Invalid() {
  {/* Several <nav> landmarks on a page are indistinguishable unnamed. */}
  /* @ts-expect-error label is required on the nav */
  const a = <Header><Header.Nav><Header.Item href="/">Home</Header.Item></Header.Nav></Header>;

  /* @ts-expect-error an item needs children */
  const b = <Header><Header.Nav label="P"><Header.Item href="/" /></Header.Nav></Header>;

  {/* The bar is a banner, not a nav; it takes no name of its own. */}
  /* @ts-expect-error Header takes no label */
  const c = <Header label="Primary">x</Header>;

  {/* The variant is the boolean-or-config shape (CONVENTIONS §3), not an
      enum — a string here is the spelling that LOOKS right and does not
      exist. */}
  /* @ts-expect-error affix takes boolean | { fade?: boolean }, not a string */
  const d = <Header affix="fade">x</Header>;

  /* @ts-expect-error the config's only key is fade */
  const e = <Header affix={{ shadow: false }}>x</Header>;

  return [a, b, c, d, e];
}

export function ValidAffix() {
  return [
    <Header key="on" affix>x</Header>,
    <Header key="cfg" affix={{ fade: true }}>x</Header>,
    // The object form exists for its keys, but an empty one still pins —
    // same as `true`; the component treats them identically.
    <Header key="empty" affix={{}}>x</Header>,
  ];
}
