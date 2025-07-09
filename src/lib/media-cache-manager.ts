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
  
  // 🚀 智能缓存配置参数（根据设备性能动态调整）
  private readonly MAX_MEMORY_CACHE_SIZE: number;
  private readonly MAX_MEMORY_SIZE_MB: number;
  private readonly CACHE_EXPIRY_TIME = 45 * 60 * 1000; // 45分钟过期（延长）
  private readonly PERSISTENT_CACHE_EXPIRY = 14 * 24 * 60 * 60 * 1000; // 14天过期（延长）
  private readonly PRELOAD_BATCH_SIZE = 5; // 预加载批次大小
  
  constructor() {
    // 🚀 根据设备性能动态配置缓存参数
    this.MAX_MEMORY_CACHE_SIZE = this.getOptimalCacheSize();
    this.MAX_MEMORY_SIZE_MB = this.getOptimalMemorySize();
    
    // 只在浏览器环境中初始化 IndexedDB
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      this.initPersistentCache();
      this.startCleanupInterval();
    }
  }

  // 🎯 初始化持久化缓存（IndexedDB）
  private async initPersistentCache(): Promise<void> {
    // 再次检查浏览器环境
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      console.warn('IndexedDB 不可用，将使用内存缓存');
      return;
    }

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
        
        request.onerror = () => {
          resolve(null);
        };
      });
    } catch (error) {
      console.warn('持久化缓存读取失败:', error);
      return null;
    }
  }

  // 🧹 强制执行内存限制
  private enforceMemoryLimits(): void {
    // 检查缓存数量
    if (this.memoryCache.size >= this.MAX_MEMORY_CACHE_SIZE) {
      this.evictLeastUsed();
    }
    
    // 检查内存使用量
    const totalSize = Array.from(this.memoryCache.values())
      .reduce((total, entry) => total + entry.size, 0);
    
    if (totalSize > this.MAX_MEMORY_SIZE_MB * 1024 * 1024) {
      this.evictLeastUsed();
    }
  }

  // 🗑️ 改进的LRU驱逐策略（智能权重计算）
  private evictLeastUsed(): void {
    const entries = Array.from(this.memoryCache.entries());
    
    // 🚀 智能权重计算：考虑访问频率、最近使用时间、文件大小
    entries.sort(([, a], [, b]) => {
      const now = Date.now();
      
      // 计算权重分数（越高越重要，越不应该被驱逐）
      const getScore = (entry: CacheEntry) => {
        const timeSinceLastAccess = now - entry.lastAccess;
        const accessFrequency = entry.accessCount / Math.max(1, (now - entry.timestamp) / (60 * 1000)); // 每分钟访问次数
        const sizeWeight = Math.min(1, entry.size / (1024 * 1024)); // 文件大小权重（最大1MB）
        
        // 综合权重：访问频率占50%，时间新鲜度占30%，大小占20%
        return (accessFrequency * 0.5) + 
               ((1 / Math.max(1, timeSinceLastAccess / (60 * 1000))) * 0.3) + 
               (sizeWeight * 0.2);
      };
      
      return getScore(a) - getScore(b); // 升序：分数低的先被移除
    });
    
    // 智能驱逐：移除15-30%的缓存，根据内存压力动态调整
    const memoryPressure = this.getMemoryPressure();
    let removePercent = 0.15; // 基础移除15%
    
    if (memoryPressure > 0.9) {
      removePercent = 0.4; // 高内存压力：移除40%
    } else if (memoryPressure > 0.7) {
      removePercent = 0.25; // 中等内存压力：移除25%
    }
    
    const toRemove = Math.ceil(entries.length * removePercent);
    const removedUrls: string[] = [];
    
    for (let i = 0; i < toRemove && i < entries.length; i++) {
      const [url] = entries[i];
      this.memoryCache.delete(url);
      removedUrls.push(this.getFileName(url));
    }
    
    console.log(`🗑️ LRU驱逐：移除 ${toRemove} 个文件 (${(removePercent * 100).toFixed(1)}%)，内存压力 ${(memoryPressure * 100).toFixed(1)}%`);
    if (removedUrls.length > 0) {
      console.log(`📝 被移除的文件: ${removedUrls.slice(0, 5).join(', ')}${removedUrls.length > 5 ? ` 等${removedUrls.length}个` : ''}`);
    }
  }

  // 📊 计算当前内存压力
  private getMemoryPressure(): number {
    const currentSize = Array.from(this.memoryCache.values())
      .reduce((total, entry) => total + entry.size, 0);
    
    const maxSize = this.MAX_MEMORY_SIZE_MB * 1024 * 1024;
    return Math.min(1, currentSize / maxSize);
  }

  // 🔄 启动清理定时器
  private startCleanupInterval(): void {
    // 只在浏览器环境中启动清理定时器
    if (typeof window !== 'undefined') {
      setInterval(() => {
        this.cleanupExpiredCache();
      }, 10 * 60 * 1000); // 每10分钟清理一次
    }
  }

  // 🧹 清理过期缓存
  private cleanupExpiredCache(): void {
    const now = Date.now();
    
    // 清理内存缓存
    for (const [url, entry] of this.memoryCache.entries()) {
      if (now - entry.timestamp > this.CACHE_EXPIRY_TIME) {
        this.memoryCache.delete(url);
      }
    }
    
    // 清理缩略图缓存
    for (const [url, entry] of this.thumbnailCache.entries()) {
      if (now - entry.timestamp > this.CACHE_EXPIRY_TIME) {
        this.thumbnailCache.delete(url);
      }
    }
  }

  // 🚀 智能预加载媒体文件（分批预热）
  async preloadMedia(files: MediaFile[], priority: 'high' | 'normal' | 'low' = 'low'): Promise<void> {
    if (files.length === 0) return;
    
    console.log(`🚀 开始智能预加载 ${files.length} 个文件，优先级：${priority}`);
    
    // 过滤已缓存的文件，避免重复加载
    const uncachedFiles = files.filter(file => 
      file.url && !this.memoryCache.has(file.url)
    );
    
    if (uncachedFiles.length === 0) {
      console.log(`✅ 所有文件已缓存，跳过预加载`);
      return;
    }
    
    console.log(`📥 需要预加载 ${uncachedFiles.length}/${files.length} 个未缓存文件`);
    
    // 分批预加载，避免网络拥塞
    const batchSize = this.PRELOAD_BATCH_SIZE;
    const batches = [];
    
    for (let i = 0; i < uncachedFiles.length; i += batchSize) {
      batches.push(uncachedFiles.slice(i, i + batchSize));
    }
    
    let loadedCount = 0;
    const startTime = Date.now();
    
    for (const [batchIndex, batch] of batches.entries()) {
      const batchPromises = batch.map(async (file) => {
        try {
          const blob = await this.getMediaBlob(file.url, priority);
          if (blob) {
            loadedCount++;
            console.log(`✅ 预加载成功 (${loadedCount}/${uncachedFiles.length}): ${this.getFileName(file.url)}`);
          }
          return blob;
        } catch (error) {
          console.warn(`❌ 预加载失败: ${this.getFileName(file.url)}`, error);
          return null;
        }
      });
      
      await Promise.allSettled(batchPromises);
      
      // 批次间延迟，避免过度占用网络资源
      if (batchIndex < batches.length - 1) {
        const delay = priority === 'high' ? 100 : priority === 'normal' ? 300 : 500;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    const duration = Date.now() - startTime;
    const successRate = (loadedCount / uncachedFiles.length * 100).toFixed(1);
    
    console.log(`🎉 预加载完成：${loadedCount}/${uncachedFiles.length} 个文件，成功率 ${successRate}%，耗时 ${duration}ms`);
  }

  // 🎯 智能预热缓存（基于使用模式）
  async warmUpCache(recentFiles: MediaFile[], frequentFiles: MediaFile[] = []): Promise<void> {
    console.log(`🔥 开始智能预热缓存`);
    
    // 优先预热最近文件的缩略图
    if (recentFiles.length > 0) {
      console.log(`🔄 预热最近文件缩略图 (${recentFiles.length} 个)`);
      const thumbnailPromises = recentFiles.slice(0, 6).map(async (file) => {
        if (file.url && file.mimeType?.startsWith('image/')) {
          try {
            await this.getThumbnailBlob(file.url, 200);
          } catch (error) {
            console.warn(`缩略图预热失败: ${this.getFileName(file.url)}`);
          }
        }
      });
      
      await Promise.allSettled(thumbnailPromises);
    }
    
    // 低优先级预热频繁访问的文件
    if (frequentFiles.length > 0) {
      setTimeout(() => {
        console.log(`🔄 预热频繁访问文件 (${frequentFiles.length} 个)`);
        this.preloadMedia(frequentFiles.slice(0, 8), 'low');
      }, 2000); // 延迟2秒，确保主要任务完成
    }
    
    console.log(`✅ 预热策略已启动`);
  }

  // 🖼️ 获取缩略图URL
  getThumbnailUrl(originalUrl: string, size: number = 200): string {
    const cachedThumbnail = this.thumbnailCache.get(originalUrl);
    if (cachedThumbnail && this.isValidThumbnail(cachedThumbnail)) {
      cachedThumbnail.lastAccess = Date.now();
      return cachedThumbnail.url;
    }
    
    // 生成缩略图URL（简化版）
    const thumbnailUrl = `${originalUrl}?w=${size}&h=${size}&fit=crop`;
    
    this.thumbnailCache.set(originalUrl, {
      url: thumbnailUrl,
      timestamp: Date.now(),
      lastAccess: Date.now()
    });
    
    return thumbnailUrl;
  }

  // 🚀 获取缩略图Blob数据（分层加载优化）
  async getThumbnailBlob(originalUrl: string, size: number = 200): Promise<Blob | null> {
    const thumbnailKey = `${originalUrl}_thumb_${size}`;
    
    try {
      // 1. 检查内存缓存
      const memoryEntry = this.memoryCache.get(thumbnailKey);
      if (memoryEntry && this.isValidEntry(memoryEntry)) {
        memoryEntry.accessCount++;
        memoryEntry.lastAccess = Date.now();
        console.log(`🎯 缩略图内存缓存命中: ${this.getFileName(originalUrl)}`);
        return memoryEntry.blob;
      }

      // 2. 尝试从原图生成缩略图
      console.log(`🔄 生成缩略图: ${this.getFileName(originalUrl)}`);
      const originalBlob = await this.getMediaBlob(originalUrl, 'high');
      
      if (!originalBlob) {
        return null;
      }

      // 3. 生成缩略图
      const thumbnailBlob = await this.createThumbnail(originalBlob, size);
      
      if (thumbnailBlob) {
        // 缓存缩略图
        this.setMemoryCache(thumbnailKey, thumbnailBlob);
        console.log(`✅ 缩略图生成成功: ${this.getFileName(originalUrl)}`);
        return thumbnailBlob;
      }
      
      return originalBlob; // 如果缩略图生成失败，返回原图
    } catch (error) {
      console.error(`❌ 获取缩略图失败: ${originalUrl}`, error);
      return null;
    }
  }

  // 🔧 生成缩略图（支持图片和视频）
  private async createThumbnail(blob: Blob, size: number): Promise<Blob | null> {
    if (typeof window === 'undefined') return null;
    
    try {
      const mimeType = blob.type;
      
      // 图片缩略图生成
      if (mimeType.startsWith('image/')) {
        return this.createImageThumbnail(blob, size);
      }
      
      // 视频缩略图生成
      if (mimeType.startsWith('video/')) {
        return this.createVideoThumbnail(blob, size);
      }
      
      return null;
    } catch (error) {
      console.error('生成缩略图失败:', error);
      return null;
    }
  }

  // 🖼️ 生成图片缩略图
  private async createImageThumbnail(blob: Blob, size: number): Promise<Blob | null> {
    return new Promise((resolve) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve(null);
        return;
      }
      
      img.onload = () => {
        // 计算缩略图尺寸（保持比例）
        const aspectRatio = img.width / img.height;
        let width = size;
        let height = size;
        
        if (aspectRatio > 1) {
          height = size / aspectRatio;
        } else {
          width = size * aspectRatio;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // 绘制缩略图
        ctx.drawImage(img, 0, 0, width, height);
        
        // 转换为Blob
        canvas.toBlob((thumbnailBlob) => {
          URL.revokeObjectURL(img.src);
          resolve(thumbnailBlob);
        }, 'image/jpeg', 0.8);
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        resolve(null);
      };
      
      img.src = URL.createObjectURL(blob);
    });
  }

  // 🎬 生成视频缩略图（第一帧截图）
  private async createVideoThumbnail(blob: Blob, size: number): Promise<Blob | null> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve(null);
        return;
      }
      
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.playsInline = true;
      
      video.onloadedmetadata = () => {
        // 计算缩略图尺寸（保持比例）
        const aspectRatio = video.videoWidth / video.videoHeight;
        let width = size;
        let height = size;
        
        if (aspectRatio > 1) {
          height = size / aspectRatio;
        } else {
          width = size * aspectRatio;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // 跳转到第一帧
        video.currentTime = 0.1;
      };
      
      video.onseeked = () => {
        try {
          // 绘制视频帧到画布
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // 转换为Blob
          canvas.toBlob((thumbnailBlob) => {
            URL.revokeObjectURL(video.src);
            resolve(thumbnailBlob);
          }, 'image/jpeg', 0.8);
        } catch (error) {
          console.error('视频缩略图生成失败:', error);
          URL.revokeObjectURL(video.src);
          resolve(null);
        }
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        resolve(null);
      };
      
      video.src = URL.createObjectURL(blob);
    });
  }

  // 📊 获取详细缓存统计信息
  getCacheStats(): {
    memoryEntries: number;
    memorySize: string;
    memoryUsage: number;
    hitRate: number;
    averageAccessCount: number;
    oldestEntry: string;
    newestEntry: string;
    thumbnailCacheSize: number;
    memoryPressure: number;
    configInfo: string;
  } {
    const memoryEntries = this.memoryCache.size;
    const memorySize = Array.from(this.memoryCache.values())
      .reduce((total, entry) => total + entry.size, 0);
    
    const totalAccess = Array.from(this.memoryCache.values())
      .reduce((total, entry) => total + entry.accessCount, 0);
    
    const averageAccessCount = memoryEntries > 0 ? totalAccess / memoryEntries : 0;
    
    // 找到最老和最新的条目
    const entries = Array.from(this.memoryCache.entries());
    let oldestEntry = '';
    let newestEntry = '';
    let oldestTime = Date.now();
    let newestTime = 0;
    
    entries.forEach(([url, entry]) => {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestEntry = this.getFileName(url);
      }
      if (entry.lastAccess > newestTime) {
        newestTime = entry.lastAccess;
        newestEntry = this.getFileName(url);
      }
    });
    
    return {
      memoryEntries,
      memorySize: `${(memorySize / 1024 / 1024).toFixed(2)} MB`,
      memoryUsage: memorySize / (this.MAX_MEMORY_SIZE_MB * 1024 * 1024),
      hitRate: averageAccessCount,
      averageAccessCount: Math.round(averageAccessCount * 100) / 100,
      oldestEntry: oldestEntry || 'N/A',
      newestEntry: newestEntry || 'N/A',
      thumbnailCacheSize: this.thumbnailCache.size,
      memoryPressure: this.getMemoryPressure(),
      configInfo: `${this.MAX_MEMORY_CACHE_SIZE}个文件/${this.MAX_MEMORY_SIZE_MB}MB`
    };
  }

  // 🧹 清理所有缓存
  clearAllCache(): void {
    this.memoryCache.clear();
    this.thumbnailCache.clear();
    
    // 清理持久化缓存
    if (this.persistentCache) {
      const transaction = this.persistentCache.transaction(['mediaCache', 'thumbnailCache'], 'readwrite');
      transaction.objectStore('mediaCache').clear();
      transaction.objectStore('thumbnailCache').clear();
    }
  }

  // 🔍 检查缓存条目是否有效
  private isValidEntry(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < this.CACHE_EXPIRY_TIME;
  }

  // 🔍 检查缩略图是否有效
  private isValidThumbnail(entry: ThumbnailCacheEntry): boolean {
    return Date.now() - entry.timestamp < this.CACHE_EXPIRY_TIME;
  }

  // 🔧 获取文件名
  private getFileName(url: string): string {
    return url.split('/').pop() || 'unknown';
  }

  // 🚀 根据设备性能获取最优缓存大小
  private getOptimalCacheSize(): number {
    if (typeof window === 'undefined') return 50; // 服务器端默认值
    
    // 根据设备内存和性能动态调整
    const memory = (navigator as any).deviceMemory || 4; // 设备内存GB
    const hardwareConcurrency = navigator.hardwareConcurrency || 4; // CPU核心数
    
    // 基于设备性能计算最优缓存大小
    let optimalSize = 50; // 基础值
    
    if (memory >= 8) {
      optimalSize = 150; // 高内存设备
    } else if (memory >= 4) {
      optimalSize = 100; // 中等内存设备
    } else {
      optimalSize = 50; // 低内存设备
    }
    
    // 根据CPU核心数调整
    if (hardwareConcurrency >= 8) {
      optimalSize = Math.floor(optimalSize * 1.2);
    } else if (hardwareConcurrency <= 2) {
      optimalSize = Math.floor(optimalSize * 0.8);
    }
    
    console.log(`🚀 动态缓存配置：设备内存${memory}GB，CPU核心${hardwareConcurrency}个，缓存大小${optimalSize}个文件`);
    return optimalSize;
  }

  // 🚀 根据设备性能获取最优内存大小
  private getOptimalMemorySize(): number {
    if (typeof window === 'undefined') return 100; // 服务器端默认值
    
    const memory = (navigator as any).deviceMemory || 4; // 设备内存GB
    
    // 根据设备内存动态调整缓存内存限制
    let optimalMemory = 100; // 基础值100MB
    
    if (memory >= 16) {
      optimalMemory = 500; // 高内存设备500MB
    } else if (memory >= 8) {
      optimalMemory = 300; // 中高内存设备300MB
    } else if (memory >= 4) {
      optimalMemory = 150; // 中等内存设备150MB
    } else {
      optimalMemory = 80; // 低内存设备80MB
    }
    
    console.log(`🚀 动态内存配置：设备内存${memory}GB，缓存内存限制${optimalMemory}MB`);
    return optimalMemory;
  }
}

// 只在浏览器环境中创建实例
export const mediaCache = typeof window !== 'undefined' ? new MediaCacheManager() : null; 