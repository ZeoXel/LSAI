import Dexie, { Table } from 'dexie';
import { HistoryRecord, MediaFile, Tag } from './types';

// 应用设置类型
interface AppSetting {
  key: string;
  value: any;
}

// IndexedDB 数据库类
export class AppDatabase extends Dexie {
  // 定义表
  historyRecords!: Table<HistoryRecord>;
  mediaFiles!: Table<MediaFile>;
  tags!: Table<Tag>;
  appSettings!: Table<AppSetting>;

  constructor() {
    super('AIHistoryDatabase');
    
    // 定义数据库模式 (版本1)
    this.version(1).stores({
      historyRecords: 'id, type, title, modelName, status, createdAt, updatedAt, *tags',
      mediaFiles: 'id, historyId, fileName, mimeType, size',
      tags: 'id, name, createdAt',
      appSettings: 'key, value' // 存储应用设置，如当前活跃对话ID
    });
  }
}

// 创建数据库实例
export const db = new AppDatabase();

// 初始化数据库
export const initializeDatabase = async () => {
  try {
    // 正常打开数据库
    await db.open();
    console.log('Database initialized successfully');
    
    // 检查是否需要创建默认标签
    const tagCount = await db.tags.count();
    if (tagCount === 0) {
      // 创建默认标签
      const defaultTags = [
        { id: 'tag-1', name: '对话', color: '#3b82f6', createdAt: new Date() },
        { id: 'tag-2', name: '媒体', color: '#10b981', createdAt: new Date() },
        { id: 'tag-3', name: '重要', color: '#ef4444', createdAt: new Date() },
        { id: 'tag-4', name: '草稿', color: '#6b7280', createdAt: new Date() },
      ];
      
      await db.tags.bulkAdd(defaultTags);
      console.log('Default tags created');
    }
    
    return true;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    
    // 如果还是失败，尝试清理浏览器中的IndexedDB
    if (error instanceof Error && error.message.includes('ConstraintError')) {
      console.log('Attempting to clear browser IndexedDB...');
      try {
        // 删除数据库
        await new Promise((resolve, reject) => {
          const deleteReq = indexedDB.deleteDatabase('AIHistoryDatabase');
          deleteReq.onsuccess = () => resolve(true);
          deleteReq.onerror = () => reject(deleteReq.error);
        });
        
        // 重新尝试初始化
        await db.open();
        
                 const defaultTags = [
           { id: 'tag-1', name: '对话', color: '#3b82f6', createdAt: new Date() },
           { id: 'tag-2', name: '媒体', color: '#10b981', createdAt: new Date() },
           { id: 'tag-3', name: '重要', color: '#ef4444', createdAt: new Date() },
           { id: 'tag-4', name: '草稿', color: '#6b7280', createdAt: new Date() },
         ];
        
        await db.tags.bulkAdd(defaultTags);
        console.log('Database recreated successfully after clearing');
        return true;
      } catch (retryError) {
        console.error('Failed to clear and recreate database:', retryError);
        return false;
      }
    }
    
    return false;
  }
};

// 清理数据库（开发时使用）
export const clearDatabase = async () => {
  try {
    await db.historyRecords.clear();
    await db.mediaFiles.clear();
    await db.tags.clear();
    console.log('Database cleared');
  } catch (error) {
    console.error('Failed to clear database:', error);
  }
};

// 完全删除数据库（修复问题时使用）
export const deleteDatabase = async () => {
  try {
    await db.delete();
    console.log('Database deleted completely');
    
    // 如果Dexie删除失败，使用原生API
    await new Promise((resolve, reject) => {
      const deleteReq = indexedDB.deleteDatabase('AIHistoryDatabase');
      deleteReq.onsuccess = () => {
        console.log('Database deleted via native API');
        resolve(true);
      };
      deleteReq.onerror = () => {
        console.error('Failed to delete via native API:', deleteReq.error);
        reject(deleteReq.error);
      };
    });
    
    return true;
  } catch (error) {
    console.error('Failed to delete database:', error);
    return false;
  }
};

// 获取数据库统计信息
export const getDatabaseStats = async () => {
  try {
    const [recordCount, fileCount, tagCount] = await Promise.all([
      db.historyRecords.count(),
      db.mediaFiles.count(),
      db.tags.count()
    ]);
    
    return {
      records: recordCount,
      files: fileCount,
      tags: tagCount
    };
  } catch (error) {
    console.error('Failed to get database stats:', error);
    return { records: 0, files: 0, tags: 0 };
  }
};

// 获取存储配额信息
export const getStorageQuota = async () => {
  try {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        quota: estimate.quota ? Math.round(estimate.quota / 1024 / 1024) : 0, // MB
        usage: estimate.usage ? Math.round(estimate.usage / 1024 / 1024) : 0, // MB
        usagePercent: estimate.quota && estimate.usage ? 
          Math.round((estimate.usage / estimate.quota) * 100) : 0,
        available: estimate.quota && estimate.usage ? 
          Math.round((estimate.quota - estimate.usage) / 1024 / 1024) : 0 // MB
      };
    }
    return null;
  } catch (error) {
    console.error('Failed to get storage quota:', error);
    return null;
  }
};

// 获取应用数据大小估算
export const getAppDataSize = async () => {
  try {
    const stats = await getDatabaseStats();
    
    // 估算数据大小（粗略计算）
    const avgRecordSize = 2; // KB per record
    const avgFileSize = 100; // KB per file
    
    const estimatedSize = {
      records: stats.records * avgRecordSize, // KB
      files: stats.files * avgFileSize, // KB
      total: (stats.records * avgRecordSize + stats.files * avgFileSize) / 1024 // MB
    };
    
    return {
      ...stats,
      estimatedSize
    };
  } catch (error) {
    console.error('Failed to get app data size:', error);
    return null;
  }
}; 