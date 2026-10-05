// @vitest-environment jsdom
// Tests for the useSvgDocument batch-update path: a bulk mutation (e.g.
// Data-mode Calculate rewriting hundreds of texts) must cost ONE document
// clone and ONE undo-history entry.
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSvgDocument, findTextInDoc } from '../hooks/useSvgDocument.ts';

const SVG_2SET = `<?xml version="1.0" encoding="utf-8"?>
<!-- test doc -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 700">
<g id="Shapes">
<circle id="ShapeA" cx="250" cy="350" r="150" style="fill:#FFF200"/>
<circle id="ShapeB" cx="450" cy="350" r="150" style="fill:#2E3192"/>
</g>
<g id="Texts">
<g id="Header"><text id="Title" transform="matrix(1 0 0 1 350 50)" style="font-size:20px">T</text></g>
<g id="Group_Names">
<text id="NameA" transform="matrix(1 0 0 1 150 200)" style="font-size:12px">A</text>
<text id="NameB" transform="matrix(1 0 0 1 550 200)" style="font-size:12px">B</text>
</g>
<g id="Group_Values">
<text id="Count_A" transform="matrix(1 0 0 1 200 350)" style="">0</text>
<text id="Count_B" transform="matrix(1 0 0 1 500 350)" style="">0</text>
<text id="Count_AB" transform="matrix(1 0 0 1 350 350)" style="">0</text>
</g>
</g>
</svg>`;

describe('useSvgDocument.batchUpdate', () => {
  it('applies many mutations as one undo step', () => {
    const { result } = renderHook(() => useSvgDocument());

    act(() => {
      result.current.loadFromString('test.svg', SVG_2SET);
    });

    // One batch with several content + style mutations.
    act(() => {
      result.current.batchUpdate(d => {
        for (const id of ['Count_A', 'Count_B', 'Count_AB']) {
          const t = findTextInDoc(d, id);
          if (t) t.content = '42';
        }
      });
    });

    const doc = result.current.doc!;
    expect(findTextInDoc(doc, 'Count_A')?.content).toBe('42');
    expect(findTextInDoc(doc, 'Count_AB')?.content).toBe('42');

    // A single undo restores ALL pre-batch values at once.
    act(() => {
      result.current.undo();
    });
    const restored = result.current.doc!;
    expect(findTextInDoc(restored, 'Count_A')?.content).toBe('0');
    expect(findTextInDoc(restored, 'Count_B')?.content).toBe('0');

    // And a single redo reapplies the whole batch.
    act(() => {
      result.current.redo();
    });
    expect(findTextInDoc(result.current.doc!, 'Count_B')?.content).toBe('42');
  });

  it('individual updateTextContent still works and stays undoable separately', () => {
    const { result } = renderHook(() => useSvgDocument());
    act(() => {
      result.current.loadFromString('test.svg', SVG_2SET);
    });
    act(() => {
      result.current.updateTextContent('Count_A', '7');
    });
    act(() => {
      result.current.updateTextContent('Count_B', '9');
    });
    act(() => {
      result.current.undo();
    });
    // Only the last single-text update is rolled back.
    expect(findTextInDoc(result.current.doc!, 'Count_A')?.content).toBe('7');
    expect(findTextInDoc(result.current.doc!, 'Count_B')?.content).toBe('0');
  });
});
