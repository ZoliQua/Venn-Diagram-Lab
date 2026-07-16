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
import { render } from '@testing-library/react';
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
});
