"use client";

import React from 'react';
import * as Sentry from "@sentry/nextjs";
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getSemanticColor } from '@/lib/design-system';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorId?: string;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void; errorId?: string }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // 捕获错误并发送到Sentry
    const errorId = Sentry.captureException(error);
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 添加React错误信息到Sentry
    Sentry.withScope((scope) => {
      scope.setContext("react_error_info", {
        componentStack: errorInfo.componentStack
      });
      scope.setTag("error_boundary", "react");
      Sentry.captureException(error);
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorId: undefined });
  };

  render() {
    if (this.state.hasError) {
      // 使用自定义fallback组件或默认错误UI
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent
            error={this.state.error!}
            resetError={this.handleReset}
            errorId={this.state.errorId}
          />
        );
      }

      // 默认错误UI
      return <DefaultErrorFallback 
        error={this.state.error!} 
        resetError={this.handleReset}
        errorId={this.state.errorId}
      />;
    }

    return this.props.children;
  }
}

// 默认错误回退组件
function DefaultErrorFallback({ 
  error, 
  resetError, 
  errorId 
}: { 
  error: Error; 
  resetError: () => void; 
  errorId?: string;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6 text-center">
        <div className={`mb-4 ${getSemanticColor('chat', 'text')}`}>
          <svg
            className="mx-auto h-12 w-12"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        
        <h2 className="text-lg font-semibold text-foreground mb-2">
          应用遇到了错误
        </h2>
        
        <p className="text-sm text-muted-foreground mb-4">
          我们已经记录了这个错误，开发团队会尽快修复。
        </p>
        
        {errorId && (
          <p className="text-xs text-muted-foreground mb-4">
            错误ID: <code className="bg-muted px-1 rounded">{errorId}</code>
          </p>
        )}
        
        <div className="space-y-2">
          <Button 
            onClick={resetError}
            className="w-full"
            variant="default"
          >
            重试
          </Button>
          
          <Button 
            onClick={() => window.location.reload()}
            className="w-full"
            variant="outline"
          >
            刷新页面
          </Button>
        </div>
        
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4 text-left">
            <summary className="text-sm text-muted-foreground cursor-pointer">
              开发模式：查看错误详情
            </summary>
            <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
              {error.stack}
            </pre>
          </details>
        )}
      </Card>
    </div>
  );
}

// 高阶组件，用于包装其他组件
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<{ error: Error; resetError: () => void; errorId?: string }>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
} 