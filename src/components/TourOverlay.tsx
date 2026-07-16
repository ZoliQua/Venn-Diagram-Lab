import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { TourStep, TourAction } from '../utils/tourSteps.ts';
import { isStepReplayable } from '../utils/tourSteps.ts';

export interface TourOverlayProps {
  active: boolean;
  stepIndex: number;
  steps: TourStep[];
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onFinish: () => void;
  dispatchAction: (action: TourAction) => void;
}

interface Rect { top: number; left: number; width: number; height: number }

const PADDING = 8;            // gap around highlighted element
const CARD_MARGIN = 14;       // distance from element to tooltip card
const CARD_WIDTH = 340;

function readRect(selector: string): Rect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = (el as HTMLElement).getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function placementCoords(
  rect: Rect,
  placement: TourStep['placement'],
  vw: number,
  vh: number,
): { top: number; left: number } {
  const cardW = CARD_WIDTH;
  const cardHEstimate = 260;
  let top = 0;
  let left = 0;

  switch (placement) {
    case 'top':
      top = rect.top - cardHEstimate - CARD_MARGIN;
      left = rect.left + rect.width / 2 - cardW / 2;
      break;
    case 'left':
      top = rect.top + rect.height / 2 - cardHEstimate / 2;
      left = rect.left - cardW - CARD_MARGIN;
      break;
    case 'right':
      top = rect.top + rect.height / 2 - cardHEstimate / 2;
      left = rect.left + rect.width + CARD_MARGIN;
      break;
    case 'right-top':
      // Anchor the tooltip near the top of the target instead of its vertical centre.
      // Keeps the card high on the screen even for tall or bottom-positioned targets.
      top = Math.max(rect.top - 20, 60);
      left = rect.left + rect.width + CARD_MARGIN;
      break;
    case 'bottom':
    default:
      top = rect.top + rect.height + CARD_MARGIN;
      left = rect.left + rect.width / 2 - cardW / 2;
      break;
  }
  top = clamp(top, 12, Math.max(12, vh - cardHEstimate - 12));
  left = clamp(left, 12, Math.max(12, vw - cardW - 12));
  return { top, left };
}

