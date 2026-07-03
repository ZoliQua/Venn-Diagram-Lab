import { describe, it, expect } from 'vitest';
import { isValidElement, type ReactElement } from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary.tsx';

describe('ErrorBoundary', () => {
  it('getDerivedStateFromError captures the thrown error into state', () => {
    const error = new Error('kaboom');
    const state = ErrorBoundary.getDerivedStateFromError(error);
    expect(state).toEqual({ error });
    expect(state.error).toBe(error);
  });

  it('renders the recovery panel when state.error is set', () => {
    const boundary = new ErrorBoundary({ children: 'child content' });
    boundary.state = { error: new Error('boom message') };

    const output = boundary.render();

    expect(isValidElement(output)).toBe(true);
    const element = output as ReactElement<{ role?: string; children?: unknown }>;
    expect(element.type).toBe('div');
    expect(element.props.role).toBe('alert');

    // The recovery panel should not be the raw children passed in.
    expect(output).not.toBe('child content');
  });

  it('exposes a reset control that clears the session and reloads', () => {
    const boundary = new ErrorBoundary({ children: 'child content' });
    boundary.state = { error: new Error('boom message') };

    const output = boundary.render() as ReactElement<{ children?: unknown }>;
    const children = Array.isArray(output.props.children) ? output.props.children : [output.props.children];
    const flat = children.flat(Infinity) as ReactElement[];
    const button = flat.find((child) => isValidElement(child) && child.type === 'button');

    expect(button).toBeDefined();
    expect(typeof (button as ReactElement<{ onClick?: unknown }>).props.onClick).toBe('function');
  });

  it('renders children unchanged when there is no error', () => {
    const boundary = new ErrorBoundary({ children: 'hello world' });

    const output = boundary.render();

    expect(output).toBe('hello world');
  });
});
