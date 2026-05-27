/**
 * Guided tour step definitions (v1.13.0).
 *
 * The tour is declarative: TOUR_STEPS is an ordered list of steps, each
 * with an optional DOM selector to highlight, a title + body, and a pre-
 * rendered `enter` action that the TourOverlay host dispatches before
 * drawing the step. Keeping the list declarative lets us test it and edit
 * it without touching UI code.
 */

export type TourAction =
  | { kind: 'none' }
  | { kind: 'setSidebarOpen'; section: 'fileInfo' | 'model' | 'mapping' | 'view'; open: boolean }
  | { kind: 'setRightTab'; tab: 'properties' | 'statistics' }
  | { kind: 'setPlotsOpen'; open: boolean }
  | { kind: 'setViewStyle'; style: 'layer' | 'cut' | 'upset' | 'network' }
  | { kind: 'cycleViewStyles'; intervalMs: number }
  | { kind: 'enterPlotEdit'; plot: 'bar' | 'lollipop' | 'heatmap' }
  | { kind: 'cyclePlotEdits'; intervalMs: number; scrollAfterSelector?: string }
  | { kind: 'exitPlotEdit' }
  | { kind: 'selectRegion'; label: string }
  | { kind: 'scrollIntoView'; selector: string; delayMs?: number };

export interface TourStep {
  id: string;
  selector?: string;              // Highlighted DOM element (omit for center-modal steps)
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'right-top' | 'center';
  title: string;
  body: string;
  enterActions?: TourAction[];    // Dispatched once on step activation
  autoAdvanceMs?: number;         // When set, the step advances itself (no Next button)
}

