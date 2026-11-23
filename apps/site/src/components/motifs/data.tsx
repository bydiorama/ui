import { Search } from "griddy-icons";

// Chart: four pairs of bars, [x, y, height] per bar, on a 200×112 plot.
const bars = [
  [10, 52, 58, 1], [27, 68, 42, 2], [58, 34, 76, 1], [75, 58, 52, 2],
  [106, 20, 90, 1], [123, 46, 64, 2], [154, 8, 102, 1], [171, 40, 70, 2],
] as const;

// NetworkCanvas: a dense cloud of [x, y, r] around one accent hub.
const cloud = [
  [20, 40, 2], [34, 24, 1.5], [46, 66, 2.5], [30, 78, 3], [16, 98, 2], [36, 122, 3], [54, 92, 2], [60, 50, 4],
  [74, 34, 2], [84, 18, 3], [90, 54, 2], [70, 106, 4], [88, 88, 2.5], [96, 128, 2], [112, 124, 3], [126, 96, 2],
  [128, 40, 2.5], [140, 14, 3], [118, 22, 1.5], [144, 70, 2], [150, 104, 4], [166, 84, 2], [160, 44, 4], [178, 26, 2],
  [196, 70, 3], [206, 46, 2], [190, 120, 3], [204, 98, 2], [174, 132, 1.5], [134, 128, 2], [102, 40, 1.5], [48, 12, 2],
  [184, 56, 1.5], [82, 70, 1.5],
] as const;
const cloudLinks = [
  [60, 50, 110, 70], [110, 70, 160, 44], [110, 70, 150, 104], [110, 70, 70, 106], [60, 50, 30, 78], [160, 44, 196, 70],
  [150, 104, 190, 120], [70, 106, 36, 122], [60, 50, 84, 18], [160, 44, 140, 14], [110, 70, 112, 124],
] as const;

// StatusMatrix: five rows of five cells, read left to right.
const matrix = [
  "ok ok ok ok warn",
  "ok ok warn ok ok",
  "ok fail ok ok run",
  "run ok ok idle idle",
  "ok idle idle idle idle",
].flatMap(row => row.split(" "));

const rows = [
  { name: "Q3 report", status: "Shared", tone: "success", size: "2.4 MB" },
  { name: "Roadmap", status: "Draft", tone: "warning", size: "860 KB" },
  { name: "Brand kit", status: "Shared", tone: "success", size: "14 MB" },
];

