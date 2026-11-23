import { Calendar, Check, ChevronDown, Close } from "griddy-icons";

const days = (count: number, marks: Record<number, string>) =>
  Array.from({ length: count }, (_, index) => <span key={index} className={marks[index]} />);

const Caret = () => <span className="motif-caret" />;

export const forms = {
  calendar: () => (
    <div className="motif-calendar">
      <div className="motif-calendar-head"><span>November</span><span>‹ ›</span></div>
      <div className="motif-calendar-days">{days(30, { 11: "is-today", 17: "is-selected" })}</div>
    </div>
  ),
  checkbox: () => (
    <div className="motif-choices">
      <span><span className="motif-checkbox-box is-checked"><Check size={14} /></span>Weekly digest</span>
      <span><span className="motif-checkbox-box is-checked"><Check size={14} /></span>Mentions</span>
      <span><span className="motif-checkbox-box" />Product news</span>
    </div>
  ),
  "color-picker": () => (
    <div className="motif-color-picker">
      <div className="motif-color-picker-field"><span /></div>
      <div className="motif-color-picker-hue"><span /></div>
      <div className="motif-color-picker-value"><span />#9EDBF3</div>
    </div>
  ),
  combobox: () => (
    <div className="motif-dropdown">
      <div className="motif-field motif-field-typing">Lis<Caret /></div>
      <div className="motif-dropdown-panel">
        <span className="is-active">Lisbon</span>
        <span>Lismore</span>
        <span>Lisieux</span>
      </div>
    </div>
  ),
  "date-picker": () => (
    <div className="motif-dropdown">
      <div className="motif-field">18 Nov 2026<Calendar size={16} /></div>
      <div className="motif-date-picker-panel">{days(14, { 10: "is-selected" })}</div>
    </div>
  ),
  input: () => (
    <div className="motif-input">
      <span className="motif-input-label">Email</span>
      <div className="motif-field motif-field-typing motif-input-field">ada@studio.com<Caret /></div>
      <span className="motif-input-hint">We only use it for receipts.</span>
    </div>
  ),
  multiselect: () => (
    <div className="motif-multiselect">
      <div className="motif-multiselect-chips">
        <span>Design<Close size={12} /></span>
        <span>Research<Close size={12} /></span>
      </div>
      <ChevronDown size={16} />
    </div>
  ),
  radio: () => (
    <div className="motif-choices">
      <span><span className="motif-radio-dot" />Monthly</span>
      <span><span className="motif-radio-dot is-checked"><span /></span>Yearly</span>
      <span><span className="motif-radio-dot" />Lifetime</span>
    </div>
  ),
  "range-slider": () => (
    <div className="motif-slider motif-range-slider">
      <div className="motif-range-slider-values"><span>€20</span><span>€80</span></div>
      <div className="motif-slider-track">
        <span className="motif-slider-fill" style={{ left: 52, width: 80 }} />
        <span className="motif-slider-thumb" style={{ left: 44 }} />
        <span className="motif-slider-thumb" style={{ left: 124 }} />
      </div>
    </div>
  ),
  select: () => (
    <div className="motif-dropdown">
      <div className="motif-field">Medium<ChevronDown size={16} /></div>
      <div className="motif-dropdown-panel">
        <span>Small</span>
        <span className="is-active">Medium<Check size={14} /></span>
        <span>Large</span>
      </div>
    </div>
  ),
  slider: () => (
    <div className="motif-slider">
      <span className="motif-slider-value">64</span>
      <div className="motif-slider-track">
        <span className="motif-slider-fill" style={{ left: 0, width: 118 }} />
        <span className="motif-slider-thumb" style={{ left: 110 }} />
      </div>
    </div>
  ),
  switch: () => (
    <div className="motif-switch">
      <span>Notify reviewers<span className="motif-switch-track is-on"><span /></span></span>
      <span>Auto-merge<span className="motif-switch-track"><span /></span></span>
    </div>
  ),
  textarea: () => (
    <div className="motif-textarea">
      <div className="motif-textarea-field">The export reads well. One question on the<span className="motif-textarea-grip" /></div>
      <span className="motif-textarea-count">44 / 280</span>
    </div>
  ),
};