/** A step is user-replayable if it contains at least one cycle animation. */
export function isStepReplayable(step: TourStep): boolean {
  return !!step.enterActions?.some(a => a.kind === 'cycleViewStyles' || a.kind === 'cyclePlotEdits');
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    placement: 'center',
    title: 'Welcome to the tour',
    body:
      "Let's explore Data mode together. We've pre-loaded a " +
      "cancer-driver gene collection (COSMIC, OncoKB, IntOGen, Vogelstein) and laid " +
      "it out on a 4-set Edwards diagram. Click Next whenever you're ready.",
  },
  {
    id: 'toolbar-open',
    selector: '[data-tour="toolbar-data-open"]',
    placement: 'bottom',
    title: 'Loading data',
    body:
      'Data mode accepts CSV, TSV, TXT, GMT, and GMX files — from your disk, pasted ' +
      'text, a URL, or a curated sample dataset. Open is where every flow begins.',
  },
  {
    id: 'sidebar-file-info',
    selector: '[data-tour="sidebar-file-info"]',
    placement: 'right',
    title: 'File Info',
    body:
      'Once a file is loaded, this panel shows the filename, format (binary or ' +
      'aggregated), column count, and total row count — everything you need to ' +
      'sanity-check the import.',
    enterActions: [{ kind: 'setSidebarOpen', section: 'fileInfo', open: true }],
  },
  {
    id: 'sidebar-model',
    selector: '[data-tour="sidebar-model"]',
    placement: 'right',
    title: 'Pick a Venn diagram',
    body:
      '44 models cover 2 to 9 sets across every major construction method — Venn, ' +
      'Edwards, Anderson, Grünbaum, Bannier & Bodin, and more. We chose a 4-set ' +
      'Edwards diagram for this tour.',
    enterActions: [{ kind: 'setSidebarOpen', section: 'model', open: true }],
  },
  {
    id: 'sidebar-mapping',
    selector: '[data-tour="sidebar-mapping"]',
    placement: 'right',
    title: 'Map columns to sets',
    body:
      'Each row of your data belongs to 0, 1, or several sets. Here you map data ' +
      "columns onto the diagram's sets A, B, C… and tune the colours and opacity " +
      "to taste. Long column names are auto-scaled so they still fit the diagram.",
    enterActions: [{ kind: 'setSidebarOpen', section: 'mapping', open: true }],
  },
  {
    id: 'sidebar-view',
    selector: '[data-tour="sidebar-view"]',
    placement: 'right',
    title: 'Four ways to look at it',
    body:
      'Layer, Cut, UpSet, and Network offer complementary perspectives. Watch: ' +
      "we'll cycle through all four now. Switch back to Layer after the preview.",
    enterActions: [
      { kind: 'setSidebarOpen', section: 'view', open: true },
      { kind: 'cycleViewStyles', intervalMs: 900 },
    ],
  },
  {
    id: 'right-panel-properties',
    selector: '[data-tour="right-panel"]',
    placement: 'left',
    title: 'Region details (Properties)',
    body:
      'The right panel has two tabs: Properties shows the selected region’s ' +
      'details, and Statistics shows aggregate pairwise stats. We’ve selected ' +
      'the 4-way intersection (ABCD) — the genes shared by all four cancer ' +
      'driver databases. You can click any region on the diagram, or use ' +
      'Find Item above to jump to a specific gene.',
    enterActions: [
      { kind: 'setViewStyle', style: 'layer' },
      { kind: 'setRightTab', tab: 'properties' },
      { kind: 'selectRegion', label: 'ABCD' },
    ],
  },
  {
    id: 'right-panel-statistics',
    selector: '[data-tour="right-panel-tabs"]',
    placement: 'left',
    title: 'Statistics at a glance',
    body:
      'Switch to the Statistics tab for aggregate pairwise metrics: Jaccard, ' +
      'Sørensen–Dice, and the hypergeometric enrichment test with ' +
      'Benjamini–Hochberg FDR for every pair of sets.',
    enterActions: [
      { kind: 'setRightTab', tab: 'statistics' },
    ],
  },
  {
    id: 'right-panel-enrichment',
    selector: '[data-tour="right-panel-enrichment-plots"]',
    placement: 'left',
    title: 'Enrichment Plots',
    body:
      'The Enrichment Plots card on the right shows Bar, Lollipop, and Heatmap ' +
      'thumbnails of the same FDR data. Watch: we’ll click through Bar → Lollipop → ' +
      'Heatmap. The pairwise statistics below stay in sync; we’ll scroll to them ' +
      'after the Heatmap so you can cross-check. Export SVG under each thumbnail ' +
      'downloads that plot with your current styling.',
    enterActions: [
      { kind: 'setPlotsOpen', open: true },
      { kind: 'scrollIntoView', selector: '[data-tour="right-panel-enrichment-plots"]' },
      { kind: 'cyclePlotEdits', intervalMs: 1100, scrollAfterSelector: '[data-tour="right-panel-stats-tables"]' },
    ],
  },
  {
    id: 'sidebar-plot-editor',
    selector: '[data-tour="sidebar-plot-editor"]',
    placement: 'right-top',
    title: 'Plot editor',
    body:
      "Clicking a plot swaps the left sidebar's View section for a dedicated editor — " +
      'colours, fonts, background, axis labels, legend toggles. We stopped on the ' +
      'Heatmap in the previous step, so the editor now targets it. Back to Diagram ' +
      'returns you to the normal view; your per-plot style changes are preserved.',
  },
  {
    id: 'stats-share-dist',
    selector: '[data-plot-card="shareDistribution"]',
    placement: 'left',
    title: 'Item Share Distribution',
    body:
      'How many items are unique to one set vs shared across all sets? This bar ' +
      'chart gives the per-membership-count breakdown.',
    enterActions: [
      { kind: 'exitPlotEdit' },
      { kind: 'setPlotsOpen', open: true },
      { kind: 'scrollIntoView', selector: '[data-plot-card="shareDistribution"]' },
    ],
  },
  {
    id: 'stats-cluster-heatmap',
    selector: '[data-plot-card="heatmap"] [data-tour="cluster-toggle"]',
    placement: 'left',
    title: 'Cluster the Heatmap',
    body:
      'Switch to Cluster axis order to reorder the heatmap by UPGMA hierarchical ' +
      'clustering on 1 − Jaccard distance. Dendrograms appear on the top and ' +
      'left edges.',
    enterActions: [
      { kind: 'setPlotsOpen', open: true },
      { kind: 'enterPlotEdit', plot: 'heatmap' },
      { kind: 'scrollIntoView', selector: '[data-tour="cluster-toggle"]' },
    ],
  },
  {
    id: 'toolbar-reports',
    selector: '[data-tour="toolbar-reports"]',
    placement: 'bottom',
    title: 'Export everything',
    body:
      'Report PDF produces a single multi-page PDF. Full Report (zip) bundles ' +
      'the PDF plus standalone SVGs, TSVs, and an Excel workbook with three ' +
      'statistics sheets — ideal for supplementary material.',
    enterActions: [{ kind: 'exitPlotEdit' }],
  },
  {
    id: 'end',
    placement: 'center',
    title: "You're ready",
    body:
      "That's the complete Data-mode workflow. Click Finish to return to the " +
      'welcome screen, or Back to revisit any step. You can restart this tour ' +
      'anytime from the Help dialog.',
  },
];
