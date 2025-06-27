import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5分钟
      gcTime: 1000 * 60 * 10, // 10分钟
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

// API工具类型定义
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ImageGenerationRequest {
  prompt: string;
  style?: string;
  size?: string;
}

export interface VideoGenerationRequest {
  prompt: string;
  duration?: number;
  quality?: string;
} 