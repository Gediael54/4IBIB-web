import * as Sentry from "@sentry/react";
import { AlertTriangle } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

type FallbackRender = (error: Error, reset: () => void) => ReactNode;

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: FallbackRender;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    Sentry.captureException(error, {
      contexts: { react: { componentStack: info.componentStack ?? "" } }
    });
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(error, this.reset);
    return <DefaultFallback error={error} onReset={this.reset} />;
  }
}

interface FallbackProps {
  error: Error;
  onReset: () => void;
}

function DefaultFallback({ error, onReset }: FallbackProps) {
  return (
    <div className="error-boundary" role="alert">
      <div className="error-boundary-icon" aria-hidden="true">
        <AlertTriangle size={32} />
      </div>
      <h2 className="error-boundary-title">Algo deu errado</h2>
      <p className="error-boundary-message">{error.message || "Erro inesperado."}</p>
      <button type="button" className="button primary" onClick={onReset}>
        Tentar novamente
      </button>
    </div>
  );
}

interface ViewBoundaryProps {
  viewName: string;
  onBackToDashboard?: () => void;
  children: ReactNode;
}

export function ViewBoundary({ viewName, onBackToDashboard, children }: ViewBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <div className="error-boundary" role="alert">
          <div className="error-boundary-icon" aria-hidden="true">
            <AlertTriangle size={32} />
          </div>
          <h2 className="error-boundary-title">Falha ao carregar {viewName}</h2>
          <p className="error-boundary-message">{error.message || "Erro inesperado."}</p>
          <div className="error-boundary-actions">
            <button type="button" className="button secondary" onClick={reset}>
              Tentar novamente
            </button>
            {onBackToDashboard && (
              <button
                type="button"
                className="button primary"
                onClick={() => {
                  reset();
                  onBackToDashboard();
                }}
              >
                Voltar ao resumo
              </button>
            )}
          </div>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;
