import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { HistoryRecord, ListOptions, ListResponse, Tag } from './types';
import { localStorageService } from './local-storage';

// 历史记录状态接口
interface HistoryState {
  // 数据状态
  records: HistoryRecord[];
  currentRecord: HistoryRecord | null;
  tags: Tag[];
  isLoading: boolean;
  error: string | null;
  
  // 分页和过滤状态
  currentPage: number;
  totalPages: number;
  total: number;
  searchQuery: string;
  selectedType: HistoryRecord['type'] | null;
  selectedTags: string[];
  sortBy: 'createdAt' | 'updatedAt' | 'title';
  sortOrder: 'asc' | 'desc';

  // Actions
  // 历史记录操作
  loadRecords: () => Promise<void>;
  createRecord: (record: Omit<HistoryRecord, 'id' | 'createdAt' | 'updatedAt'>) => Promise<HistoryRecord>;
  updateRecord: (id: string, updates: Partial<HistoryRecord>) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
  
  // 对话对话管理
  createConversation: (title: string, modelName: string) => Promise<HistoryRecord>;
  loadConversation: (id: string) => Promise<void>;
  
  // 筛选和搜索
  setSearchQuery: (query: string) => void;
  setSelectedType: (type: HistoryRecord['type'] | null) => void;
  setSelectedTags: (tags: string[]) => void;
  setSorting: (sortBy: 'createdAt' | 'updatedAt' | 'title', sortOrder: 'asc' | 'desc') => void;
  setCurrentPage: (page: number) => void;
  
  // 标签操作
  loadTags: () => Promise<void>;
  createTag: (tag: Omit<Tag, 'id' | 'createdAt'>) => Promise<Tag>;
  deleteTag: (id: string) => Promise<void>;
  
  // 工具方法
  clearError: () => void;
  resetFilters: () => void;
}

// 创建历史记录状态
export const useHistoryStore = create<HistoryState>()(
  devtools(
    (set, get) => {
      // 监听媒体文件更新事件
      if (typeof window !== 'undefined') {
        const handleMediaUpdate = () => {
          console.log('Store收到媒体文件更新事件，重新加载记录...');
          get().loadRecords();
        };
        
        window.addEventListener('mediaFilesUpdated', handleMediaUpdate);
      }
      
      return {
        // 初始状态
        records: [],
        currentRecord: null,
        tags: [],
        isLoading: false,
        error: null,
        
        currentPage: 1,
        totalPages: 1,
        total: 0,
        searchQuery: '',
        selectedType: null,
        selectedTags: [],
        sortBy: 'createdAt',
        sortOrder: 'desc',

      // 历史记录操作
      loadRecords: async () => {
        set({ isLoading: true, error: null });
        
        try {
          const options: ListOptions = {
            page: get().currentPage,
            limit: 20,
            search: get().searchQuery || undefined,
            type: get().selectedType || undefined,
            tags: get().selectedTags.length > 0 ? get().selectedTags : undefined,
            sortBy: get().sortBy,
            sortOrder: get().sortOrder
          };
          
          const response: ListResponse<HistoryRecord> = await localStorageService.listRecords(options);
          
          set({
            records: response.items,
            total: response.total,
            totalPages: response.totalPages,
            isLoading: false
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '加载历史记录失败',
            isLoading: false
          });
        }
      },

      createRecord: async (record) => {
        set({ isLoading: true, error: null });
        
        try {
          const newRecord = await localStorageService.createRecord(record);
          
          // 重新加载记录列表
          await get().loadRecords();
          
          set({ isLoading: false });
          return newRecord;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '创建记录失败',
            isLoading: false
          });
          throw error;
        }
      },

      updateRecord: async (id, updates) => {
        set({ isLoading: true, error: null });
        
        try {
          await localStorageService.updateRecord(id, updates);
          
          // 更新本地状态
          set(state => ({
            records: state.records.map(record => 
              record.id === id ? { ...record, ...updates, updatedAt: new Date() } : record
            ),
            isLoading: false
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '更新记录失败',
            isLoading: false
          });
        }
      },

      deleteRecord: async (id) => {
        set({ isLoading: true, error: null });
        
        try {
          await localStorageService.deleteRecord(id);
          
          // 从本地状态中移除
          set(state => ({
            records: state.records.filter(record => record.id !== id),
            total: state.total - 1,
            isLoading: false
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '删除记录失败',
            isLoading: false
          });
        }
      },

      // 筛选和搜索
      setSearchQuery: (query) => {
        set({ searchQuery: query, currentPage: 1 });
        get().loadRecords();
      },

      setSelectedType: (type) => {
        set({ selectedType: type, currentPage: 1 });
        get().loadRecords();
      },

      setSelectedTags: (tags) => {
        set({ selectedTags: tags, currentPage: 1 });
        get().loadRecords();
      },

      setSorting: (sortBy, sortOrder) => {
        set({ sortBy, sortOrder, currentPage: 1 });
        get().loadRecords();
      },

      setCurrentPage: (page) => {
        set({ currentPage: page });
        get().loadRecords();
      },

      // 标签操作
      loadTags: async () => {
        try {
          const tags = await localStorageService.listTags();
          set({ tags });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '加载标签失败'
          });
        }
      },

      createTag: async (tag) => {
        try {
          const newTag = await localStorageService.createTag(tag);
          set(state => ({
            tags: [...state.tags, newTag]
          }));
          return newTag;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '创建标签失败'
          });
          throw error;
        }
      },

      deleteTag: async (id) => {
        try {
          await localStorageService.deleteTag(id);
          set(state => ({
            tags: state.tags.filter(tag => tag.id !== id),
            selectedTags: state.selectedTags.filter(tagId => tagId !== id)
          }));
          
          // 重新加载记录以更新标签引用
          get().loadRecords();
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '删除标签失败'
          });
        }
      },

      // 工具方法
      clearError: () => set({ error: null }),

      resetFilters: () => {
        set({
          searchQuery: '',
          selectedTags: [],
          currentPage: 1
        });
        get().loadRecords();
      },

      // 对话对话管理
      createConversation: async (title, modelName) => {
        try {
          const conversation = await localStorageService.createConversation(title, modelName);
          get().loadRecords(); // 刷新列表
          return conversation;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '创建对话失败'
          });
          throw error;
        }
      },

      loadConversation: async (id) => {
        try {
          await localStorageService.setActiveConversation(id);
          // 通知其他组件对话已切换
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '加载对话失败'
          });
        }
      }
      };
    },
    {
      name: 'history-store',
    }
  )
); 