// @vitest-environment jsdom
// Characterization tests for src/components/TourOverlay.tsx.
//
// These tests pin the CURRENT observable behaviour of the useLayoutEffect
// rAF-tracking hook flagged for the react-hooks v7 "set-state-in-effect"
// cleanup (Task 4). The flagged line is L151 — a synchronous `setRect(null)`
// on the no-selector early-return path inside the layout effect. The
// rAF-callback `setRect(r)` (async, inside requestAnimationFrame) is a
// legitimate update and is left untouched by the fix.
//
// Both scenarios below deliberately avoid ever starting the rAF loop
// (no-selector step / active=false both hit an early `return` in the effect
// before `window.requestAnimationFrame` is called), so there is no
// self-scheduling loop to fake-timer past and no risk of a hanging test.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { TourOverlay } from '../components/TourOverlay.tsx';
import type { TourStep } from '../utils/tourSteps.ts';

function noop(): void {
  /* onNext/onPrev/onSkip/onFinish/dispatchAction stub */
}

const CENTER_STEP: TourStep = {
  id: 'welcome',
  placement: 'center',
  title: 'Welcome to the tour',
  body: 'No selector on this step — it is a center-modal step.',
};

const TARGETED_STEP: TourStep = {
  id: 'toolbar-open',
  selector: '[data-tour="toolbar-data-open"]',
  placement: 'bottom',
  title: 'Loading data',
  body: 'This step targets a DOM element.',
};

describe('TourOverlay — characterization (pre-fix)', () => {
  beforeEach(() => {
    // Defensive: even though neither scenario below reaches
    // requestAnimationFrame, fake timers ensure that if the component ever
    // did schedule one, it would not actually run and spin the test.
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('no-selector step: renders the centered overlay, no highlight ring, and rect-dependent state stays inert', () => {
    const { container } = render(
      <TourOverlay
        active={true}
        stepIndex={0}
        steps={[CENTER_STEP, TARGETED_STEP]}
        onNext={noop}
        onPrev={noop}
        onSkip={noop}
        onFinish={noop}
        dispatchAction={noop}
      />
    );

    // hasTarget = !!step.selector && !!rect — with no selector, no ring.
    expect(container.querySelector('.tour-highlight-ring')).toBeNull();
    // The center-dim backdrop renders in its place.
    expect(container.querySelector('.tour-center-dim')).not.toBeNull();

    const overlay = container.querySelector('.tour-overlay');
    expect(overlay).not.toBeNull();
    expect(overlay!.className).toContain('tour-overlay-center');
    expect(overlay!.className).not.toContain('tour-overlay-has-target');

    // Tooltip card renders centered (no top/left/width style derived from a
    // tracked rect, since coords is null when !hasTarget).
    const card = container.querySelector('.tour-tooltip-card');
    expect(card).not.toBeNull();
    expect(card!.getAttribute('style')).toBeNull();
    expect(card!.className).toContain('tour-tooltip-center');

    // Sanity: step content rendered as expected.
    expect(container.textContent).toContain('Welcome to the tour');
    expect(container.querySelector('[aria-label="Tour step 1 of 2"]')).not.toBeNull();
  });

  it('active=false: renders nothing at all', () => {
    const { container } = render(
      <TourOverlay
        active={false}
        stepIndex={0}
        steps={[TARGETED_STEP]}
        onNext={noop}
        onPrev={noop}
        onSkip={noop}
        onFinish={noop}
        dispatchAction={noop}
      />
    );

    expect(container.firstChild).toBeNull();
    expect(container.querySelector('.tour-overlay')).toBeNull();
  });

  it('targeted step (populated rect) -> no-selector step -> back to a targeted step: the stale rect must not resurface before it is re-measured', () => {
    // Real DOM element the TARGETED_STEP selector resolves to. jsdom's
    // getBoundingClientRect always returns zeros, so stub it to return
    // non-zero geometry — that is what lets `rect` become non-null and the
    // highlight ring actually render for the first assertion below.
    //
    // Note on why this test is shaped as a 3-phase round-trip rather than a
    // simple "no ring on the no-selector step" check: `hasTarget` is
    // `!!step.selector && !!rect`, so on a no-selector step the ring is
    // ALREADY absent regardless of whether `rect` itself got cleared — that
    // assertion alone cannot detect whether the render-phase guard ran. The
    // guard's actual observable effect is that `rect` no longer holds a
    // stale value once we land back on a *targeted* step — before its rAF
    // loop has had a chance to re-measure. That's what this test checks.
    const target = document.createElement('div');
    target.setAttribute('data-tour', 'toolbar-data-open');
    document.body.appendChild(target);
    const rectStub: DOMRect = {
      top: 100, left: 50, width: 200, height: 40,
      right: 250, bottom: 140, x: 50, y: 100,
      toJSON() { return this; },
    };
    const getBCRSpy = vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(rectStub);

    const renderAt = (stepIndex: number) => (
      <TourOverlay
        active={true}
        stepIndex={stepIndex}
        steps={[CENTER_STEP, TARGETED_STEP]}
        onNext={noop}
        onPrev={noop}
        onSkip={noop}
        onFinish={noop}
        dispatchAction={noop}
      />
    );

    try {
      const { container, rerender } = render(renderAt(1)); // TARGETED_STEP

      // Flush the rAF loop (faked by vi.useFakeTimers()) so the tracking
      // effect's tick() reads the stubbed rect and calls setRect(r).
      act(() => {
        vi.advanceTimersByTime(50);
      });

      // Precondition: rect is populated, highlight ring is present.
      expect(container.querySelector('.tour-highlight-ring')).not.toBeNull();
      expect(container.querySelector('.tour-overlay')!.className).toContain('tour-overlay-has-target');

      // Move to the no-selector step. The render-phase guard
      // (rectClearKey/lastRectClearKey around L155-160) must clear the now-
      // stale rect in the same commit, before paint. (The ring is absent
      // here either way — this step alone is not the discriminating one.)
      rerender(renderAt(0)); // CENTER_STEP
      expect(container.querySelector('.tour-highlight-ring')).toBeNull();
      expect(container.querySelector('.tour-center-dim')).not.toBeNull();

      // Move back to the targeted step. This re-triggers the tracking
      // effect (stepIndex changed) which schedules a fresh rAF tick, but
      // that tick has NOT fired yet — no timers have been advanced since
      // the rerender. If the stale rect was cleared while on the
      // no-selector step, `rect` is null right now and the ring must be
      // absent until the new tick re-measures it. If the clear-guard was
      // skipped, the old rect object survived untouched across the
      // no-selector step and immediately resurfaces here, rendering a ring
      // with never-re-verified, potentially stale geometry.
      rerender(renderAt(1)); // TARGETED_STEP again, before any timer flush
      expect(container.querySelector('.tour-highlight-ring')).toBeNull();
      expect(container.querySelector('.tour-overlay')!.className).toContain('tour-overlay-center');
      expect(container.querySelector('.tour-overlay')!.className).not.toContain('tour-overlay-has-target');

      // Sanity: once the new tick is allowed to run, the ring legitimately
      // reappears (proving the selector-targeting path itself still works
      // and the prior assertion wasn't just a broken test).
      act(() => {
        vi.advanceTimersByTime(50);
      });
      expect(container.querySelector('.tour-highlight-ring')).not.toBeNull();
    } finally {
      getBCRSpy.mockRestore();
      document.body.removeChild(target);
    }
  });
});
