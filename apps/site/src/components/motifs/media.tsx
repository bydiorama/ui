import type { CSSProperties } from "react";
import { Close, Upload } from "griddy-icons";

const angle = (value: string) => ({ "--m-wash-angle": value }) as CSSProperties;

export const media = {
  "aspect-ratio": () => (
    <div className="motif-aspect-ratio">
      <div><span className="motif-wash" style={{ width: 144, height: 81 }} /><span>16:9</span></div>
      <div><span className="motif-wash" style={{ width: 60, height: 80 }} /><span>3:4</span></div>
    </div>
  ),
  "image-edit": () => (
    <div className="motif-image-edit motif-wash">
      <div className="motif-image-edit-crop">
        <span style={{ left: 42, top: 0, width: 1, height: 84 }} />
        <span style={{ left: 85, top: 0, width: 1, height: 84 }} />
        <span style={{ left: 0, top: 28, width: 128, height: 1 }} />
        <span style={{ left: 0, top: 56, width: 128, height: 1 }} />
        <i className="motif-image-edit-corner" data-corner="tl" />
        <i className="motif-image-edit-corner" data-corner="tr" />
        <i className="motif-image-edit-corner" data-corner="bl" />
        <i className="motif-image-edit-corner" data-corner="br" />
      </div>
    </div>
  ),
  "image-overlay": () => (
    <div className="motif-image-overlay">
      <span className="motif-image-overlay-title">Harbour at dawn</span>
      <span className="motif-image-overlay-meta">Lisbon · 2026</span>
    </div>
  ),
  "image-upload": () => (
    <div className="motif-image-upload">
      <div className="motif-image-upload-zone"><Upload size={18} /><span>Drop images here</span></div>
      <div className="motif-image-upload-file">
        <span className="motif-wash" />
        <div><span>harbour.jpg</span><span className="motif-image-upload-track"><span /></span></div>
      </div>
    </div>
  ),
  thumbnail: () => (
    <div className="motif-thumbnail">
      <span className="motif-wash"><span className="motif-thumbnail-remove"><Close size={10} /></span></span>
      <span className="motif-wash" style={angle("200deg")} />
      <span className="motif-wash motif-thumbnail-selected" style={angle("60deg")} />
    </div>
  ),
};
