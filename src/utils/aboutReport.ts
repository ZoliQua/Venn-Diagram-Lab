/**
 * "About This Report" content — shared source of truth used by both:
 *   - the PDF report's last page (via pdfReport.ts)
 *   - the zip-bundle README.txt (via zipReport.ts)
 *
 * Extracted in v1.12.0. The strings are copied verbatim from the previous
 * inline pdfReport.ts array so the PDF output stays byte-identical.
 */

export interface AboutReportSection {
  title: string;
  text: string;          // empty string means "group header" (no body text)
}

export const ABOUT_REPORT_SECTIONS: AboutReportSection[] = [
  {
    title: 'Venn Diagram Lab',
    text: 'Venn Diagram Lab is an interactive tool for visualizing set relationships using Venn diagrams. It supports 2 to 9 overlapping sets across 44 diagram models, covering all major construction methods (Venn, Edwards, Anderson, Carroll, Bannier-Bodin, Grunbaum, Mamakani, and SUMO-Venn). Users can import their own datasets in CSV, TSV, GMT, or GMX format, map data columns to diagram sets, and generate intersection counts automatically. The tool calculates both exclusive counts (items belonging to exactly one specific combination of sets) and inclusive counts (items contained in every set of a given combination, regardless of whether they also appear in other sets).',
  },
  {
    title: 'Plots',
    text: '',
  },
  {
    title: '1. Venn Diagrams',
    text: 'A Venn diagram displays all possible logical relations between a finite collection of sets. Each set is represented as a closed shape, and overlapping areas represent intersections -- items that belong to multiple sets simultaneously. For n sets, there are (2^n)-1 possible non-empty regions. The diagram allows researchers to visually identify which items are shared between groups, which are unique to a single group, and how extensively the groups overlap. In this report, exclusive region counts are shown: each item is counted exactly once, in the region corresponding to its precise combination of set memberships.',
  },
  {
    title: '2. UpSet Plots',
    text: 'An UpSet plot is a scalable alternative to Venn diagrams for quantifying set intersections. Instead of overlapping shapes, it uses a matrix layout: rows represent the sets, columns represent specific intersections, and filled dots connected by lines indicate which sets participate in each intersection. Vertical bars above the matrix show the size (item count) of each intersection, sorted by size in descending order. Horizontal bars on the left show the total size of each set. UpSet plots are particularly useful for more than 4 sets, where traditional Venn diagrams become visually complex. This report shows the top 20 intersections by size.',
  },
  {
    title: '3. Set Relationship Network',
    text: 'The network diagram is a force-directed graph that visualizes pairwise relationships between sets. Each node represents a set, sized proportionally to its cardinality and colored with the standard Venn color scheme. Edges connect pairs of sets that share items, with edge thickness proportional to the chosen weight metric (intersection count, Jaccard index, Fold Enrichment, or Overlap Coefficient). Edge color indicates statistical significance: green edges are significant (FDR < 0.05), grey edges are not. The layout is computed using a spring-embedder algorithm with repulsive forces between all nodes and attractive forces along edges. This visualization is especially useful for identifying clusters of related sets and understanding the overall topology of set relationships at a glance.',
  },
  {
    title: 'Statistics',
    text: '',
  },
  {
    title: '1. Pairwise Jaccard Index',
    text: 'The Jaccard similarity index measures the overlap between two sets as the ratio of their intersection size to their union size: J(A,B) = |A inter B| / |A union B|. Values range from 0 (no shared items) to 1 (identical sets). A Jaccard index above 0.7 suggests high similarity, while below 0.1 indicates very little overlap. The Overlap Coefficient is a related measure: OC(A,B) = |A inter B| / min(|A|, |B|), which is more useful when one set is much smaller than the other.',
  },
  {
    title: '2. Sorensen-Dice Index',
    text: 'The Sorensen-Dice coefficient is another similarity measure, defined as D(A,B) = 2*|A inter B| / (|A| + |B|). It gives more weight to shared items than the Jaccard index and is widely used in ecological and bioinformatics studies. Like Jaccard, values range from 0 to 1, with higher values indicating greater similarity between sets.',
  },
  {
    title: '3. Intersection Enrichment (Hypergeometric Test)',
    text: 'The hypergeometric test evaluates whether the observed overlap between two sets is greater than expected by chance. Given a total population of N items, where set A contains K items and set B contains n items, the test calculates the probability of observing k or more shared items under a random null model (sampling without replacement). The Fold Enrichment (FE) is the ratio of observed to expected overlap: FE = (k/n) / (K/N). An FE > 1 indicates more overlap than expected. The p-values are corrected for multiple testing using the Benjamini-Hochberg False Discovery Rate (FDR) method. Significance levels are marked as: *** (FDR < 0.001), ** (FDR < 0.01), * (FDR < 0.05), ns (not significant).',
  },
  {
    title: '4. Bar chart',
    text: 'The bar chart plots one vertical bar per pair of sets. Bar height encodes -log10(FDR), so taller bars indicate more significant over-representation. Bars are coloured green when FDR < 0.05 and grey otherwise, and significance asterisks above each bar mark the classical thresholds: * (FDR < 0.05), ** (FDR < 0.01), *** (FDR < 0.001). The bar chart is the most direct visual summary of which pairwise overlaps survive multiple-testing correction.',
  },
  {
    title: '5. Lollipop chart',
    text: 'The lollipop chart shares the x-axis and colour coding with the bar chart, but draws each pair as a thin stick topped by a dot. The stick length still encodes -log10(FDR), while the dot area is scaled by the observed intersection count. This double encoding highlights pairs that are both statistically significant and biologically sizeable: tall stick plus large dot. Small dots on tall sticks identify small-but-significant overlaps, while short sticks on large dots identify abundant overlaps that are nevertheless consistent with chance.',
  },
  {
    title: '6. Heatmap',
    text: 'The heatmap renders a symmetric n x n matrix of pairwise -log10(FDR) values. Each cell is shaded from white (no enrichment) to dark green (strong enrichment) according to a linear colour scale shown in the legend on the right. The diagonal is marked with an em-dash because a set is not tested against itself. The matrix is symmetric: the cell (A,B) and the cell (B,A) always share the same value. In the interactive Data-mode panel the same heatmap can be switched to display Fold Enrichment, using a white-to-purple scale instead.',
  },
  {
    title: '7. Item Share Distribution',
    text: 'For each set-membership count k = 1..N, the histogram shows how many items belong to exactly k sets. A right-skewed distribution indicates high redundancy across sets; a left-skewed distribution indicates set-specific items dominate. The accompanying breakdown table lists the exact item count and percentage share for each membership level.',
  },
  {
    title: '8. Cluster Heatmap',
    text: 'Rows and columns are reordered by hierarchical clustering on 1 - Jaccard distance. The default linkage is average (UPGMA); single and complete linkage are also available. The dendrograms above and to the left of the grid show the cluster structure; closer joins indicate more similar set composition. The Original / Cluster toggle in the Data-mode panel controls which ordering is used in the live view and in this PDF.',
  },
  {
    title: 'Credits and Cite',
    text: 'Venn Diagram Lab is developed and maintained by Zoltán Dul, Márton Ölbei, N. Shaun B. Thomas, Azeddine Si Ammour, and Attila Csikász-Nagy. The tool is open-source and free to use under the MIT License.\n\nWeb tool:    https://venndiagramlab.org/\nGitHub:      https://github.com/ZoliQua/Venn-Diagram-Lab\nPyPI:        https://pypi.org/project/venn-diagram-lab/\nCRAN:        https://CRAN.R-project.org/package=vennDiagramLab\nZenodo DOI:  10.5281/zenodo.19510813\n\nCitation:\nDul Z., Ölbei M., Thomas N.S.B., Si Ammour A., Csikász-Nagy A. (2026). Venn Diagram Lab — Headless Venn diagram analysis and rendering. https://venndiagramlab.org/  doi:10.5281/zenodo.19510813',
  },
];
