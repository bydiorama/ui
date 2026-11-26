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
  presence: () => (
    <div className="motif-presence">
      <div className="motif-presence-row"><span>Set the grid</span></div>
      <div className="motif-presence-row" data-state="leaving"><i className="motif-presence-line" /></div>
      <div className="motif-presence-row"><span>Choose a palette</span></div>
      <div className="motif-presence-row" data-state="entering"><i className="motif-presence-line" /></div>
    </div>
  ),
};
