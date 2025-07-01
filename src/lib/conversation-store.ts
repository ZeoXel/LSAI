import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { ChatMessage, HistoryRecord } from './types';
// 🔧 使用动态导入获取当前存储服务，而不是固定的localStorageService

interface ConversationState {
  // 当前对话状态
  currentConversation: HistoryRecord | null;
  messages: ChatMessage[];
  isLoading: boolean;
  
  // Actions
  loadConversation: (conversationId: string) => Promise<void>;
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  clearConversation: () => void;
  createNewConversation: (title: string, modelName: string) => Promise<void>;
}

export const useConversationStore = create<ConversationState>()(
  devtools(
    (set, get) => ({
      // 🔧 初始状态 - 避免默认显示问候语，让ChatPage控制何时显示
      currentConversation: null,
      messages: [],
      isLoading: false,

      // 🔧 加载特定对话 - 简化版本，主要用于UI状态更新
      loadConversation: async (conversationId: string) => {
        set({ isLoading: true });
        
        try {
          // 🔧 简化逻辑：只更新对话ID，消息内容由ChatPage处理
          set({
            currentConversation: { id: conversationId } as HistoryRecord,
            messages: [], // 让ChatPage来设置具体消息
            isLoading: false
          });
        } catch (error) {
          console.error('加载对话失败:', error);
          set({ isLoading: false });
        }
      },

      // 设置消息
      setMessages: (messages: ChatMessage[]) => {
        set({ messages });
      },

      // 添加消息
      addMessage: (message: ChatMessage) => {
        set(state => ({
          messages: [...state.messages, message]
        }));
      },

      // 🔧 清空对话 - 只清空状态，让ChatPage控制何时显示问候语
      clearConversation: () => {
        set({
          currentConversation: null,
          messages: []
        });
        // 🔧 不再直接操作存储，由调用方处理
      },

      // 🔧 创建新对话 - 简化版本，主要存储逻辑由ChatPage处理
      createNewConversation: async (title: string, modelName: string) => {
        // 🔧 只清空状态，让ChatPage控制何时显示问候语
        set({
          currentConversation: null,
          messages: []
        });
      }
    }),
    {
      name: 'conversation-store',
    }
  )
); 