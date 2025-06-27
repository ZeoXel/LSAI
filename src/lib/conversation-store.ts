import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { ChatMessage, HistoryRecord } from './types';
import { localStorageService } from './local-storage';

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
      // 初始状态
      currentConversation: null,
      messages: [
        {
          id: "1",
          role: "assistant",
          content: "你好！我是AI助手，很高兴为您服务。有什么我可以帮助您的吗？",
          timestamp: Date.now(),
        },
      ],
      isLoading: false,

      // 加载特定对话
      loadConversation: async (conversationId: string) => {
        set({ isLoading: true });
        
        try {
          const conversation = await localStorageService.getRecord(conversationId);
          if (conversation) {
            await localStorageService.setActiveConversation(conversationId);
            set({
              currentConversation: conversation,
              messages: conversation.messages.length > 0 ? conversation.messages : [
                {
                  id: "1",
                  role: "assistant",
                  content: "你好！我是AI助手，很高兴为您服务。有什么我可以帮助您的吗？",
                  timestamp: Date.now(),
                },
              ],
              isLoading: false
            });
          }
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

      // 清空对话
      clearConversation: () => {
        set({
          currentConversation: null,
          messages: [
            {
              id: "1",
              role: "assistant",
              content: "你好！我是AI助手，很高兴为您服务。有什么我可以帮助您的吗？",
              timestamp: Date.now(),
            },
          ]
        });
        // 清空活跃对话，但不创建新的历史记录
        localStorageService.setActiveConversation(null);
      },

      // 创建新对话
      createNewConversation: async (title: string, modelName: string) => {
        try {
          const conversation = await localStorageService.createConversation(title, modelName);
          set({
            currentConversation: conversation,
            messages: [
              {
                id: "1",
                role: "assistant",
                content: "你好！我是AI助手，很高兴为您服务。有什么我可以帮助您的吗？",
                timestamp: Date.now(),
              },
            ]
          });
        } catch (error) {
          console.error('创建新对话失败:', error);
        }
      }
    }),
    {
      name: 'conversation-store',
    }
  )
); 