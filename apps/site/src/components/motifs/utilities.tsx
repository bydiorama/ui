import { Check, Copy } from "griddy-icons";

const releases = [["Release notes", "Nov"], ["Design review", "Oct"], ["Kick-off", "Sep"], ["Research", "Aug"]];

export const utilities = {
  "dot-pattern": () => (
    <div className="motif-dot-pattern">
      <span className="motif-dot-pattern-label">Launch week</span>
    </div>
  ),
  fade: () => (
    <div className="motif-fade">
      {releases.map(([title, month]) => <div className="motif-fade-row" key={title}><span>{title}</span><span>{month}</span></div>)}
      <span className="motif-fade-veil" />
    </div>
  ),
  // One frame of a list changing: two rows at rest, one arriving part-way
  // through its fade, one folding away part-way through its collapse. The
  // moving rows draw their text as a bar: translucent text fails the
  // catalog's contrast audit, and at this size a line reads as a row.
  // One frame of a swap: the label at rest, then caught mid-change — the new
  // word arriving over the fading old one in a button easing narrower. The
  // fading word is a bar for the same reason as Presence's moving rows.
  "text-swap": () => (
    <div className="motif-text-swap">
      <span className="motif-text-swap-button">Save changes</span>
      <span className="motif-text-swap-button" data-state="swapping"><i className="motif-text-swap-old" />Saved</span>
    </div>
  ),
  // Three frames of Copy becoming a tick, from the Icon Swap sheet: at rest,
  // 50ms in (the old glyph shrinking and blurring away under the new one re-forming), settled.
  "icon-swap": () => (
    <div className="motif-icon-swap">
      <span className="motif-icon-swap-button"><Copy aria-hidden="true" /></span>
      <span className="motif-icon-swap-button" data-state="swapping">
        <Copy aria-hidden="true" className="motif-icon-swap-old" />
        <Check aria-hidden="true" className="motif-icon-swap-new" />
      </span>
      <span className="motif-icon-swap-button"><Check aria-hidden="true" /></span>
    </div>
  ),
  // One frame of 1,249 becoming 1,250, from the Count sheet: the thousands
  // and hundreds still, the tens and units part-way in. The old digits are a
  // bar, like the other motion motifs: translucent text fails the catalog's
  // contrast audit.
  count: () => (
    <div className="motif-count">
      <span className="motif-count-label">Orders this week</span>
      <span className="motif-count-value">1,2<span className="motif-count-changed">50<i className="motif-count-old" /></span></span>
    </div>
  ),
  // One frame of a group arriving in order, from the Stagger sheet at 300ms:
  // three rows in, the fourth part-way, the rest still to come. Moving rows
  // are bars, like the other motion motifs.
  stagger: () => (
    <div className="motif-stagger">
      <div className="motif-stagger-row"><span>Set the grid</span></div>
      <div className="motif-stagger-row"><span>Choose a palette</span></div>
      <div className="motif-stagger-row" data-state="entering"><i /></div>
      <div className="motif-stagger-row" data-state="waiting"><i /></div>
    </div>
  ),
  // Both one-shots, from the Feedback sheet: a code field caught at its first
  // swing (4px left), and a check 58% written beside its label.
  feedback: () => (
    <div className="motif-feedback">
      <span className="motif-feedback-field">48213</span>
      <span className="motif-feedback-done"><span className="motif-feedback-check"><Check aria-hidden="true" /></span>Verified</span>
    </div>
  ),
  presence: () => (
    <div className="motif-presence">
      <div className="motif-presence-row"><span>Set the grid</span></div>
      <div className="motif-presence-row" data-state="leaving"><i className="motif-presence-line" /></div>
      <div className="motif-presence-row"><span>Choose a palette</span></div>
      <div className="motif-presence-row" data-state="entering"><i className="motif-presence-line" /></div>
    </div>
  ),
};
