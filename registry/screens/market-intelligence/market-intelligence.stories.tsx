import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { BarChart, Chart, LineChart } from "@/ui/chart/chart.tsx";
import { Sparkline } from "@/ui/sparkline/sparkline.tsx";
import { Table } from "@/ui/table/table.tsx";
import { Tabs } from "@/ui/tabs/tabs.tsx";
import { ChartCard } from "../../blocks/chart-card/chart-card.tsx";
import { StatTiles } from "../../blocks/stat-tiles/stat-tiles.tsx";

/*
 * The stand-in consumer screen for charts V2 (docs/charts-and-graphs-plan.md,
 * Phase V2 exit). No product screen runs these charts yet, so this one
 * rebuilds the charted parts of the service portal's Market intelligence
 * section — Overview, Share of search, Categories — from library parts only,
 * on placeholder data. Every Recharts call site the portal has is mapped to a
 * library part here, or to a recorded gap (plan §5, "V2 stand-in").
 *
 * It is a story, not a distributed item: it is not in the manifest, ships to
 * no one, and is checked by the stories project's axe pass like any other.
 */

const meta: Meta = {
  title: "Screens/Market intelligence",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

// ── Placeholder data ────────────────────────────────────────────────────────
// Reserved .example domains (RFC 2606), named after the design-component
// placeholder set; the longest first, where it would break a lane.

const BRANDS = [
  { key: "mullerBrockmann", label: "muller-brockmann.example", slot: 1 },
  { key: "crouwel", label: "crouwel.example", slot: 2 },
  { key: "vignelli", label: "vignelli.example", slot: 3 },
  { key: "aicher", label: "aicher.example", slot: 4 },
] as const;

const SHARE = {
  mullerBrockmann: [24.1, 24.8, 25.2, 26.0, 25.6, 26.9, 27.4, 28.1, 28.0, 29.2, 30.1, 31.4],
  crouwel: [31.0, 30.6, 30.9, 30.1, 29.8, 29.0, 28.7, 28.9, 28.2, 27.6, 27.1, 26.5],
  vignelli: [22.4, 22.9, 22.1, 22.6, 23.0, 22.7, 22.4, 22.0, 22.5, 22.3, 21.9, 22.0],
  aicher: [12.2, 12.0, 12.5, 12.1, 12.4, 12.3, 12.6, 12.2, 12.4, 12.1, 12.3, 11.9],
};

/** Monthly rows on a real time axis: Dec 1971 … Nov 1972. Shares are fractions. */
const MONTHLY = Array.from({ length: 12 }, (_, i) => ({
  month: new Date(Date.UTC(1971, 11 + i, 1)),
  mullerBrockmann: SHARE.mullerBrockmann[i]! / 100,
  crouwel: SHARE.crouwel[i]! / 100,
  vignelli: SHARE.vignelli[i]! / 100,
  aicher: SHARE.aicher[i]! / 100,
}));

/** The portal's spotlight: the brand's own share as a 3-month moving average. */
const OWN_TREND = MONTHLY.map((row, i) => {
  const window = MONTHLY.slice(Math.max(0, i - 2), i + 1);
  return { month: row.month, share: window.reduce((sum, r) => sum + r.mullerBrockmann, 0) / window.length };
});

const BASKET_AVERAGE = 0.25;

/** Latest share by brand, ranked — the portal's share-bar column. */
const LATEST_SHARE = BRANDS.map((b) => ({ domain: b.label, share: SHARE[b.key].at(-1)! / 100 })).sort((a, b) => b.share - a.share);

const PERCENT: Intl.NumberFormatOptions = { style: "percent", maximumFractionDigits: 1 };

interface KeywordRow {
  keyword: string;
  volume: number;
  trend: number[];
  trendWords: string;
  rank: number | null;
}

const KEYWORDS: KeywordRow[] = [
  { keyword: "swiss poster design", volume: 14800, trend: [9, 10, 10, 12, 11, 13, 14, 14, 15, 16, 17, 18], trendWords: "Doubled over the year, rising in eight of eleven months.", rank: 2 },
  { keyword: "grid systems in graphic design", volume: 9900, trend: [12, 12, 13, 12, 12, 13, 13, 12, 13, 13, 12, 13], trendWords: "Flat all year.", rank: 1 },
  { keyword: "asymmetric typography", volume: 6600, trend: [15, 14, 14, 13, 13, 12, 11, 11, 10, 10, 9, 9], trendWords: "Fell steadily, down about 40%.", rank: 4 },
  { keyword: "wayfinding signage", volume: 5400, trend: [6, 7, 6, 8, 9, 8, 10, 11, 10, 12, 12, 13], trendWords: "More than doubled over the year.", rank: null },
  { keyword: "pictogram set", volume: 2900, trend: [8, 8, 9, 8, 8, 8, 9, 8, 8, 9, 8, 8], trendWords: "Flat all year.", rank: 7 },
];

/** One scale for the whole Trend column, so slopes compare down it (Sparkline `domain`). */
const TREND_DOMAIN = [0, Math.max(...KEYWORDS.flatMap((k) => k.trend))] as const;

const INTENT = [
  { key: "informational", label: "Informational" },
  { key: "commercial", label: "Commercial" },
  { key: "transactional", label: "Transactional" },
] as const;

const CATEGORIES = [
  { category: "Posters", informational: 18200, commercial: 9400, transactional: 4100 },
  { category: "Typography", informational: 15600, commercial: 5200, transactional: 1900 },
  { category: "Wayfinding", informational: 7400, commercial: 6100, transactional: 2600 },
  { category: "Branding", informational: 6900, commercial: 7800, transactional: 3300 },
  { category: "Pictograms", informational: 4200, commercial: 1800, transactional: 700 },
];

/** The portal's trend-distribution bar, as ranked rows (a part-of-whole bar is not built). */
const TREND_BUCKETS = [
  { bucket: "Stable", count: 14 },
  { bucket: "Growing", count: 9 },
  { bucket: "Declining", count: 5 },
  { bucket: "Insufficient signal", count: 3 },
];

// ── Sections ────────────────────────────────────────────────────────────────

function SectionHead({ title, children }: { title: string; children?: string }) {
  return (
    <div className="flex flex-col gap-xs">
      <h2 className="m-0 text-title-sm text-balance text-ink-primary">{title}</h2>
      {children ? <p className="m-0 text-body-sm text-pretty text-ink-muted">{children}</p> : null}
    </div>
  );
}

function Overview({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="flex flex-col gap-2xl">
      {/* Portal: three hand-rolled count tiles. */}
      <StatTiles aria-label="This analysis run">
        {/* Counts only, as the portal shows them: it has no previous run to
            compare with, and a change line here would be a need nobody has. */}
        <StatTiles.Tile label="Active insights" value={isLoading ? null : "12"} isLoading={isLoading} />
        <StatTiles.Tile label="Signals this run" value={isLoading ? null : "48"} isLoading={isLoading} />
        <StatTiles.Tile label="Open suggestions" value={isLoading ? null : "7"} isLoading={isLoading} />
      </StatTiles>

      <div className="grid grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] items-start gap-xl max-[880px]:grid-cols-1">
        {/* Portal: SosTrendCard — headline share over a smoothed line. */}
        <ChartCard
          label="Share of search"
          description="Our three-month average rose every month and crossed the 25% basket average in March."
          value={isLoading ? "—" : "30.2%"}
          // Relative to the share itself, so the comparison names the base: a bare
          // "25%" beside "30.2%" reads as 25 points (it is 6.1). Percentage
          // points are a recorded gap (plan §5, V2 stand-in).
          delta={{ change: 0.25, comparison: "on Dec 1971's 24.1%" }}
          data={isLoading ? [] : OWN_TREND}
          x="month"
          xLabel="Month"
          xScale="time"
          series={[{ key: "share", label: "muller-brockmann.example, 3-month average", slot: 1 }]}
          format={PERCENT}
          locale="en-GB"
          isLoading={isLoading}
          onSelect={fn()}
        />

        {/* Portal: TrendDistributionBar — a stacked status bar. */}
        <BarChart
          orientation="horizontal"
          size="sm"
          label="Category trends"
          description="Stable is the largest group, 14 of 31 categories; nine are growing, five declining and three lack the signal to say."
          data={isLoading ? [] : TREND_BUCKETS}
          x="bucket"
          xLabel="Trend"
          series={[{ key: "count", label: "Categories" }]}
          locale="en-GB"
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

function SearchShare({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="flex flex-col gap-2xl">
      <section className="flex flex-col gap-lg">
        <SectionHead title="Monthly trend">Each brand's share of the basket's search volume.</SectionHead>
        {/* Portal: SosAreaChart — overlapping gradient areas. Lines here: four
            overlapping fades go muddy (ChartCard doc), and lines toggle. */}
        <LineChart
          label="Share of search by brand"
          description="muller-brockmann.example overtook crouwel.example in September and leads with 31.4%; the other two held level."
          data={isLoading ? [] : MONTHLY}
          x="month"
          xLabel="Month"
          xScale="time"
          series={BRANDS.map((b) => ({ key: b.key, label: b.label, slot: b.slot }))}
          format={PERCENT}
          locale="en-GB"
          isLoading={isLoading}
        />
      </section>

      <div className="grid grid-cols-2 items-start gap-xl max-[880px]:grid-cols-1">
        <section className="flex flex-col gap-lg">
          <SectionHead title="Current share">November 1972.</SectionHead>
          {/* Portal: the share-bar column of the brand table. */}
          <BarChart
            orientation="horizontal"
            size="sm"
            label="Share of search, November 1972"
            description="muller-brockmann.example leads with 31.4%, ahead of crouwel.example at 26.5%."
            data={isLoading ? [] : LATEST_SHARE}
            x="domain"
            xLabel="Brand"
            series={[{ key: "share", label: "Share" }]}
            format={PERCENT}
            locale="en-GB"
            isLoading={isLoading}
          />
        </section>

        <section className="flex flex-col gap-lg">
          <SectionHead title="Against the basket">Our monthly share beside the average of all four brands.</SectionHead>
          <Chart
            size="sm"
            label="Our share against the basket average"
            description="Above the 25% basket average every month since February."
            data={isLoading ? [] : MONTHLY}
            x="month"
            xLabel="Month"
            xScale="time"
            series={[{ key: "mullerBrockmann", label: "muller-brockmann.example", slot: 1 }]}
            format={PERCENT}
            locale="en-GB"
            isLoading={isLoading}
          >
            <Chart.Lines />
            <Chart.Rule value={BASKET_AVERAGE} label="Basket average 25%" />
          </Chart>
        </section>
      </div>

      <section className="flex flex-col gap-lg">
        <SectionHead title="Top keywords">Monthly search volume, twelve months of indexed interest on one scale, and our rank.</SectionHead>
        {/* Portal: TrendSparkline at 50×20 in a table cell. */}
        <Table<KeywordRow>
          caption="Top keywords by search volume"
          size="sm"
          // Lanes 96 + 152 + 96 leave the keyword nothing at 320px, and a fixed
          // table squeezes rather than scrolls: give the keyword ~200px, then scroll.
          minWidth={560}
          rows={KEYWORDS}
          getRowId={(r) => r.keyword}
          isLoading={isLoading}
          columns={[
            { key: "keyword", header: "Keyword", isPrimary: true, cell: (r) => r.keyword },
            { key: "volume", header: "Volume", width: 96, isNumeric: true, cell: (r) => r.volume.toLocaleString("en-GB") },
            {
              key: "trend",
              header: "Trend",
              width: 152,
              cell: (r) => <Sparkline size="sm" data={r.trend} domain={TREND_DOMAIN} label={`${r.keyword}, search interest by month, indexed`} description={r.trendWords} />,
            },
            { key: "rank", header: "Our rank", width: 96, isNumeric: true, cell: (r) =>
                r.rank === null ? (
                  <>
                    <span aria-hidden="true">—</span>
                    <span className="sr-only">Not ranked</span>
                  </>
                ) : (
                  String(r.rank)
                ),
            },
          ]}
        />
      </section>
    </div>
  );
}

function Categories({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="flex flex-col gap-2xl">
      <section className="flex flex-col gap-lg">
        <SectionHead title="Volume by intent">Monthly searches in each category, split by what the searcher wants.</SectionHead>
        {/* Portal: per-category bars and 100% intent strips. Stacked columns
            here; a 100% stack is not built. */}
        <BarChart
          isStacked
          label="Search volume by category and intent"
          description="Posters draw the most searches; Branding is the only category where commercial searches outnumber informational ones."
          data={isLoading ? [] : CATEGORIES}
          x="category"
          xLabel="Category"
          series={INTENT.map((s) => ({ key: s.key, label: s.label }))}
          format={{ notation: "compact" }}
          locale="en-GB"
          isLoading={isLoading}
          onSelect={fn()}
        />
      </section>
    </div>
  );
}

// ── The screen ──────────────────────────────────────────────────────────────

type Tab = "overview" | "share" | "categories";

function MarketIntelligence({ tab = "overview", isLoading = false }: { tab?: Tab; isLoading?: boolean }) {
  return (
    <main className="min-h-screen bg-base px-lg py-2xl">
      <div className="mx-auto flex max-w-[1152px] flex-col gap-xl">
        <header className="flex flex-col gap-xs">
          <h1 className="m-0 text-title-lg text-balance text-ink-primary">Market intelligence</h1>
          <p className="m-0 text-body-sm text-pretty text-ink-muted">muller-brockmann.example against three competitors · analysis of November 1972</p>
        </header>
        <Tabs defaultValue={tab}>
          <Tabs.List aria-label="Intelligence views">
            <Tabs.Tab value="overview">Overview</Tabs.Tab>
            <Tabs.Tab value="share">Share of search</Tabs.Tab>
            <Tabs.Tab value="categories">Categories</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="overview" className="pt-xl">
            <Overview isLoading={isLoading} />
          </Tabs.Panel>
          <Tabs.Panel value="share" className="pt-xl">
            <SearchShare isLoading={isLoading} />
          </Tabs.Panel>
          <Tabs.Panel value="categories" className="pt-xl">
            <Categories isLoading={isLoading} />
          </Tabs.Panel>
        </Tabs>
      </div>
    </main>
  );
}

export const OverviewTab: Story = { name: "Overview", render: () => <MarketIntelligence tab="overview" /> };
export const ShareOfSearchTab: Story = { name: "Share of search", render: () => <MarketIntelligence tab="share" /> };
export const CategoriesTab: Story = { name: "Categories", render: () => <MarketIntelligence tab="categories" /> };
export const Loading: Story = { render: () => <MarketIntelligence isLoading /> };
