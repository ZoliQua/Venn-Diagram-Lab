import { useState, useCallback, useRef } from 'react';

export interface ZoomPanState {
  scale: number;
}

export function useZoomPan() {
  const [state, setState] = useState<ZoomPanState>({
    scale: 1,
  });

  const isPanning = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const spaceDown = useRef(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const setContainerRef = useCallback((el: HTMLDivElement | null) => {
    containerRef.current = el;
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    // If Ctrl/Meta held: zoom. Otherwise: let native scroll happen.
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setState(s => ({
        ...s,
        scale: Math.max(0.1, Math.min(20, s.scale * delta)),
      }));
    }
    // Without Ctrl: native scroll (scrollbars work naturally)
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    // Middle mouse button or Space+left click → scroll-pan
    if (e.button === 1 || (e.button === 0 && spaceDown.current)) {
      isPanning.current = true;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      e.preventDefault();
    }
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning.current || !containerRef.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    containerRef.current.scrollLeft -= dx;
    containerRef.current.scrollTop -= dy;
  }, []);

  const onPointerUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space') {
      spaceDown.current = true;
    }
  }, []);

  const onKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space') {
      spaceDown.current = false;
    }
  }, []);

  const zoomIn = useCallback(() => {
    setState(s => ({ ...s, scale: Math.min(20, s.scale * 1.2) }));
  }, []);

  const zoomOut = useCallback(() => {
    setState(s => ({ ...s, scale: Math.max(0.1, s.scale / 1.2) }));
  }, []);

  const resetZoom = useCallback(() => {
    setState({ scale: 1 });
    if (containerRef.current) {
      containerRef.current.scrollLeft = 0;
      containerRef.current.scrollTop = 0;
    }
  }, []);

  return {
    state,
    setContainerRef,
    onWheel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onKeyDown,
    onKeyUp,
    zoomIn,
    zoomOut,
    resetZoom,
  };
}
