import { Component, type ReactNode } from 'react';
import { exportJSON } from '../db/backupIO';

interface State {
  error: Error | null;
}

/** Last-resort screen. Data lives in IndexedDB, so a reload loses nothing. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="grid min-h-dvh place-items-center p-6">
        <div className="card max-w-sm p-6 text-center">
          <div className="text-3xl">🧯</div>
          <h1 className="mt-3 text-lg font-semibold">Something went wrong</h1>
          <p className="mt-1 text-sm text-muted">Your habits are safe on this device. Reloading usually fixes it.</p>
          <pre className="mt-4 max-h-24 overflow-auto rounded-xl bg-surface-2 p-3 text-left text-[11px] text-faint">
            {this.state.error.message}
          </pre>
          <div className="mt-5 flex justify-center gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => void exportJSON()}>
              Export backup
            </button>
            <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}
