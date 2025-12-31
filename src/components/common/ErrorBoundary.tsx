import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  private handleReload = () => {
    // Limpiar estado si hay errores persistentes
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    window.location.reload();
  };

  private handleGoHome = () => {
    // Limpiar estado antes de navegar
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    window.location.href = '/';
  };

  private handleClearAndReload = () => {
    // Limpiar todo el localStorage y recargar
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.error('Error al limpiar storage:', e);
    }
    window.location.href = '/login';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-8 w-8" />
                <span>Algo salió mal</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                La aplicación encontró un error inesperado. Por favor intenta recargar la página.
              </p>

              {this.state.error && (
                <details className="bg-muted p-4 rounded-lg">
                  <summary className="cursor-pointer font-semibold text-sm mb-2">
                    Detalles técnicos (para soporte)
                  </summary>
                  <div className="text-xs space-y-2 mt-2">
                    <div>
                      <strong>Error:</strong>
                      <pre className="mt-1 overflow-auto">{this.state.error.toString()}</pre>
                    </div>
                    {this.state.errorInfo && (
                      <div>
                        <strong>Stack trace:</strong>
                        <pre className="mt-1 overflow-auto">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              <div className="flex flex-col gap-3 pt-4">
                <div className="flex gap-3">
                  <Button onClick={this.handleReload} className="flex-1">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Recargar página
                  </Button>
                  <Button onClick={this.handleGoHome} variant="outline" className="flex-1">
                    Ir al inicio
                  </Button>
                </div>
                <Button 
                  onClick={this.handleClearAndReload} 
                  variant="destructive" 
                  size="sm"
                  className="w-full"
                >
                  Limpiar datos y reiniciar (si el problema persiste)
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
