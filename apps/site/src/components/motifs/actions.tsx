import { Pause } from "griddy-icons";

export const actions = {
  button: () => (
    <div className="motif-button">
      <span className="motif-button-primary">Save changes</span>
      <span className="motif-button-secondary">Discard</span>
    </div>
  ),
  "media-toggle": () => (
    <div className="motif-media-toggle">
      <span className="motif-media-toggle-control"><Pause size={20} /></span>
      <div className="motif-media-toggle-track">
        <span className="motif-media-toggle-bar"><span /></span>
        <span className="motif-media-toggle-times"><span>0:42</span><span>1:36</span></span>
      </div>
    </div>
  ),
};
