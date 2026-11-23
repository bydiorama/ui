import { Folder, Home, Inbox, Menu, MoreHorizontal } from "griddy-icons";

const lines = (widths: number[]) => (
  <div className="motif-nav-lines">{widths.map(width => <span key={width} style={{ width }} />)}</div>
);

export const navigation = {
  header: () => (
    <div className="motif-header">
      <div className="motif-header-bar">
        <span className="motif-header-path"><span>Projects</span><span className="motif-header-slash">/</span><b>Invoices</b></span>
        <span className="motif-header-share">Share</span>
      </div>
      <div className="motif-nav-lines motif-header-lines">{[120, 168, 92].map(width => <span key={width} style={{ width }} />)}</div>
    </div>
  ),
  menu: () => (
    <div className="motif-menu">
      <span className="motif-menu-trigger"><MoreHorizontal size={16} /></span>
      <div className="motif-menu-panel">
        <span className="motif-menu-item motif-menu-item-active">Rename</span>
        <span className="motif-menu-item">Duplicate</span>
        <span className="motif-menu-divider" />
        <span className="motif-menu-item motif-menu-item-danger">Delete</span>
      </div>
    </div>
  ),
  "nav-rail": () => (
    <div className="motif-nav-frame">
      <div className="motif-nav-rail">
        <span><Home size={16} /></span>
        <span className="motif-nav-rail-active"><Inbox size={16} /></span>
        <span><Folder size={16} /></span>
      </div>
      {lines([96, 132, 110])}
    </div>
  ),
  sidebar: () => (
    <div className="motif-nav-frame">
      <div className="motif-sidebar">
        <span className="motif-sidebar-heading">Workspace</span>
        <span className="motif-sidebar-item motif-sidebar-item-active">Inbox</span>
        <span className="motif-sidebar-item">Drafts</span>
        <span className="motif-sidebar-item">Archive</span>
      </div>
      {lines([72, 88, 60])}
    </div>
  ),
  "site-header": () => (
    <div className="motif-site-header">
      <div className="motif-site-header-desktop">
        <span className="motif-site-header-mark" />
        <span className="motif-site-header-links"><span style={{ width: 22 }} /><span style={{ width: 18 }} /><span style={{ width: 24 }} /></span>
        <span className="motif-site-header-cta" />
      </div>
      <div className="motif-site-header-phone">
        <div className="motif-site-header-phone-bar"><span className="motif-site-header-mark" /><Menu size={12} /></div>
      </div>
    </div>
  ),
  tabs: () => (
    <div className="motif-tabs">
      <span>Overview</span>
      <span className="motif-tabs-active">Activity</span>
      <span>Files</span>
    </div>
  ),
};
