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
  type: 'text' | 'media'; // 只分为文字和媒体两类
  title: string;
  messages: ChatMessage[]; // 完整的对话记录
  modelName: string;
  status: 'active' | 'completed' | 'archived';
  metadata: Record<string, any>;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

// 媒体文件类型
export interface MediaFile {
  id: string;
  historyId: string;
  blob: Blob;
  fileName: string;
  mimeType: string;
  size: number;
  thumbnailBlob?: Blob;
  width?: number;
  height?: number;
  duration?: number; // 视频时长(秒)
}

// 标签类型
export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: Date;
}

// 列表查询选项
export interface ListOptions {
  page?: number;
  limit?: number;
  search?: string;
  type?: HistoryRecord['type'];
  tags?: string[];
  sortBy?: 'createdAt' | 'updatedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}

// 列表响应类型
export interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
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
  
  // 标签管理
  createTag(tag: Omit<Tag, 'id' | 'createdAt'>): Promise<Tag>;
  updateTag(id: string, updates: Partial<Tag>): Promise<void>;
  deleteTag(id: string): Promise<void>;
  listTags(): Promise<Tag[]>;
  
  // 数据导入导出
  exportData(): Promise<string>;
  importData(data: string): Promise<void>;
} 