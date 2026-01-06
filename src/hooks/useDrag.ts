import { useRef, useCallback } from 'react';

interface DragCallbacks {
  onDragMove: (id: string, x: number, y: number) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
}

export function useDrag(
  scale: number,
  _svgRef: React.RefObject<SVGSVGElement | null>,
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
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      const d = dragging.current;
      const dx = (e.clientX - d.startX) / scale;
      const dy = (e.clientY - d.startY) / scale;
      // Only commit to history if position actually changed (threshold: 0.5px)
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        callbacks.onDragEnd(d.id, d.origX + dx, d.origY + dy);
      }
      dragging.current = null;
    },
    [scale, callbacks],
  );

  return { onPointerDown, onPointerMove, onPointerUp, isDragging: () => dragging.current !== null };
}
