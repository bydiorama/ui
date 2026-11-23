import { ArrowUp, Check, Close, Copy, Pause, Plus } from "griddy-icons";

const done = (label: string) => (
  <div className="motif-chat-progress-step">
    <span className="motif-chat-progress-done"><Check size={11} /></span>
    <span>{label}</span>
  </div>
);

const source = (index: number, label: string) => (
  <span className="motif-chat-sources-chip"><span className="motif-chat-sources-index">{index}</span>{label}</span>
);

const bar = (label: string, width: number, count: number) => (
  <div className="motif-chat-widget-row">
    <span className="motif-chat-widget-label">{label}</span>
    <span className="motif-chat-widget-bar" style={{ width }} />
    <span className="motif-chat-widget-count">{count}</span>
  </div>
);

export const conversation = {
  "chat-composer": () => (
    <div className="motif-chat-composer">
      <span className="motif-chat-composer-text">Summarise this week’s feedback</span>
      <div className="motif-chat-composer-actions">
        <span className="motif-chat-composer-add"><Plus size={13} /></span>
        <span className="motif-chat-composer-send"><ArrowUp size={13} /></span>
      </div>
    </div>
  ),
  "chat-message": () => (
    <div className="motif-chat-message">
      <span className="motif-chat-message-user">Which tickets mention pricing?</span>
      <div className="motif-chat-message-reply">
        <span className="motif-chat-message-avatar" />
        <span>Fourteen do. Most ask about the annual plan.</span>
      </div>
    </div>
  ),
  "chat-progress": () => (
    <div className="motif-chat-progress">
      {done("Read 42 tickets")}
      {done("Grouped by topic")}
      <div className="motif-chat-progress-step motif-chat-progress-current">
        <svg width="18" height="18" viewBox="0 0 18 18" className="motif-chat-progress-spinner">
          <circle cx="9" cy="9" r="7" fill="none" strokeWidth="2" />
          <path d="M9 2 A7 7 0 0 1 16 9" fill="none" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span>Drafting the summary</span>
      </div>
      <div className="motif-chat-progress-step motif-chat-progress-pending">
        <span className="motif-chat-progress-open" />
        <span>Check the figures</span>
      </div>
    </div>
  ),
  "chat-questionnaire": () => (
    <div className="motif-chat-questionnaire">
      <span className="motif-chat-questionnaire-question">Who is the summary for?</span>
      <div className="motif-chat-questionnaire-options">
        <span>The team</span>
        <span className="motif-chat-questionnaire-chosen"><Check size={11} />Leadership</span>
        <span>Customers</span>
      </div>
    </div>
  ),
  "chat-run-dock": () => (
    <div className="motif-chat-run-dock">
      <div className="motif-chat-run-dock-bar">
        <div className="motif-chat-run-dock-status">
          <span className="motif-chat-run-dock-dots"><span /><span /><span /></span>
          <span className="motif-chat-run-dock-text">
            <span className="motif-chat-run-dock-title">Running · step 3 of 5</span>
            <span className="motif-chat-run-dock-meta">2 min elapsed</span>
          </span>
        </div>
        <span className="motif-chat-run-dock-pause"><Pause size={14} /></span>
      </div>
    </div>
  ),
  "chat-sources": () => (
    <div className="motif-chat-sources">
      <span className="motif-chat-sources-text">Churn fell after the March release, mostly among annual plans.</span>
      <div className="motif-chat-sources-chips">{source(1, "Q1 report")}{source(2, "Billing data")}</div>
    </div>
  ),
  "chat-tasks": () => (
    <div className="motif-chat-tasks">
      <div className="motif-chat-tasks-row">
        <span>Email the summary</span>
        <span className="motif-chat-tasks-actions">
          <span className="motif-chat-tasks-reject"><Close size={10} /></span>
          <span className="motif-chat-tasks-accept"><Check size={11} /></span>
        </span>
      </div>
      <div className="motif-chat-tasks-row">
        <span>Update the roadmap</span>
        <span className="motif-chat-tasks-approved">Approved</span>
      </div>
    </div>
  ),
  "chat-widget": () => (
    <div className="motif-chat-widget">
      <div className="motif-chat-widget-head"><span>Feedback by topic</span><Copy size={13} /></div>
      <div className="motif-chat-widget-rows">
        {bar("Pricing", 100, 14)}
        {bar("Speed", 72, 9)}
        {bar("Exports", 40, 5)}
      </div>
    </div>
  ),
};
