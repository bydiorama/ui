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
};
