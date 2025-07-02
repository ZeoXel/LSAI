// 聊天消息内容类型
export interface TextContent {
  type: 'text';
  text: string;
}

export interface ImageContent {
  type: 'image';
  imageUrl: string; // base64 data URL
  fileName?: string;
  size?: number;
}

// 聊天消息类型
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string | (TextContent | ImageContent)[]; // 支持混合内容
  timestamp: number;
}

// 历史记录类型定义
export interface HistoryRecord {
  id: string;
  type: 'text' | 'media' | 'chat' | 'workflow';
  title: string;
  modelName: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  content?: any;
  messages: ChatMessage[];
  metadata?: any; // 存储生成相关的元数据，包括工作流执行状态
}

// 媒体文件类型
export interface MediaFile {
  id: string;
  historyId: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  createdAt: string;
  blob?: Blob; // 文件数据
  thumbnailBlob?: Blob; // 缩略图数据
  width?: number; // 图片宽度
  height?: number; // 图片高度
}

// 标签类型
export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

// 列表查询选项
export interface ListOptions {
  type?: 'text' | 'media' | 'chat' | 'workflow';
  tags?: string[];
  search?: string;
  page?: number;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}

// 列表响应类型
export interface ListResponse<T> {
  items: T[];
  total: number;
  page?: number;
  totalPages?: number;
}

// 存储服务接口
export interface StorageService {
  // 历史记录管理
  createRecord(record: Omit<HistoryRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<HistoryRecord>;
  updateRecord(id: string, updates: Partial<HistoryRecord>): Promise<void>;
  deleteRecord(id: string): Promise<void>;
  getRecord(id: string): Promise<HistoryRecord | null>;
  listRecords(options: ListOptions): Promise<ListResponse<HistoryRecord>>;
  
  // 对话对话管理
  createConversation(title: string, modelName: string): Promise<HistoryRecord>;
  addMessageToConversation(conversationId: string, message: ChatMessage): Promise<void>;
  getActiveConversation(): Promise<HistoryRecord | null>;
  setActiveConversation(id: string | null): Promise<void>;
  
  // 媒体文件管理
  uploadFile(file: File, historyId: string): Promise<MediaFile>;
  getFile(id: string): Promise<MediaFile | null>;
  deleteFile(id: string): Promise<void>;
  getFilesByHistoryId(historyId: string): Promise<MediaFile[]>;
  
  // 标签管理
  createTag(tag: Omit<Tag, 'id' | 'createdAt'>): Promise<Tag>;
  updateTag(id: string, updates: Partial<Tag>): Promise<void>;
  deleteTag(id: string): Promise<void>;
  listTags(): Promise<Tag[]>;
  
  // 数据导入导出
  exportData(): Promise<string>;
  importData(data: string): Promise<void>;
} 