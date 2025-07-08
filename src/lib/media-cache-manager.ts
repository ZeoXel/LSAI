// 🔧 增强媒体缓存管理器
import { MediaFile } from './types';

interface CacheEntry {
  blob: Blob;
  timestamp: number;
  size: number;
  accessCount: number;
  lastAccess: number;
}

interface ThumbnailCacheEntry {
  url: string;
  timestamp: number;
  lastAccess: number;
}

class MediaCacheManager {
  private memoryCache = new Map<string, CacheEntry>();
  private thumbnailCache = new Map<string, ThumbnailCacheEntry>();
  private persistentCache?: IDBDatabase;
  private dbName = 'MediaCacheDB';
  private dbVersion = 1;
  
  // 配置参数
  private readonly MAX_MEMORY_CACHE_SIZE = 100; // 最多100个文件
  private readonly MAX_MEMORY_SIZE_MB = 200; // 最大内存200MB
  private readonly CACHE_EXPIRY_TIME = 30 * 60 * 1000; // 30分钟过期
  private readonly PERSISTENT_CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7天过期
  
  constructor() {
    this.initPersistentCache();
    this.startCleanupInterval();
  }

  // 🎯 初始化持久化缓存（IndexedDB）
  private async initPersistentCache(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => {
        console.warn('持久化缓存初始化失败，将使用内存缓存');
        resolve();
      };
      
      request.onsuccess = () => {
        this.persistentCache = request.result;
        console.log('✅ 媒体持久化缓存已初始化');
        resolve();
      };
      
      request.onupgradeneeded = () => {
        const db = request.result;
        
        // 创建媒体文件缓存表
        if (!db.objectStoreNames.contains('mediaCache')) {
          const store = db.createObjectStore('mediaCache', { keyPath: 'url' });
          store.createIndex('timestamp', 'timestamp');
          store.createIndex('size', 'size');
        }
        
        // 创建缩略图缓存表
        if (!db.objectStoreNames.contains('thumbnailCache')) {
          const thumbStore = db.createObjectStore('thumbnailCache', { keyPath: 'url' });
          thumbStore.createIndex('timestamp', 'timestamp');
        }
      };
    });
  }

  // 🔍 智能获取媒体文件
  async getMediaBlob(url: string, priority: 'high' | 'normal' | 'low' = 'normal'): Promise<Blob | null> {
    try {
      // 1. 检查内存缓存
      const memoryEntry = this.memoryCache.get(url);
      if (memoryEntry && this.isValidEntry(memoryEntry)) {
        memoryEntry.accessCount++;
        memoryEntry.lastAccess = Date.now();
        console.log(`🎯 内存缓存命中: ${this.getFileName(url)}`);
        return memoryEntry.blob;
      }

      // 2. 检查持久化缓存
      if (this.persistentCache) {
        const persistentBlob = await this.getPersistentBlob(url);
        if (persistentBlob) {
          // 将持久化缓存的数据加载到内存
          this.setMemoryCache(url, persistentBlob);
          console.log(`💾 持久化缓存命中: ${this.getFileName(url)}`);
          return persistentBlob;
        }
      }

      // 3. 网络请求并缓存
      console.log(`🌐 网络获取: ${this.getFileName(url)}`);
      const blob = await this.fetchWithRetry(url, priority);
      
      if (blob) {
        // 同时存储到内存和持久化缓存
        this.setMemoryCache(url, blob);
        this.setPersistentCache(url, blob);
      }
      
      return blob;
    } catch (error) {
      console.error(`❌ 获取媒体文件失败: ${url}`, error);
      return null;
    }
  }

  // 🔄 带重试的网络请求
  private async fetchWithRetry(url: string, priority: 'high' | 'normal' | 'low', maxRetries = 3): Promise<Blob | null> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // 根据优先级设置超时时间
        const timeout = priority === 'high' ? 10000 : priority === 'normal' ? 15000 : 30000;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const response = await fetch(url, { 
          signal: controller.signal,
          cache: 'force-cache' // 利用浏览器缓存
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        return await response.blob();
      } catch (error) {
        console.warn(`网络请求失败 (尝试 ${attempt}/${maxRetries}):`, error);
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        // 指数退避重试
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
    return null;
  }

  // 💾 设置内存缓存
  private setMemoryCache(url: string, blob: Blob): void {
    // 检查内存限制
    this.enforceMemoryLimits();
    
    const entry: CacheEntry = {
      blob,
      timestamp: Date.now(),
      size: blob.size,
      accessCount: 1,
      lastAccess: Date.now()
    };
    
    this.memoryCache.set(url, entry);
  }

  // 🗂️ 设置持久化缓存
  private async setPersistentCache(url: string, blob: Blob): Promise<void> {
    if (!this.persistentCache) return;
    
    try {
      const transaction = this.persistentCache.transaction(['mediaCache'], 'readwrite');
      const store = transaction.objectStore('mediaCache');
      
      const entry = {
        url,
        blob,
        timestamp: Date.now(),
        size: blob.size
      };
      
      await store.put(entry);
    } catch (error) {
      console.warn('持久化缓存存储失败:', error);
    }
  }

  // 🔍 获取持久化缓存
  private async getPersistentBlob(url: string): Promise<Blob | null> {
    if (!this.persistentCache) return null;
    
    try {
      const transaction = this.persistentCache.transaction(['mediaCache'], 'readonly');
      const store = transaction.objectStore('mediaCache');
      const request = store.get(url);
      
      return new Promise((resolve) => {
        request.onsuccess = () => {
          const result = request.result;
          if (result && Date.now() - result.timestamp < this.PERSISTENT_CACHE_EXPIRY) {
            resolve(result.blob);
          } else {
            resolve(null);
          }
        };
        request.onerror = () => resolve(null);
      });
    } catch (error) {
      console.warn('持久化缓存读取失败:', error);
      return null;
    }
  }

  // 🧹 内存限制管理
  private enforceMemoryLimits(): void {
    const entries = Array.from(this.memoryCache.entries());
    
    // 按大小排序，移除过大文件
    const totalSize = entries.reduce((sum, [, entry]) => sum + entry.size, 0);
    const maxSizeBytes = this.MAX_MEMORY_SIZE_MB * 1024 * 1024;
    
    if (totalSize > maxSizeBytes || entries.length > this.MAX_MEMORY_CACHE_SIZE) {
      // LRU清理：按访问时间和频率排序
      entries.sort(([, a], [, b]) => {
        const scoreA = a.accessCount / (Date.now() - a.lastAccess);
        const scoreB = b.accessCount / (Date.now() - b.lastAccess);
        return scoreA - scoreB; // 分数低的先删除
      });
      
      // 删除一半缓存
      const removeCount = Math.ceil(entries.length / 2);
      for (let i = 0; i < removeCount; i++) {
        this.memoryCache.delete(entries[i][0]);
      }
      
      console.log(`🧹 内存缓存清理: 删除 ${removeCount} 个文件`);
    }
  }

  // ⏰ 定期清理过期缓存
  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupExpiredCache();
    }, 5 * 60 * 1000); // 5分钟清理一次
  }

  private cleanupExpiredCache(): void {
    const now = Date.now();
    let removedCount = 0;
    
    // 清理内存缓存
    for (const [url, entry] of this.memoryCache.entries()) {
      if (now - entry.timestamp > this.CACHE_EXPIRY_TIME) {
        this.memoryCache.delete(url);
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      console.log(`🧹 定期清理: 删除 ${removedCount} 个过期缓存`);
    }
  }

  // 🚀 预加载媒体文件
  async preloadMedia(files: MediaFile[], priority: 'high' | 'normal' | 'low' = 'low'): Promise<void> {
    const preloadPromises = files.map(async (file) => {
      try {
        await this.getMediaBlob(file.url, priority);
      } catch (error) {
        console.warn(`预加载失败: ${file.fileName}`, error);
      }
    });
    
    await Promise.allSettled(preloadPromises);
    console.log(`🚀 预加载完成: ${files.length} 个文件`);
  }

  // 🎯 缩略图URL优化
  getThumbnailUrl(originalUrl: string, size: number = 200): string {
    // 检查是否是Supabase Storage URL
    if (originalUrl.includes('supabase.co/storage')) {
      // 添加缩略图参数
      return `${originalUrl}?width=${size}&height=${size}&resize=cover&quality=80`;
    }
    
    // 对于其他URL，返回原始URL
    return originalUrl;
  }

  // 🔍 获取缓存统计信息
  getCacheStats(): {
    memoryEntries: number;
    memorySize: string;
    hitRate: number;
  } {
    const entries = Array.from(this.memoryCache.values());
    const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
    const totalAccess = entries.reduce((sum, entry) => sum + entry.accessCount, 0);
    
    return {
      memoryEntries: this.memoryCache.size,
      memorySize: `${(totalSize / 1024 / 1024).toFixed(2)}MB`,
      hitRate: totalAccess > 0 ? (entries.filter(e => e.accessCount > 1).length / entries.length) * 100 : 0
    };
  }

  // 🧹 清空所有缓存
  clearAllCache(): void {
    this.memoryCache.clear();
    if (this.persistentCache) {
      const transaction = this.persistentCache.transaction(['mediaCache', 'thumbnailCache'], 'readwrite');
      transaction.objectStore('mediaCache').clear();
      transaction.objectStore('thumbnailCache').clear();
    }
    console.log('🧹 所有缓存已清空');
  }

  // 工具方法
  private isValidEntry(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < this.CACHE_EXPIRY_TIME;
  }

  private getFileName(url: string): string {
    return url.split('/').pop() || 'unknown';
  }
}

// 导出单例实例
export const mediaCache = new MediaCacheManager(); 