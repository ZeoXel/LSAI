import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 图片处理工具函数
export const convertFileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
};

// 验证图片文件类型
export const isValidImageFile = (file: File): boolean => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  return allowedTypes.includes(file.type);
};

// 🎨 智能压缩图片 - 优化版本
export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxFileSize?: number;
  progressCallback?: (progress: number) => void;
}

export const compressImage = async (
  file: File, 
  options: CompressOptions = {}
): Promise<File> => {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.8,
    maxFileSize = 5 * 1024 * 1024, // 5MB
    progressCallback
  } = options;

  // 🔍 如果文件已经足够小，直接返回
  if (file.size <= maxFileSize && file.size <= 2 * 1024 * 1024) {
    progressCallback?.(100);
    return file;
  }

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    if (!ctx) {
      reject(new Error('无法创建Canvas上下文'));
      return;
    }

    progressCallback?.(10);

    img.onload = () => {
      try {
        progressCallback?.(30);

        // 🎯 智能尺寸计算
        let { width, height } = img;
        const originalSize = file.size;
        
        // 如果图片尺寸过大，按比例缩小
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }

        // 如果文件太大，进一步缩小尺寸
        if (originalSize > maxFileSize) {
          const sizeRatio = Math.sqrt(maxFileSize / originalSize);
          width = Math.floor(width * sizeRatio);
          height = Math.floor(height * sizeRatio);
        }

        canvas.width = width;
        canvas.height = height;

        progressCallback?.(60);

        // 🎨 优化绘制质量
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        progressCallback?.(80);

        // 🔄 多级压缩策略
        const tryCompress = (currentQuality: number) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('压缩失败'));
                return;
              }

              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });

              // 如果压缩后仍然太大，继续降低质量
              if (compressedFile.size > maxFileSize && currentQuality > 0.3) {
                tryCompress(currentQuality - 0.1);
                return;
              }

              progressCallback?.(100);
              
              console.log(`🎨 图片压缩完成: ${file.name}`, {
                原始大小: `${(originalSize / 1024 / 1024).toFixed(2)}MB`,
                压缩后大小: `${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`,
                压缩比: `${((1 - compressedFile.size / originalSize) * 100).toFixed(1)}%`,
                原始尺寸: `${img.width}x${img.height}`,
                压缩后尺寸: `${width}x${height}`
              });

              resolve(compressedFile);
            },
            file.type,
            currentQuality
          );
        };

        tryCompress(quality);

      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('图片加载失败'));
    };

    // 🚀 开始加载图片
    img.src = URL.createObjectURL(file);
  });
};

