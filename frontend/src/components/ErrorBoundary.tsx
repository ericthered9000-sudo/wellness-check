import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div 
          className="flex flex-col items-center justify-center min-h-screen p-5 text-center bg-slate-50 dark:bg-slate-900"
          role="alert"
        >
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">
            Something went wrong
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-8">
            We're sorry, but something unexpected happened.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 text-base font-medium bg-primary text-white border-none rounded-lg cursor-pointer transition-colors hover:bg-primary-dark focus-visible:outline-[3px] focus-visible:outline-primary focus-visible:outline-offset-2 min-h-11"
            type="button"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}