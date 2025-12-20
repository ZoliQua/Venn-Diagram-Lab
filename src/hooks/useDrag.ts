import { useRef, useCallback } from 'react';

interface DragCallbacks {
  onDragMove: (id: string, x: number, y: number) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
}

export function useDrag(
  scale: number,
  svgRef: React.RefObject<SVGSVGElement | null>,
  callbacks: DragCallbacks,
) {
  const dragging = useRef<{
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent, id: string, origX: number, origY: number) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();
      dragging.current = {
        id,
        startX: e.clientX,
        startY: e.clientY,
        origX,
        origY,
      };
      (e.target as Element).setPointerCapture(e.pointerId);
    },
    [],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      const d = dragging.current;
      const dx = (e.clientX - d.startX) / scale;
      const dy = (e.clientY - d.startY) / scale;
      callbacks.onDragMove(d.id, d.origX + dx, d.origY + dy);
    },
    [scale, callbacks],
  );

  const onPointerUp = useCallback(
    (_e: React.PointerEvent) => {
      if (!dragging.current) return;
      const d = dragging.current;
      // Read current position from what was last moved
      const svg = svgRef.current;
      if (svg) {
        // Final position is already applied via onDragMove, now push to history
        const textEl = svg.querySelector(`#${CSS.escape(d.id)}`);
        if (textEl) {
          const transform = textEl.getAttribute('transform') || '';
          const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
          if (match) {
            callbacks.onDragEnd(d.id, parseFloat(match[1]), parseFloat(match[2]));
          }
        }
      }
      dragging.current = null;
    },
    [svgRef, callbacks],
  );

  return { onPointerDown, onPointerMove, onPointerUp, isDragging: () => dragging.current !== null };
}
