import { Check, ChevronDown } from "griddy-icons";

export const feedback = {
  accordion: () => (
    <div className="motif-accordion">
      <div className="motif-accordion-item motif-accordion-open">
        <div className="motif-accordion-head"><b>Can I change the source?</b><ChevronDown size={14} /></div>
        <span className="motif-accordion-answer">Yes. It lives in your project, ready to read and adapt.</span>
      </div>
      <div className="motif-accordion-item"><div className="motif-accordion-head"><b>Can I use my own brand?</b><ChevronDown size={14} /></div></div>
      <div className="motif-accordion-item"><div className="motif-accordion-head"><b>Can my agent use it?</b><ChevronDown size={14} /></div></div>
    </div>
  ),
  banner: () => (
    <div className="motif-banner">
      <Check size={16} />
      <div className="motif-banner-text"><b>Ready to share</b><span>Your project is saved and up to date.</span></div>
    </div>
  ),
  toast: () => (
    <div className="motif-toast">
      <span className="motif-toast-behind" />
      <div className="motif-toast-card">
        <span className="motif-toast-message"><span className="motif-toast-check"><Check size={12} /></span>Link copied</span>
        <span className="motif-toast-action">Undo</span>
      </div>
    </div>
  ),
};
