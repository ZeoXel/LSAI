import { db } from './database';
import { 
  StorageService, 
  HistoryRecord, 
  MediaFile, 
  Tag, 
  ListOptions, 
  ListResponse,
  ChatMessage
} from './types';

// 生成唯一ID的工具函数
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// 创建缩略图的工具函数
const createThumbnail = async (file: File): Promise<Blob | undefined> => {
  if (!file.type.startsWith('image/')) return undefined;
  
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      const maxSize = 200;
      const ratio = Math.min(maxSize / img.width, maxSize / img.height);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        resolve(blob || undefined);
      }, 'image/jpeg', 0.8);
    };
    
    img.onerror = () => resolve(undefined);
    img.src = URL.createObjectURL(file);
  });
};

// 本地存储服务实现
export class LocalStorageService implements StorageService {
  
  // 历史记录管理
  async createRecord(record: Omit<HistoryRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<HistoryRecord> {
    const now = new Date().toISOString();
    const newRecord: HistoryRecord = {
      ...record,
      id: generateId(),
      createdAt: now,
      updatedAt: now
    };
    
    await db.historyRecords.add(newRecord);
    return newRecord;
  }

  async updateRecord(id: string, updates: Partial<HistoryRecord>): Promise<void> {
    await db.historyRecords.update(id, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  }

  async deleteRecord(id: string): Promise<void> {
    // 删除关联的媒体文件
    const mediaFiles = await db.mediaFiles.where('historyId').equals(id).toArray();
    for (const file of mediaFiles) {
      await this.deleteFile(file.id);
    }
    
    // 删除记录
    await db.historyRecords.delete(id);
  }

  async getRecord(id: string): Promise<HistoryRecord | null> {
    const record = await db.historyRecords.get(id);
    return record || null;
  }

  async listRecords(options: ListOptions = {}): Promise<ListResponse<HistoryRecord>> {
    const {
      page = 1,
      limit = 20,
      search,
      type,
      tags,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    let query = db.historyRecords.toCollection();

    // 应用过滤条件
    if (type) {
      query = query.filter(record => record.type === type);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      query = query.filter(record => {
        // 搜索标题
        if (record.title.toLowerCase().includes(searchLower)) {
          return true;
        }
        
        // 搜索消息内容
        return record.messages.some(msg => {
          if (typeof msg.content === 'string') {
            return msg.content.toLowerCase().includes(searchLower);
          } else {
            // 搜索文本内容
            return msg.content.some(item => 
              item.type === 'text' && item.text.toLowerCase().includes(searchLower)
            );
          }
        });
      });
    }

    if (tags && tags.length > 0) {
      query = query.filter(record => 
        tags.some(tag => record.tags.includes(tag))
      );
    }

    // 获取所有结果并在内存中排序
    const allItems = await query.toArray();
    
    // 排序
    allItems.sort((a, b) => {
      const aValue = a[sortBy as keyof HistoryRecord];
      const bValue = b[sortBy as keyof HistoryRecord];
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    // 分页
    const offset = (page - 1) * limit;
    const items = allItems.slice(offset, offset + limit);
    const total = allItems.length;

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  // 媒体文件管理
  async uploadFile(file: File, historyId: string): Promise<MediaFile> {
    const id = generateId();
    const thumbnailBlob = await createThumbnail(file);
    
    const mediaFile: MediaFile = {
      id,
      historyId,
      blob: file,
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
      url: URL.createObjectURL(file),
      createdAt: new Date().toISOString(),
      thumbnailBlob
    };

    // 如果是图片，获取尺寸
    if (file.type.startsWith('image/')) {
      const img = new Image();
      const dimensions = await new Promise<{width: number, height: number}>((resolve) => {
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.onerror = () => resolve({ width: 0, height: 0 });
        img.src = URL.createObjectURL(file);
      });
      mediaFile.width = dimensions.width;
      mediaFile.height = dimensions.height;
    }

    await db.mediaFiles.add(mediaFile);
    return mediaFile;
  }

  async getFile(id: string): Promise<MediaFile | null> {
    const file = await db.mediaFiles.get(id);
    return file || null;
  }

  async deleteFile(id: string): Promise<void> {
    const file = await db.mediaFiles.get(id);
    if (file) {
      // 释放blob URL
      if (file.blob) {
        URL.revokeObjectURL(URL.createObjectURL(file.blob));
      }
      if (file.thumbnailBlob) {
        URL.revokeObjectURL(URL.createObjectURL(file.thumbnailBlob));
      }
    }
    await db.mediaFiles.delete(id);
  }

  async getFilesByHistoryId(historyId: string): Promise<MediaFile[]> {
    return db.mediaFiles.where('historyId').equals(historyId).toArray();
  }

  // 🚀 批量查询多个历史记录的媒体文件（性能优化）
  async getFilesByHistoryIds(historyIds: string[]): Promise<Map<string, MediaFile[]>> {
    if (historyIds.length === 0) {
      return new Map();
    }
    
    console.log(`🔍 批量查询 ${historyIds.length} 个历史记录的媒体文件`);
    
    const files = await db.mediaFiles.where('historyId').anyOf(historyIds).toArray();
    
    // 按 historyId 分组
    const grouped = new Map<string, MediaFile[]>();
    files.forEach(file => {
      const historyId = file.historyId;
      if (!grouped.has(historyId)) {
        grouped.set(historyId, []);
      }
      grouped.get(historyId)!.push(file);
    });
    
    // 对每个组内的文件按创建时间排序
    for (const [historyId, fileList] of grouped) {
      fileList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    
    console.log(`✅ 批量查询完成，获得 ${files.length} 个媒体文件`);
    return grouped;
  }

  // 标签管理
  async createTag(tag: Omit<Tag, 'id' | 'createdAt'>): Promise<Tag> {
    const newTag: Tag = {
      ...tag,
      id: generateId(),
      createdAt: new Date().toISOString()
    };
    
    await db.tags.add(newTag);
    return newTag;
  }

  async updateTag(id: string, updates: Partial<Tag>): Promise<void> {
    await db.tags.update(id, updates);
  }

  async deleteTag(id: string): Promise<void> {
    // 从所有记录中移除该标签
    const records = await db.historyRecords.where('tags').anyOf([id]).toArray();
    for (const record of records) {
      const updatedTags = record.tags.filter(tag => tag !== id);
      await db.historyRecords.update(record.id, { tags: updatedTags });
    }
    
    await db.tags.delete(id);
  }

  async listTags(): Promise<Tag[]> {
    return db.tags.orderBy('name').toArray();
  }

  // 对话对话管理
  async createConversation(title: string, modelName: string): Promise<HistoryRecord> {
    const conversation: HistoryRecord = {
      id: `conv-${Date.now()}`,
      type: 'text',
      title,
      messages: [],
      modelName,
      status: 'active',
      metadata: {},
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.historyRecords.add(conversation);
    
    // 设置为活跃对话
    await this.setActiveConversation(conversation.id);
    
    return conversation;
  }

  async addMessageToConversation(conversationId: string, message: ChatMessage): Promise<void> {
    const conversation = await db.historyRecords.get(conversationId);
    if (!conversation) {
      throw new Error('对话不存在');
    }

    conversation.messages.push(message);
    conversation.updatedAt = new Date().toISOString();

    await db.historyRecords.put(conversation);
  }

  async getActiveConversation(): Promise<HistoryRecord | null> {
    try {
      const setting = await db.appSettings.get('activeConversationId');
      if (!setting || !setting.value) {
        return null;
      }
      
      const conversation = await db.historyRecords.get(setting.value);
      return conversation || null;
    } catch (error) {
      console.error('获取活跃对话失败:', error);
      return null;
    }
  }

  async setActiveConversation(id: string | null): Promise<void> {
    try {
      if (id) {
        await db.appSettings.put({ key: 'activeConversationId', value: id });
      } else {
        await db.appSettings.delete('activeConversationId');
      }
    } catch (error) {
      console.error('设置活跃对话失败:', error);
    }
  }

  // 数据导入导出
  async exportData(): Promise<string> {
    const [records, files, tags] = await Promise.all([
      db.historyRecords.toArray(),
      db.mediaFiles.toArray(),
      db.tags.toArray()
    ]);

    // 将Blob转换为base64以便序列化
    const filesWithBase64 = await Promise.all(
      files.map(async (file) => ({
        ...file,
        blob: file.blob ? await this.blobToBase64(file.blob) : '',
        thumbnailBlob: file.thumbnailBlob ? await this.blobToBase64(file.thumbnailBlob) : undefined
      }))
    );

    const exportData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      data: {
        records,
        files: filesWithBase64,
        tags
      }
    };

    return JSON.stringify(exportData, null, 2);
  }

  async importData(data: string): Promise<void> {
    try {
      const importData = JSON.parse(data);
      const { records, files, tags } = importData.data;

      // 清空现有数据
      await db.transaction('rw', db.historyRecords, db.mediaFiles, db.tags, async () => {
        await db.historyRecords.clear();
        await db.mediaFiles.clear();
        await db.tags.clear();

        // 导入标签
        if (tags) {
          await db.tags.bulkAdd(tags);
        }

        // 导入记录
        if (records) {
          await db.historyRecords.bulkAdd(records);
        }

        // 导入文件（将base64转回Blob）
        if (files) {
          const filesWithBlob = await Promise.all(
            files.map(async (file: any) => ({
              ...file,
              blob: await this.base64ToBlob(file.blob, file.mimeType),
              thumbnailBlob: file.thumbnailBlob ? await this.base64ToBlob(file.thumbnailBlob, 'image/jpeg') : undefined
            }))
          );
          await db.mediaFiles.bulkAdd(filesWithBlob);
        }
      });
    } catch (error) {
      throw new Error(`导入数据失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  // 工具方法
  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private async base64ToBlob(base64: string, mimeType: string): Promise<Blob> {
    const response = await fetch(base64);
    return response.blob();
  }
}

// 创建单例实例
export const localStorageService = new LocalStorageService(); 