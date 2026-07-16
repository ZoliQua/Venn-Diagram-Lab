// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen, renderHook, act } from '@testing-library/react';
import { useState } from 'react';

describe('render-test infrastructure', () => {
  it('renders a component into jsdom', () => {
    render(<button>Click me</button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeDefined();
  });

  it('drives a hook via renderHook', () => {
    const { result } = renderHook(() => useState(1));
    expect(result.current[0]).toBe(1);
    act(() => result.current[1](2));
    expect(result.current[0]).toBe(2);
  });
});
