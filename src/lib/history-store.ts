import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { HistoryRecord, ListOptions, ListResponse, Tag, StorageService } from './types';
import { SupabaseStorageService } from './supabase-storage';

// 创建全局存储服务实例
const storageService = new SupabaseStorageService();

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
  loadRecords: (overrideOptions?: Partial<ListOptions>) => Promise<void>;
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

      // 历史记录操作 - 支持传入查询参数避免状态时机问题
      loadRecords: async (overrideOptions?: Partial<ListOptions>) => {
        set({ isLoading: true, error: null });
        
        try {
          const state = get();
          const options: ListOptions = {
            page: state.currentPage,
            limit: 20,
            search: state.searchQuery || undefined,
            type: state.selectedType || undefined,
            tags: state.selectedTags.length > 0 ? state.selectedTags : undefined,
            sortBy: state.sortBy,
            sortOrder: state.sortOrder,
            ...overrideOptions  // 覆盖参数，确保使用最新值
          };
          
          // console.log('🔍 loadRecords with options:', options);
          
          const response: ListResponse<HistoryRecord> = await storageService.listRecords(options);
          
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
          const newRecord = await storageService.createRecord(record);
          
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
          await storageService.updateRecord(id, updates);
          
          // 更新本地状态
          set(state => ({
            records: state.records.map(record => 
              record.id === id ? { ...record, ...updates, updatedAt: new Date().toISOString() } : record
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
          await storageService.deleteRecord(id);
          
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

      // 筛选和搜索 - 传入准确参数避免状态时机问题
      setSearchQuery: (query) => {
        set({ searchQuery: query, currentPage: 1 });
        get().loadRecords({ search: query || undefined, page: 1 });
      },

      setSelectedType: (type) => {
        set({ selectedType: type, currentPage: 1 });
        get().loadRecords({ type: type || undefined, page: 1 });
      },

      setSelectedTags: (tags) => {
        set({ selectedTags: tags, currentPage: 1 });
        get().loadRecords({ tags: tags.length > 0 ? tags : undefined, page: 1 });
      },

      setSorting: (sortBy, sortOrder) => {
        set({ sortBy, sortOrder, currentPage: 1 });
        get().loadRecords({ sortBy, sortOrder, page: 1 });
      },

      setCurrentPage: (page) => {
        set({ currentPage: page });
        get().loadRecords({ page });
      },

      // 标签操作
      loadTags: async () => {
        set({ isLoading: true, error: null });
        
        try {
          const tags = await storageService.listTags();
          set({ tags, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '加载标签失败',
            isLoading: false
          });
        }
      },

      createTag: async (tag) => {
        set({ isLoading: true, error: null });
        
        try {
          const newTag = await storageService.createTag(tag);
          
          // 重新加载标签列表
          await get().loadTags();
          
          set({ isLoading: false });
          return newTag;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '创建标签失败',
            isLoading: false
          });
          throw error;
        }
      },

      deleteTag: async (id) => {
        set({ isLoading: true, error: null });
        
        try {
          await storageService.deleteTag(id);
          
          // 重新加载标签列表
          await get().loadTags();
          
          set({ isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '删除标签失败',
            isLoading: false
          });
        }
      },

      // 对话对话管理
      createConversation: async (title, modelName) => {
        set({ isLoading: true, error: null });
        
        try {
          const conversation = await storageService.createConversation(title, modelName);
          
          // 重新加载记录列表
          await get().loadRecords();
          
          set({ isLoading: false });
          return conversation;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '创建对话失败',
            isLoading: false
          });
          throw error;
        }
      },

      loadConversation: async (id) => {
        set({ isLoading: true, error: null });
        
        try {
          await storageService.setActiveConversation(id);
          set({ isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '加载对话失败',
            isLoading: false
          });
        }
      },

      // 工具方法
      clearError: () => {
        set({ error: null });
      },

      resetFilters: () => {
        set({
          searchQuery: '',
          selectedType: null,
          selectedTags: [],
          currentPage: 1
        });
        get().loadRecords();
      }
      };
    },
    {
    name: 'history-store'
    }
  )
); 