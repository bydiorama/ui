import type { ReactNode } from "react";
import { ArrowRight, Check, Copy } from "griddy-icons";

/** A motion motif: the state before, an arrow, the state after — both at rest. */
function Change({ before, after }: { before: ReactNode; after: ReactNode }) {
  return (
    <div className="motif-change">
      {before}
      <ArrowRight aria-hidden="true" className="motif-change-arrow" />
      {after}
    </div>
  );
}

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
  // The motion motifs draw a BEFORE and an AFTER, joined by an arrow: a
  // static frame cannot show movement, and a frame caught mid-transition
  // reads as broken (half-faded text, a clipped bar) rather than as motion.
  // Both states are at rest and at full opacity.
  "text-swap": () => (
    <Change
      before={<span className="motif-text-swap-button">Save changes</span>}
      after={<span className="motif-text-swap-button">Saved</span>}
    />
  ),
  "icon-swap": () => (
    <Change
      before={<span className="motif-icon-swap-button"><Copy aria-hidden="true" /></span>}
      after={<span className="motif-icon-swap-button"><Check aria-hidden="true" /></span>}
    />
  ),
  count: () => (
    <div className="motif-count">
      <span className="motif-count-label">Orders this week</span>
      <Change
        before={<span className="motif-count-value">1,249</span>}
        after={<span className="motif-count-value">1,250</span>}
      />
    </div>
  ),
  presence: () => (
    <Change
      before={<div className="motif-list"><span>Grid</span><span>Palette</span></div>}
      after={<div className="motif-list"><span>Grid</span><span data-state="new">Type</span><span>Palette</span></div>}
    />
  ),
  stagger: () => (
    <Change
      before={<div className="motif-list" data-state="empty" />}
      after={<div className="motif-list"><span>Grid</span><span>Palette</span><span>Type</span></div>}
    />
  ),
  feedback: () => (
    <div className="motif-feedback">
      <Change
        before={<span className="motif-feedback-field">48213</span>}
        after={<span className="motif-feedback-field" data-state="error">48213</span>}
      />
      <Change
        before={<span className="motif-feedback-done">Verify</span>}
        after={<span className="motif-feedback-done"><Check aria-hidden="true" className="motif-feedback-check" />Verified</span>}
      />
    </div>
  ),
};