export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 🔒 安全解析API响应 - 防止JSON解析错误
export const safeParseResponse = async (response: Response): Promise<any> => {
  try {
    const contentType = response.headers.get('content-type');
    
    if (!contentType || !contentType.includes('application/json')) {
      // 如果不是JSON响应，获取文本内容
      const text = await response.text();
      throw new Error(`服务器返回了非JSON响应: ${text}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof SyntaxError) {
      // JSON解析错误
      const text = await response.text();
      throw new Error(`JSON解析失败，服务器响应: ${text}`);
    }
    throw error;
  }
};

// 🎯 专门用于图片生成记录的智能存储
export const imageStorageManager = {
  save: (records: any[], storageKey: string): boolean => {
    try {
      // 🔍 图片记录专用优化
      const optimizeImageRecords = (originalRecords: any[]): any[] => {
        const MAX_RECORDS = 15; // 限制图片记录数量
        
        // 创建轻量级记录
        const lightweightRecords = originalRecords.map(record => ({
          ...record,
          // 移除大字段，只保留标记
          imageUrl: record.imageUrl ? 'has-image' : undefined,
          sourceImageUrl: record.sourceImageUrl ? 'has-source' : undefined
        }));
        
        // 按时间排序，保留最新记录
        return lightweightRecords
          .sort((a, b) => {
            const aTime = new Date(a.timestamp).getTime();
            const bTime = new Date(b.timestamp).getTime();
            return bTime - aTime;
          })
          .slice(0, MAX_RECORDS);
      };

      // 多级存储尝试
      const tryStore = (data: any[], attempt = 1): boolean => {
        const MAX_ATTEMPTS = 3;
        
        try {
          const dataString = JSON.stringify(data);
          const dataSize = new Blob([dataString]).size;
          
          console.log(`💾 图片记录存储尝试 ${attempt}: ${data.length}条, ${(dataSize / 1024).toFixed(2)}KB`);
          
          if (dataSize > 512 * 1024) { // 512KB 限制
            throw new DOMException('数据过大', 'QuotaExceededError');
          }
          
          localStorage.setItem(storageKey, dataString);
          console.log('✅ 图片记录保存成功');
          return true;
          
        } catch (error) {
          if (error instanceof DOMException && error.name === 'QuotaExceededError') {
            console.warn(`⚠️ 图片记录存储空间不足 (尝试 ${attempt}/${MAX_ATTEMPTS})`);
            
            if (attempt < MAX_ATTEMPTS) {
              // 减少记录数量
              const reduced = data.slice(0, Math.max(1, Math.floor(data.length * 0.7)));
              return tryStore(reduced, attempt + 1);
            } else {
              // 最小化存储
              const minimal = data.slice(0, 3).map(item => ({
                id: item.id,
                prompt: item.prompt ? item.prompt.substring(0, 30) : '',
                model: item.model,
                timestamp: item.timestamp,
                isGenerating: item.isGenerating || false
              }));
              
              try {
                localStorage.setItem(storageKey, JSON.stringify(minimal));
                console.log('✅ 图片记录最小化保存成功');
                return true;
              } catch (finalError) {
                localStorage.removeItem(storageKey);
                console.log('🧹 清空图片记录存储');
                return false;
              }
            }
          }
          throw error;
        }
      };

      const optimizedRecords = optimizeImageRecords(records);
      return tryStore(optimizedRecords);
      
    } catch (error) {
      console.error('图片记录存储失败:', error);
      try {
        localStorage.removeItem(storageKey);
      } catch (e) {}
      return false;
    }
  },

  load: (storageKey: string): any[] => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.map((record: any) => ({
          ...record,
          timestamp: new Date(record.timestamp)
        })).filter((record: any) => record.id && record.model);
      }
    } catch (error) {
      console.error('加载图片记录失败:', error);
      localStorage.removeItem(storageKey);
    }
    return [];
  }
};

// 🎯 智能存储管理器 - 防止localStorage空间耗尽
export interface SmartStorageOptions {
  maxRecords?: number;
  maxSize?: number; // KB
  excludeFields?: string[];
}

export const smartLocalStorage = {
  // 智能保存到localStorage，自动处理空间不足问题
  setItem: <T = any>(key: string, data: T, options: SmartStorageOptions = {}): boolean => {
    const {
      maxRecords = 20,
      maxSize = 1024, // 1MB default
      excludeFields = ['imageUrl', 'sourceImageUrl', 'blob']
    } = options;

    try {
      // 🔍 数据优化处理
      const optimizeData = (originalData: any): any => {
        if (Array.isArray(originalData)) {
          // 数组数据：限制数量并移除大字段
          return originalData
            .sort((a, b) => {
              // 按时间戳排序（如果存在）
              const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
              const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
              return bTime - aTime;
            })
            .slice(0, maxRecords)
            .map(item => {
              if (typeof item === 'object' && item !== null) {
                const optimized = { ...item };
                excludeFields.forEach(field => {
                  if (optimized[field]) {
                    optimized[field] = typeof optimized[field] === 'string' ? 'has-data' : undefined;
                  }
                });
                return optimized;
              }
              return item;
            });
        } else if (typeof originalData === 'object' && originalData !== null) {
          // 对象数据：移除大字段
          const optimized = { ...originalData };
          excludeFields.forEach(field => {
            if (optimized[field]) {
              optimized[field] = typeof optimized[field] === 'string' ? 'has-data' : undefined;
            }
          });
          return optimized;
        }
        return originalData;
      };

      // 🔄 多级存储策略
      const tryStore = (dataToStore: any, attempt = 1): boolean => {
        const MAX_ATTEMPTS = 3;
        
        try {
          const dataString = JSON.stringify(dataToStore);
          const dataSize = new Blob([dataString]).size;
          
          console.log(`💾 智能存储尝试 ${attempt}: 大小 ${(dataSize / 1024).toFixed(2)}KB`);
          
          // 检查大小限制
          if (dataSize > maxSize * 1024) {
            throw new DOMException('数据过大', 'QuotaExceededError');
          }
          
          localStorage.setItem(key, dataString);
          console.log('✅ 智能存储成功');
          return true;
          
        } catch (error) {
          if (error instanceof DOMException && error.name === 'QuotaExceededError') {
            console.warn(`⚠️ 存储空间不足 (尝试 ${attempt}/${MAX_ATTEMPTS})`);
            
            if (attempt < MAX_ATTEMPTS) {
              // 进一步缩减数据
              let reducedData;
              if (Array.isArray(dataToStore)) {
                reducedData = dataToStore.slice(0, Math.max(1, Math.floor(dataToStore.length * 0.7)));
              } else {
                // 对象数据进一步精简
                reducedData = {
                  ...dataToStore,
                  // 移除可能的大字段
                  content: undefined,
                  messages: undefined,
                  data: undefined
                };
              }
              return tryStore(reducedData, attempt + 1);
            } else {
              // 最后尝试：只保存最基本信息
              let minimalData;
              if (Array.isArray(dataToStore)) {
                minimalData = dataToStore.slice(0, 3).map(item => ({
                  id: item.id,
                  timestamp: item.timestamp,
                  status: item.isGenerating ? 'generating' : 'completed'
                }));
              } else {
                minimalData = {
                  id: dataToStore.id || 'unknown',
                  timestamp: dataToStore.timestamp || new Date().toISOString(),
                  status: 'minimal'
                };
              }
              
              try {
                localStorage.setItem(key, JSON.stringify(minimalData));
                console.log('✅ 最小化存储成功');
                return true;
              } catch (finalError) {
                console.error('❌ 存储完全失败，清空存储');
                localStorage.removeItem(key);
                return false;
              }
            }
          }
          throw error;
        }
      };

      const optimizedData = optimizeData(data);
      return tryStore(optimizedData);
      
    } catch (error) {
      console.error('智能存储失败:', error);
      return false;
    }
  },

  // 获取存储项
  getItem: <T = any>(key: string): T | null => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('读取存储失败:', error);
      localStorage.removeItem(key); // 清理损坏的数据
      return null;
    }
  },

  // 移除存储项
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('移除存储失败:', error);
    }
  },

  // 获取存储使用情况
  getStorageInfo: (): { used: number; available: number; total: number } => {
    try {
      let used = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          used += localStorage.getItem(key)?.length || 0;
        }
      }
      
      const total = 5 * 1024 * 1024; // 假设5MB限制
      return {
        used: used,
        available: total - used,
        total: total
      };
    } catch (error) {
      return { used: 0, available: 0, total: 0 };
    }
  }
};

/**
 * 图片压缩工具
 */
const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB per file (留1MB buffer)
const MAX_TOTAL_SIZE = 3 * 1024 * 1024; // 3MB total

export const imageCompression = {
  // Vercel限制
  MAX_FILE_SIZE,
  MAX_TOTAL_SIZE,
  
  /**
   * 压缩单张图片
   */
  async compressImage(file: File, maxSize: number = MAX_FILE_SIZE): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        try {
          // 计算压缩比例
          let { width, height } = img;
          const maxDimension = 1024; // 最大尺寸限制
          
          if (width > maxDimension || height > maxDimension) {
            const ratio = Math.min(maxDimension / width, maxDimension / height);
            width *= ratio;
            height *= ratio;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          if (!ctx) {
            reject(new Error('无法创建Canvas上下文'));
            return;
          }
          
          // 绘制图片
          ctx.drawImage(img, 0, 0, width, height);
          
          // 尝试不同质量级别直到文件大小合适
          const tryCompress = (quality: number) => {
            canvas.toBlob((blob) => {
              if (!blob) {
                reject(new Error('图片压缩失败'));
                return;
              }
              
              if (blob.size <= maxSize || quality <= 0.1) {
                // 创建新的File对象
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now()
                });
                resolve(compressedFile);
              } else {
                // 继续降低质量
                tryCompress(quality - 0.1);
              }
            }, 'image/jpeg', quality);
          };
          
          // 从0.8质量开始尝试
          tryCompress(0.8);
          
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = URL.createObjectURL(file);
    });
  },
  
  /**
   * 批量压缩图片
   */
  async compressImages(files: File[]): Promise<File[]> {
    const maxTotalSize = MAX_TOTAL_SIZE;
    const maxFileSize = Math.min(MAX_FILE_SIZE, maxTotalSize / files.length);
    
    const compressedFiles: File[] = [];
    
    for (const file of files) {
      try {
        const compressed = await imageCompression.compressImage(file, maxFileSize);
        compressedFiles.push(compressed);
      } catch (error) {
        console.error(`压缩图片 ${file.name} 失败:`, error);
        throw new Error(`压缩图片 ${file.name} 失败`);
      }
    }
    
    // 检查总大小
    const totalSize = compressedFiles.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > maxTotalSize) {
      throw new Error('图片压缩后总大小仍然过大，请减少图片数量');
    }
    
    return compressedFiles;
  },
  
  /**
   * 检查文件是否需要压缩
   */
  needsCompression(files: File[]): boolean {
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    return totalSize > MAX_TOTAL_SIZE || 
           files.some(file => file.size > MAX_FILE_SIZE);
  },
  
  /**
   * 格式化文件大小
   */
  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + 'B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + 'KB';
    return Math.round(bytes / (1024 * 1024) * 10) / 10 + 'MB';
  }
};
