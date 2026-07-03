import { Component, type ReactNode } from 'react';
import { clearSession } from '../utils/session.ts';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Top-level defense-in-depth boundary. Catches render errors anywhere in the
 * tree (including ones caused by a corrupted/incompatible restored session)
 * and shows a recovery panel instead of leaving the user with a white screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  private handleReset = (): void => {
    clearSession();
    location.reload();
  };

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div role="alert" style={{ padding: 24, maxWidth: 560, margin: '10vh auto', fontFamily: 'system-ui' }}>
          <h2>Something went wrong</h2>
          <p>The app hit an unexpected error. Your saved session may be incompatible.</p>
          <pre style={{ whiteSpace: 'pre-wrap', opacity: 0.7 }}>{this.state.error.message}</pre>
          <button onClick={this.handleReset}>Reset &amp; clear saved session</button>
        </div>
      );
    }
    return this.props.children;
  }
}
