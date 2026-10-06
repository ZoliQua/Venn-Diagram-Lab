export const APP_VERSION = '2.9.0';
export const APP_NAME = 'Venn Diagram Lab';
export const APP_RELEASE_DATE = '2026-10-05';

/** Published versions of the headless companion packages (kept in lockstep with APP_VERSION). */
export const COMPANION_VERSIONS = {
  python: '2.9.0', // PyPI: venn-diagram-lab
  r: '2.9.0',      // CRAN: vennDiagramLab
  node: '2.9.0',   // npm: venn-diagram-lab
} as const;

/** Git tag of the release that all four surfaces were published from. */
export const RELEASE_TAG = 'v2.9.0';
