import { Close, Plus } from "griddy-icons";

const lines = (widths: number[]) => widths.map(width => <span key={width} className="motif-overlay-line" style={{ width }} />);

export const overlays = {
  "context-menu": () => (
    <div className="motif-overlay-page motif-context-menu">
      <div className="motif-context-menu-row"><span className="motif-context-menu-icon" /><span className="motif-overlay-line" style={{ width: 96 }} /></div>
      <div className="motif-context-menu-row motif-context-menu-row-active"><span className="motif-context-menu-icon" /><span className="motif-overlay-line" style={{ width: 120 }} /></div>
      <div className="motif-context-menu-row"><span className="motif-context-menu-icon" /><span className="motif-overlay-line" style={{ width: 80 }} /></div>
      <div className="motif-context-menu-panel">
        <span className="motif-context-menu-item motif-context-menu-item-active">Open</span>
        <span className="motif-context-menu-item">Rename</span>
        <span className="motif-context-menu-item">Move to…</span>
      </div>
    </div>
  ),
  drawer: () => (
    <div className="motif-overlay-page">
      {lines([120, 168, 96])}
      <span className="motif-overlay-scrim" />
      <div className="motif-drawer-sheet">
        <span className="motif-drawer-handle" />
        <div className="motif-drawer-body">
          <b>Share to</b>
          <div className="motif-drawer-targets"><span /><span /><span /><span /></div>
        </div>
      </div>
    </div>
  ),
  modal: () => (
    <div className="motif-modal">
      <span className="motif-overlay-scrim" />
      <div className="motif-modal-dialog">
        <b>Discard changes?</b>
        <span className="motif-modal-body">Your edits to this draft will be lost.</span>
        <div className="motif-modal-actions"><span className="motif-modal-keep">Keep</span><span className="motif-modal-discard">Discard</span></div>
      </div>
    </div>
  ),
  popover: () => (
    <div className="motif-popover">
      <div className="motif-popover-panel">
        <b>Anyone with the link</b>
        <div className="motif-popover-row"><span>Can comment</span><span className="motif-popover-switch"><span /></span></div>
      </div>
      <span className="motif-popover-trigger">Share</span>
    </div>
  ),
  sheet: () => (
    <div className="motif-overlay-page">
      {lines([120, 168, 96])}
      <span className="motif-overlay-scrim" />
      <div className="motif-sheet-panel">
        <div className="motif-sheet-head"><b>Filters</b><Close size={12} /></div>
        <span className="motif-sheet-field" />
        <span className="motif-sheet-field" />
        <span className="motif-overlay-line" style={{ width: 56 }} />
      </div>
    </div>
  ),
  tooltip: () => (
    <div className="motif-tooltip">
      <span className="motif-tooltip-tip">Add a section</span>
      <span className="motif-tooltip-trigger"><Plus size={16} /></span>
    </div>
  ),
};
