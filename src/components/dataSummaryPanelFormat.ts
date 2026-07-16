// Display-only p-value formatter for the Data-mode statistics panel.
//
// Extracted from DataSummaryPanel.tsx so that component file exports only
// components (eslint-plugin-react-hooks / react-refresh requires it for Fast
// Refresh to work). This is the on-screen renderer only — it is deliberately
// NOT the byte-parity formatter used by the TSV/PDF/XLSX exports, which live
// in exportData.ts / pdfReport.ts / statisticsWorkbook.ts and must not change.
export function formatP(p: number): string {
  if (p === 0) return '< 1e-300';
  if (p < 0.001) return p.toExponential(1);
  return p.toFixed(4);
}
