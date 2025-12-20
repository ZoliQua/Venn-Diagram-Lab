export interface VennDocument {
  filename: string;
  rawSvgAttrs: string;
  viewBox: { x: number; y: number; w: number; h: number };
  comment: string;
  shapes: VennShape[];
  texts: {
    header: VennText | null;
    names: VennText[];
    values: VennText[];
    sums: VennText[];
  };
  bullets: VennBullet[];
  meta: {
    headerHidden: boolean;
    bulletsHidden: boolean;
    // Editor-only visibility (not saved to SVG)
    hiddenIds: Set<string>;
    hiddenGroups: Set<string>;
  };
}

export interface VennShape {
  id: string;
  tagName: string;
  attributes: Record<string, string>;
  style: string;
}

export interface VennText {
  id: string;
  x: number;
  y: number;
  content: string;
  style: string;
  transformExtra?: string;
}

export interface VennBullet {
  id: string;
  cx: number;
  cy: number;
  r: number;
  style: string;
}

export type SelectableElement =
  | { type: 'shape'; element: VennShape }
  | { type: 'text'; element: VennText; group: 'header' | 'names' | 'values' | 'sums' }
  | { type: 'bullet'; element: VennBullet };