export function TourOverlay({
  active, stepIndex, steps,
  onNext, onPrev, onSkip, onFinish,
  dispatchAction,
}: TourOverlayProps) {
  const step = steps[stepIndex];
  // Defined up here (rather than just before the return) so the keyboard
  // effect's handler can close over `advance` without reading it before its
  // declaration. Depends only on props/derived values available at this point.
  const isLast = stepIndex >= steps.length - 1;
  const advance = () => { if (isLast) onFinish(); else onNext(); };
  const [rect, setRect] = useState<Rect | null>(null);
  const [viewport, setViewport] = useState<{ w: number; h: number }>({
    w: typeof window !== 'undefined' ? window.innerWidth : 0,
    h: typeof window !== 'undefined' ? window.innerHeight : 0,
  });
  const autoAdvanceTimerRef = useRef<number | null>(null);
  const cycleTimerRef = useRef<number | null>(null);
  const [replayNonce, setReplayNonce] = useState(0);

  // Dispatch enterActions whenever we land on a new step (or Replay is pressed)
  useEffect(() => {
    if (!active || !step) return;
    if (cycleTimerRef.current !== null) {
      clearInterval(cycleTimerRef.current);
      cycleTimerRef.current = null;
    }
    if (!step.enterActions) return;
    for (const a of step.enterActions) {
      if (a.kind === 'cycleViewStyles') {
        const order: Array<'layer' | 'cut' | 'upset' | 'network'> = ['cut', 'upset', 'network', 'layer'];
        let i = 0;
        cycleTimerRef.current = window.setInterval(() => {
          dispatchAction({ kind: 'setViewStyle', style: order[i % order.length] });
          i++;
          if (i >= order.length) {
            if (cycleTimerRef.current !== null) clearInterval(cycleTimerRef.current);
            cycleTimerRef.current = null;
          }
        }, a.intervalMs);
      } else if (a.kind === 'cyclePlotEdits') {
        const order: Array<'bar' | 'lollipop' | 'heatmap'> = ['bar', 'lollipop', 'heatmap'];
        // Fire the first plot immediately so the user sees something right away.
        dispatchAction({ kind: 'enterPlotEdit', plot: order[0] });
        let i = 1;
        const scrollAfter = a.scrollAfterSelector;
        cycleTimerRef.current = window.setInterval(() => {
          if (i < order.length) {
            dispatchAction({ kind: 'enterPlotEdit', plot: order[i] });
            i++;
          } else {
            if (cycleTimerRef.current !== null) clearInterval(cycleTimerRef.current);
            cycleTimerRef.current = null;
            if (scrollAfter) {
              window.setTimeout(() => dispatchAction({ kind: 'scrollIntoView', selector: scrollAfter }), 350);
            }
          }
        }, a.intervalMs);
      } else if (a.kind === 'scrollIntoView' && a.delayMs) {
        const act = a;
        window.setTimeout(() => dispatchAction(act), act.delayMs);
      } else {
        dispatchAction(a);
      }
    }
    return () => {
      if (cycleTimerRef.current !== null) {
        clearInterval(cycleTimerRef.current);
        cycleTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, stepIndex, replayNonce]);

  // Track highlighted rect through resize / scroll / DOM changes (rAF loop while active)
  useLayoutEffect(() => {
    if (!active || !step) return;
    if (!step.selector) { setRect(null); return; }

    let raf = 0;
    let lastKey = '';
    const tick = () => {
      const r = readRect(step.selector!);
      if (r) {
        const key = `${r.top}|${r.left}|${r.width}|${r.height}`;
        if (key !== lastKey) {
          setRect(r);
          lastKey = key;
        }
      } else if (rect !== null) {
        setRect(null);
      }
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, stepIndex, step?.selector]);

  // Viewport size
  useEffect(() => {
    if (!active) return;
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [active]);

  // Keyboard
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onSkip(); }
      else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); advance(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); onPrev(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, stepIndex]);

  // Auto-advance (not used in current step list, but supported)
  useEffect(() => {
    if (!active || !step) return;
    if (autoAdvanceTimerRef.current !== null) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    if (step.autoAdvanceMs && stepIndex < steps.length - 1) {
      autoAdvanceTimerRef.current = window.setTimeout(() => {
        onNext();
      }, step.autoAdvanceMs);
    }
    return () => {
      if (autoAdvanceTimerRef.current !== null) {
        clearTimeout(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, stepIndex]);

  if (!active || !step) return null;

  const hasTarget = !!step.selector && !!rect;
  const placement = step.placement ?? 'bottom';
  const coords = hasTarget && placement !== 'center'
    ? placementCoords(rect!, placement, viewport.w, viewport.h)
    : null;

  return (
    <div className={`tour-overlay ${hasTarget ? 'tour-overlay-has-target' : 'tour-overlay-center'}`}>
      {hasTarget && rect ? (
        <div
          className="tour-highlight-ring"
          style={{
            top: rect.top - PADDING,
            left: rect.left - PADDING,
            width: rect.width + PADDING * 2,
            height: rect.height + PADDING * 2,
          }}
          aria-hidden="true"
        />
      ) : (
        <div className="tour-center-dim" aria-hidden="true" />
      )}

      <div
        className={`tour-tooltip-card ${!hasTarget || placement === 'center' ? 'tour-tooltip-center' : ''}`}
        style={coords ? { top: coords.top, left: coords.left, width: CARD_WIDTH } : undefined}
        role="dialog"
        aria-label={`Tour step ${stepIndex + 1} of ${steps.length}`}
      >
        <div className="tour-tooltip-title">{step.title}</div>
        <div className="tour-tooltip-body">{step.body}</div>

        <div className="tour-tooltip-progress" aria-label={`Step ${stepIndex + 1} of ${steps.length}`}>
          {steps.map((_, i) => (
            <span key={i} className={`tour-progress-dot ${i === stepIndex ? 'tour-progress-dot-active' : i < stepIndex ? 'tour-progress-dot-done' : ''}`} />
          ))}
        </div>

        <div className="tour-tooltip-footer">
          <button className="btn btn-sm" onClick={onPrev} disabled={stepIndex === 0}>
            Back
          </button>
          <button className="btn btn-sm tour-skip-btn" onClick={onSkip}>
            Skip tour
          </button>
          {isStepReplayable(step) && (
            <button
              className="btn btn-sm"
              onClick={() => setReplayNonce(n => n + 1)}
              title="Replay this step's animation"
            >
              {'↺'} Replay
            </button>
          )}
          <button className="btn btn-sm btn-accent" onClick={advance}>
            {isLast ? 'Finish' : 'Next'}
          </button>
        </div>

        <div className="tour-tooltip-counter">{stepIndex + 1} / {steps.length}</div>
      </div>
    </div>
  );
}
