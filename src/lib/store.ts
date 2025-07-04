import { create } from 'zustand';
import { createContext, useContext } from 'react';
import { StorageService } from './types';

interface AppState {
  // 侧边栏状态
  isLeftSidebarOpen: boolean;
  isRightSidebarOpen: boolean;
  
  // 当前选中的工具
  selectedTool: string;
  
  // 历史记录类型
  historyType: string;
  
  // 文件管理
  currentFiles: string[];
  
  // 动作函数
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  setSelectedTool: (tool: string) => void;
  setHistoryType: (type: string) => void;
  addFile: (file: string) => void;
  removeFile: (file: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // 初始状态
  isLeftSidebarOpen: true,
  isRightSidebarOpen: true,
  selectedTool: 'chat',
  historyType: 'chat',
  currentFiles: [],
  
  // 动作函数
  toggleLeftSidebar: () => 
    set((state) => ({ isLeftSidebarOpen: !state.isLeftSidebarOpen })),
  
  toggleRightSidebar: () => 
    set((state) => ({ isRightSidebarOpen: !state.isRightSidebarOpen })),
  
  setSelectedTool: (tool: string) => 
    set({ selectedTool: tool, historyType: tool }),
  
  setHistoryType: (type: string) => 
    set({ historyType: type }),
  
  addFile: (file: string) => 
    set((state) => ({ 
      currentFiles: [...state.currentFiles, file] 
    })),
  
  removeFile: (file: string) => 
    set((state) => ({ 
      currentFiles: state.currentFiles.filter(f => f !== file) 
    })),
}));

export const StorageContext = createContext<StorageService | null>(null);

export function useStorage() {
  const context = useContext(StorageContext);
  if (!context) {
    throw new Error('useStorage must be used within a StorageProvider');
  }
  return context;
} 