const Grip = () => (
  <svg className="motif-card-sorting-grip" width="10" height="14" viewBox="0 0 10 14">
    {[2.5, 7, 11.5].flatMap(cy => [2.5, 7.5].map(cx => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.5" />))}
  </svg>
);

export const data = {
  "card-sorting": () => (
    <div className="motif-card-sorting">
      <span className="motif-card-sorting-card"><span>1</span>Research</span>
      <span className="motif-card-sorting-card motif-card-sorting-lifted"><span className="motif-card-sorting-label"><span>2</span>Prototype</span><Grip /></span>
      <span className="motif-card-sorting-slot" />
      <span className="motif-card-sorting-card"><span>3</span>Launch</span>
    </div>
  ),
  chart: () => (
    <svg className="motif-chart" width="200" height="112" viewBox="0 0 200 112">
      {[1, 37, 73].map(y => <line key={y} className="motif-chart-grid" x1="0" y1={y} x2="200" y2={y} />)}
      {bars.map(([x, y, height, series]) => <rect key={x} className={`motif-chart-series-${series}`} x={x} y={y} width="14" height={height} rx="3" />)}
      <line className="motif-chart-axis" x1="0" y1="110.5" x2="200" y2="110.5" />
    </svg>
  ),
  "chart-card": () => (
    <div className="motif-chart-card">
      <div className="motif-chart-card-figure">
        <span className="motif-chart-card-label">Weekly active</span>
        <span className="motif-chart-card-value">12,480<span className="motif-chart-card-change">+8.2%</span></span>
      </div>
      <svg width="168" height="36" viewBox="0 0 168 36"><path d="M0 30 L24 26 L48 28 L72 18 L96 20 L120 12 L144 14 L168 4" /></svg>
    </div>
  ),
  diagram: () => (
    <div className="motif-diagram">
      <svg width="259" height="176" viewBox="0 0 259 176"><path d="M88 88 H112 V52 H136" /><path d="M88 88 H112 V124 H136" /></svg>
      <span className="motif-diagram-node motif-diagram-ingest" style={{ left: 24, top: 73, width: 64 }}><span />Ingest</span>
      <span className="motif-diagram-node motif-diagram-transform" style={{ left: 136, top: 37, width: 92 }}><span />Transform</span>
      <span className="motif-diagram-node motif-diagram-archive" style={{ left: 136, top: 109, width: 92 }}><span />Archive</span>
    </div>
  ),
  "knowledge-graph-explorer": () => (
    <div className="motif-knowledge-graph-explorer">
      <svg width="259" height="176" viewBox="0 0 259 176">
        {[[72, 86], [190, 84], [96, 148], [170, 150]].map(([x, y]) => <line key={`${x}`} x1="128" y1="108" x2={x} y2={y} />)}
        <line x1="72" y1="86" x2="40" y2="122" />
        <line x1="190" y1="84" x2="222" y2="120" />
        {[[72, 86, 7], [190, 84, 7], [96, 148, 6], [170, 150, 6], [40, 122, 5], [222, 120, 5]].map(([cx, cy, r]) => <circle key={`${cx}`} className="motif-graph-node" cx={cx} cy={cy} r={r} />)}
        <circle className="motif-graph-hub" cx="128" cy="108" r="11" />
      </svg>
      <span className="motif-knowledge-graph-explorer-search"><Search size={12} />Onboarding</span>
    </div>
  ),
  network: () => (
    <svg className="motif-network" width="200" height="132" viewBox="0 0 200 132">
      {[[40, 40, 100, 66], [40, 40, 30, 100], [100, 66, 30, 100], [100, 66, 160, 34], [100, 66, 150, 108], [160, 34, 150, 108], [100, 66, 96, 118]].map(([x1, y1, x2, y2]) => <line key={`${x1}${y1}${x2}${y2}`} x1={x1} y1={y1} x2={x2} y2={y2} />)}
      <line className="motif-network-path" x1="100" y1="66" x2="160" y2="34" />
      {[[40, 40, 9], [30, 100, 7], [150, 108, 10], [96, 118, 6]].map(([cx, cy, r]) => <circle key={`${cx}`} className="motif-graph-node motif-graph-node-ringed" cx={cx} cy={cy} r={r} />)}
      <circle className="motif-graph-hub" cx="100" cy="66" r="13" />
      <circle className="motif-graph-hub" cx="160" cy="34" r="9" />
    </svg>
  ),
  "network-canvas": () => (
    <svg className="motif-network-canvas" width="220" height="140" viewBox="0 0 220 140">
      {cloudLinks.map(([x1, y1, x2, y2]) => <line key={`${x1}${y1}${x2}${y2}`} x1={x1} y1={y1} x2={x2} y2={y2} />)}
      {cloud.map(([cx, cy, r]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />)}
      <circle className="motif-graph-hub" cx="110" cy="70" r="7" />
    </svg>
  ),
  sparkline: () => (
    <div className="motif-sparkline">
      <div className="motif-sparkline-row">
        <span className="motif-sparkline-figure"><span>Orders</span>1,204</span>
        <svg className="motif-sparkline-up" width="88" height="28" viewBox="0 0 88 28"><path d="M1 22 L12 18 L23 20 L34 12 L45 15 L56 8 L67 11 L80 4" /><circle cx="80" cy="4" r="3" /></svg>
      </div>
      <span className="motif-sparkline-rule" />
      <div className="motif-sparkline-row">
        <span className="motif-sparkline-figure"><span>Returns</span>38</span>
        <svg className="motif-sparkline-down" width="88" height="28" viewBox="0 0 88 28"><path d="M1 10 L12 14 L23 9 L34 16 L45 13 L56 19 L67 17 L80 22" /><circle cx="80" cy="22" r="3" /></svg>
      </div>
    </div>
  ),
  "stat-tiles": () => (
    <div className="motif-stat-tiles">
      {[["Uptime", "99.9%", "+0.1", "success"], ["Latency", "182ms", "+24", "warning"], ["Errors", "0.4%", "−0.2", "success"]].map(([label, value, change, tone]) => (
        <span key={label} className="motif-stat-tiles-tile"><span>{label}</span>{value}<span className={`motif-tone-${tone}`}>{change}</span></span>
      ))}
    </div>
  ),
  "status-matrix": () => (
    <svg className="motif-status-matrix" width="112" height="112" viewBox="0 0 112 112">
      {matrix.map((state, index) => <rect key={index} className={`motif-status-matrix-${state}`} x={(index % 5) * 24} y={Math.floor(index / 5) * 24} width="16" height="16" rx="4" />)}
    </svg>
  ),
  table: () => (
    <div className="motif-table">
      <div className="motif-table-head"><span>Name</span><span>Status</span><span>Size</span></div>
      {rows.map(row => (
        <div key={row.name} className="motif-table-row"><span>{row.name}</span><span className={`motif-tone-${row.tone}`}>{row.status}</span><span>{row.size}</span></div>
      ))}
    </div>
  ),
};
