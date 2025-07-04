import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // 错误采样率：生产环境100%，开发环境0%
  tracesSampleRate: process.env.NODE_ENV === "production" ? 1.0 : 0,
  
  // 性能监控采样率
  profilesSampleRate: process.env.NODE_ENV === "production" ? 1.0 : 0,
  
  // 调试模式
  debug: process.env.NODE_ENV === "development",
  
  // 环境标识
  environment: process.env.NODE_ENV || "development",
  
  // 应用信息
  release: process.env.VERCEL_GIT_COMMIT_SHA || "development",
  
  // 忽略特定错误
  ignoreErrors: [
    // 忽略网络错误
    "NetworkError",
    "Network request failed",
    "ChunkLoadError",
    // 忽略浏览器扩展错误
    "Non-Error promise rejection captured",
    // 忽略取消的请求
    "AbortError",
  ],
  
  // 过滤敏感数据
  beforeSend(event, hint) {
    // 过滤API密钥等敏感信息
    if (event.exception) {
      const error = hint.originalException;
      if (error && typeof error === 'object' && 'message' in error) {
        const message = error.message as string;
        if (message.includes('sk-') || message.includes('Bearer ') || message.includes('API_KEY')) {
          event.exception.values?.forEach(value => {
            if (value.value) {
              value.value = value.value.replace(/sk-[A-Za-z0-9_-]+/g, '[REDACTED_API_KEY]');
              value.value = value.value.replace(/Bearer [A-Za-z0-9_-]+/g, '[REDACTED_BEARER_TOKEN]');
            }
          });
        }
      }
    }
    
    // 过滤请求中的敏感headers
    if (event.request?.headers) {
      delete event.request.headers['authorization'];
      delete event.request.headers['Authorization'];
    }
    
    return event;
  },
  
  // 会话重放采样率 (如果需要会话重放功能)
  replaysSessionSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
  replaysOnErrorSampleRate: process.env.NODE_ENV === "production" ? 1.0 : 0,
}); 