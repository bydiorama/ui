import { Inbox } from "griddy-icons";

export const display = {
  avatar: () => (
    <div className="motif-avatar">
      <span className="motif-avatar-initials">CP</span>
      <span className="motif-avatar-image" />
      <span className="motif-avatar-accent">KG</span>
      <span className="motif-avatar-more">+4</span>
    </div>
  ),
  badge: () => (
    <div className="motif-badge">
      <span className="motif-badge-success">Active</span>
      <span className="motif-badge-warning">Pending</span>
      <span className="motif-badge-danger">Blocked</span>
      <span className="motif-badge-selected">Selected</span>
    </div>
  ),
  card: () => (
    <div className="motif-card">
      <div className="motif-card-head">
        <span className="motif-card-title">Brand guidelines</span>
        <span className="motif-card-meta">Updated just now</span>
      </div>
      <span className="motif-card-line" />
      <span className="motif-card-status">Ready for review</span>
    </div>
  ),
  "empty-state": () => (
    <div className="motif-empty-state">
      <span className="motif-empty-state-icon"><Inbox size={18} /></span>
      <span className="motif-empty-state-title">No reviews yet</span>
      <span className="motif-empty-state-body">Ask a teammate to look at a draft.</span>
      <span className="motif-empty-state-action">Request a review</span>
    </div>
  ),
  meter: () => (
    <div className="motif-meter">
      <div className="motif-meter-head"><span className="motif-meter-label">Storage</span><span className="motif-meter-value">72 of 100 GB</span></div>
      <span className="motif-meter-track"><span /></span>
    </div>
  ),
  progress: () => (
    <div className="motif-progress">
      <svg className="motif-progress-ring" width="56" height="56" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r="24" fill="none" strokeWidth="5" />
        <path d="M28 4 A24 24 0 1 1 6.6 38.9" fill="none" strokeWidth="5" strokeLinecap="round" />
      </svg>
      <div className="motif-progress-body">
        <span className="motif-progress-label">Uploading 3 of 5</span>
        <span className="motif-progress-track"><span /></span>
      </div>
    </div>
  ),
  skeleton: () => (
    <div className="motif-skeleton">
      <span className="motif-skeleton-avatar" />
      <div className="motif-skeleton-lines">
        <span style={{ width: 96, height: 10, borderRadius: 5 }} />
        <span style={{ width: "100%" }} />
        <span style={{ width: 110 }} />
      </div>
    </div>
  ),
};
