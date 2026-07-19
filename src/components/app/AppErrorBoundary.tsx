import React from 'react';

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export default class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Error inesperado en la extension',
    };
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo): void {
    console.error('AppErrorBoundary capturo un error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 p-6 flex items-center justify-center">
        <div className="w-full max-w-sm border border-red-200 bg-white rounded-xl shadow-sm p-5 space-y-3">
          <div>
            <h1 className="text-base font-bold text-red-700">La extension encontro un error</h1>
            <p className="text-sm text-slate-600 mt-1">{this.state.message}</p>
          </div>
          <button
            type="button"
            onClick={this.handleReload}
            className="w-full rounded-md bg-blue-600 text-white text-sm font-semibold px-3 py-2 hover:bg-blue-700"
          >
            Recargar extension
          </button>
        </div>
      </div>
    );
  }
}
