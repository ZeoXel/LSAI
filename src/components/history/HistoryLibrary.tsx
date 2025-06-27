"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MessageSquare, Image, Tag, Trash2, Calendar, Download, Eye, X, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from "@/components/ui/separator";
import { cn } from '@/lib/utils';
import { useHistoryStore } from '@/lib/history-store';
import { useConversationStore } from '@/lib/conversation-store';
import { HistoryRecord, MediaFile } from '@/lib/types';
import { localStorageService } from "@/lib/local-storage";
import { db } from "@/lib/database";
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';

// 临时存储拖拽的文件数据
const dragFileCache = new Map<string, MediaFile & { record: HistoryRecord }>();

// 获取类型对应的图标
const getTypeIcon = (type: HistoryRecord['type']) => {
  switch (type) {
    case 'text':
      return <MessageSquare className="h-4 w-4" />;
    case 'media':
      return <Image className="h-4 w-4" />;
    default:
      return <MessageSquare className="h-4 w-4" />;
  }
};

// 获取类型对应的颜色
const getTypeColor = (type: HistoryRecord['type']) => {
  switch (type) {
    case 'text':
      return 'text-info';
    case 'media':
      return 'text-success';
    default:
      return 'text-muted';
  }
};

// 历史记录卡片组件
function HistoryCard({ record, onLoadConversation }: { 
  record: HistoryRecord; 
  onLoadConversation: (record: HistoryRecord) => void;
}) {
  const { deleteRecord } = useHistoryStore();
  const { showConfirmDialog, ConfirmDialogComponent } = useConfirmDialog();

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await showConfirmDialog({
      title: '删除记录',
      message: '确定要删除这条记录吗？此操作无法撤销。',
      variant: 'destructive',
      confirmText: '删除',
      cancelText: '取消'
    });
    
    if (confirmed) {
      await deleteRecord(record.id);
    }
  };

  const handleClick = () => {
    onLoadConversation(record);
  };

  // 获取最后一条消息作为预览
  const getLastMessage = () => {
    if (record.messages.length === 0) return '暂无消息';
    const lastMessage = record.messages[record.messages.length - 1];
    
    // 处理新的消息内容格式
    let content = '';
    if (typeof lastMessage.content === 'string') {
      content = lastMessage.content;
    } else {
      // 提取文本内容并汇总媒体信息
      const textParts: string[] = [];
      let imageCount = 0;
      
      lastMessage.content.forEach(item => {
        if (item.type === 'text') {
          textParts.push(item.text);
        } else if (item.type === 'image') {
          imageCount++;
        }
      });
      
      content = textParts.join(' ');
      if (imageCount > 0) {
        content += ` [包含${imageCount}张图片]`;
      }
    }
    
    return content.length > 100 
      ? content.substring(0, 100) + '...' 
      : content || '暂无内容';
  };

  return (
    <>
      <motion.div
        layout
        whileHover={{ scale: 1.02 }}
        onClick={handleClick}
        className="group p-3 bg-card rounded-lg border border-border hover:border-primary/50 transition-all cursor-pointer"
      >
        <div className="flex items-start gap-3">
          {/* 类型图标 */}
          <div className={cn("mt-1 flex-shrink-0", getTypeColor(record.type))}>
            {getTypeIcon(record.type)}
          </div>
          
          <div className="flex-1 min-w-0">
            {/* 标题 */}
            <h3 className="font-medium text-sm text-foreground truncate mb-1">
              {record.title}
            </h3>
            
            {/* 内容预览 */}
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {getLastMessage()}
            </p>
            
            {/* 标签 */}
            {record.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {record.tags.slice(0, 3).map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 text-xs bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded"
                  >
                    <Tag className="h-2 w-2" />
                    {tag}
                  </span>
                ))}
                {record.tags.length > 3 && (
                  <span className="text-xs text-muted-foreground">
                    +{record.tags.length - 3}
                  </span>
                )}
              </div>
            )}
            
            {/* 元信息 */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>{record.modelName}</span>
                <span>•</span>
                <span>{new Date(record.createdAt).toLocaleDateString()}</span>
              </div>
              
              {/* 删除按钮 */}
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                onClick={handleDelete}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
      
      {/* 确认对话框 */}
      <ConfirmDialogComponent />
    </>
  );
}

// 图片预览模态框组件
function ImagePreviewModal({ 
  file, 
  isOpen, 
  onClose 
}: { 
  file: MediaFile & { record: HistoryRecord } | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  // ESC键关闭
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden'; // 禁止背景滚动
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!file) return null;

  const handleDownload = () => {
    try {
      const url = URL.createObjectURL(file.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('下载失败:', error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          {/* 模态框内容 */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="relative max-w-4xl max-h-[90vh] mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 关闭按钮 */}
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white border-0"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>

            {/* 下载按钮 */}
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-4 right-16 z-10 bg-black/50 hover:bg-black/70 text-white border-0"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4" />
            </Button>

            {/* 图片 */}
            <div className="relative">
              <img
                src={URL.createObjectURL(file.blob)}
                alt={file.record.title}
                className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
              />
              
              {/* 图片信息 - 悬浮在图片底部 */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-4 rounded-b-lg">
                <h3 className="text-white text-lg font-medium mb-2 truncate">
                  {file.record.title}
                </h3>
                
                {/* 信息行 - 竖版图片时使用垂直布局 */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-white/80 text-sm">
                    <span className="bg-white/20 px-2 py-1 rounded text-xs">
                      {file.record.modelName}
                    </span>
                    <span>
                      {new Date(file.record.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-white/70 text-xs">
                    <span className="truncate">{file.fileName}</span>
                    {file.width && file.height && (
                      <>
                        <span>•</span>
                        <span>{file.width} × {file.height}</span>
                      </>
                    )}
                  </div>
                  
                  {file.record.metadata?.originalPrompt && (
                    <p className="text-white/60 text-xs mt-2 line-clamp-2">
                      "{file.record.metadata.originalPrompt}"
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// 媒体网格组件
function MediaGrid() {
  const [mediaFiles, setMediaFiles] = useState<(MediaFile & { record: HistoryRecord })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<(MediaFile & { record: HistoryRecord }) | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { records } = useHistoryStore();
  const { setSelectedTool } = useAppStore();
  const { showConfirmDialog, ConfirmDialogComponent } = useConfirmDialog();

  // 监听获取历史图片数据的事件
  useEffect(() => {
    const handleGetImageData = (e: CustomEvent) => {
      const { dragId } = e.detail;
      const fileData = dragFileCache.get(dragId);
      
      if (fileData) {
        // 响应数据请求
        const responseEvent = new CustomEvent('historyImageDataResponse', {
          detail: {
            dragId: dragId,
            blob: fileData.blob,
            fileName: fileData.fileName
          }
        });
        window.dispatchEvent(responseEvent);
      }
    };

    window.addEventListener('getHistoryImageData', handleGetImageData as EventListener);
    
    return () => {
      window.removeEventListener('getHistoryImageData', handleGetImageData as EventListener);
    };
  }, []);

  // 监听外部预览事件（来自图像生成器）
  useEffect(() => {
    const handleExternalPreview = (e: CustomEvent) => {
      const { file } = e.detail;
      if (file) {
        setPreviewFile(file);
        setIsPreviewOpen(true);
      }
    };

    window.addEventListener('showImagePreview', handleExternalPreview as EventListener);
    
    return () => {
      window.removeEventListener('showImagePreview', handleExternalPreview as EventListener);
    };
  }, []);



  // 热重载功能：监听媒体文件变化
  useEffect(() => {
    const handleMediaUpdate = () => {
      console.log('收到媒体文件更新事件，重新加载...');
      // 重新加载媒体文件
      const loadMediaFiles = async () => {
        setIsLoading(true);
        try {
          const allMediaFiles: (MediaFile & { record: HistoryRecord })[] = [];
          
          for (const record of records.filter(r => r.type === 'media')) {
            try {
              const files = await db.mediaFiles
                .where('historyId')
                .equals(record.id)
                .toArray();
              
              files.forEach((file: MediaFile) => {
                allMediaFiles.push({ ...file, record });
              });
            } catch (error) {
              console.error(`重新加载记录 ${record.id} 的媒体文件失败:`, error);
            }
          }
          
          allMediaFiles.sort((a, b) => 
            new Date(b.record.createdAt).getTime() - new Date(a.record.createdAt).getTime()
          );
          
          console.log('媒体文件重新加载完成:', allMediaFiles.length, '个文件');
          setMediaFiles(allMediaFiles);
        } catch (error) {
          console.error('热重载媒体文件失败:', error);
        } finally {
          setIsLoading(false);
        }
      };

      loadMediaFiles();
    };

    // 监听媒体更新事件
    window.addEventListener('mediaFilesUpdated', handleMediaUpdate);
    
    return () => {
      window.removeEventListener('mediaFilesUpdated', handleMediaUpdate);
    };
  }, [records]);

  // 监听历史记录变化，自动重新加载媒体文件
  useEffect(() => {
    console.log('历史记录发生变化，媒体记录数量:', records.filter(r => r.type === 'media').length);
    
    const loadMediaFiles = async () => {
      setIsLoading(true);
      try {
        const allMediaFiles: (MediaFile & { record: HistoryRecord })[] = [];
        
        for (const record of records.filter(r => r.type === 'media')) {
          try {
            const files = await db.mediaFiles
              .where('historyId')
              .equals(record.id)
              .toArray();
            
            files.forEach((file: MediaFile) => {
              allMediaFiles.push({ ...file, record });
            });
          } catch (error) {
            console.error(`加载记录 ${record.id} 的媒体文件失败:`, error);
          }
        }
        
        allMediaFiles.sort((a, b) => 
          new Date(b.record.createdAt).getTime() - new Date(a.record.createdAt).getTime()
        );
        
        console.log('媒体文件加载完成:', allMediaFiles.length, '个文件');
        setMediaFiles(allMediaFiles);
      } catch (error) {
        console.error('加载媒体文件失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMediaFiles();
  }, [records]);

  // 下载图片
  const handleDownload = async (file: MediaFile) => {
    try {
      const url = URL.createObjectURL(file.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('下载失败:', error);
    }
  };

  // 预览图片
  const handlePreview = (file: MediaFile & { record: HistoryRecord }) => {
    setPreviewFile(file);
    setIsPreviewOpen(true);
  };

  // 关闭预览
  const handleClosePreview = () => {
    setIsPreviewOpen(false);
    setPreviewFile(null);
  };

  // 编辑图片
  const handleEdit = async (file: MediaFile & { record: HistoryRecord }) => {
    try {
      // 切换到图像生成工具
      setSelectedTool('image');
      
      // 等待一小段时间确保组件加载
      setTimeout(() => {
        // 通过自定义事件通知ImageGenerator组件
        const editEvent = new CustomEvent('editImageFromHistory', {
          detail: {
            imageBlob: file.blob,
            fileName: file.fileName,
            originalPrompt: file.record.metadata?.originalPrompt || file.record.title
          }
        });
        window.dispatchEvent(editEvent);
      }, 100);
      
      toast.success("已切换到图像生成器，可以开始编辑图片");
    } catch (error) {
      console.error('编辑图片失败:', error);
      toast.error('编辑图片失败');
    }
  };

  // 删除媒体文件
  const handleDeleteMedia = async (file: MediaFile & { record: HistoryRecord }) => {
    const confirmed = await showConfirmDialog({
      title: '删除媒体文件',
      message: '确定要删除这个媒体文件吗？此操作无法撤销。',
      variant: 'destructive',
      confirmText: '删除',
      cancelText: '取消'
    });

    if (!confirmed) {
      return;
    }

    try {
      // 从数据库删除记录
      await db.historyRecords.delete(file.record.id);
      
      // 更新本地状态
      setMediaFiles(prev => prev.filter(f => f.id !== file.id));
      
      toast.success("媒体文件已删除");
    } catch (error) {
      console.error('删除媒体文件失败:', error);
      toast.error('删除媒体文件失败');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">加载媒体内容...</p>
        </div>
      </div>
    );
  }

  if (mediaFiles.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <Image className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">暂无媒体内容</p>
          <p className="text-xs text-muted-foreground mt-1">
            生成图片后会自动保存在这里
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {mediaFiles.map((file) => (
          <motion.div
            key={file.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative group aspect-square bg-muted rounded-lg overflow-hidden"
          >
            {/* 图片 */}
            <img
              src={URL.createObjectURL(file.blob)}
              alt={file.record.title}
              className="w-full h-full object-cover cursor-grab active:cursor-grabbing group-hover:scale-105 transition-transform duration-200"
              draggable={true}
              onClick={(e) => {
                // 只有在没有拖拽的情况下才触发预览
                if (!e.defaultPrevented) {
                  handlePreview(file);
                }
              }}
              onDragStart={(e) => {
                // 设置拖拽数据 - 直接使用现有的URL
                const imageUrl = e.currentTarget.src;
                const dragId = `history-${Date.now()}`;
                
                // 将文件数据存储到缓存中
                dragFileCache.set(dragId, file);
                
                e.dataTransfer.setData('text/plain', imageUrl);
                e.dataTransfer.setData('application/json', JSON.stringify({
                  type: 'history-image',
                  imageUrl: imageUrl,
                  fileName: file.fileName,
                  recordTitle: file.record.title,
                  dragId: dragId
                }));
                
                // 设置拖拽效果
                e.dataTransfer.effectAllowed = 'copy';
                console.log('开始拖拽历史记录图片:', file.fileName);
              }}
              onDragEnd={(e) => {
                // 清理缓存
                setTimeout(() => {
                  dragFileCache.clear();
                }, 1000); // 延迟清理，确保drop事件能够访问到数据
                console.log('拖拽结束');
              }}
              title="点击预览，拖拽到输入框使用此图片"
            />
            
            {/* 底部信息 */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 pr-10">
              <p className="text-white text-xs truncate">
                {file.record.title}
              </p>
              <p className="text-white/70 text-xs">
                {new Date(file.record.createdAt).toLocaleDateString()}
              </p>
            </div>
            
            {/* 删除按钮 - 右下角，确保在信息区域之上 */}
            <Button
              size="sm"
              variant="destructive"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleDeleteMedia(file);
              }}
              className="absolute bottom-2 right-2 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10"
              title="删除图片"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </motion.div>
        ))}
      </div>

      {/* 图片预览模态框 */}
      <ImagePreviewModal
        file={previewFile}
        isOpen={isPreviewOpen}
        onClose={handleClosePreview}
      />
      
      {/* 确认对话框 */}
      <ConfirmDialogComponent />
    </>
  );
}

// 历史记录库主组件
export function HistoryLibrary() {
  const {
    records,
    isLoading,
    error,
    searchQuery,
    selectedType,
    selectedTags,
    currentPage,
    totalPages,
    total,
    loadRecords,
    loadTags,
    setSearchQuery,
    setSelectedType,
    clearError,
    resetFilters,
  } = useHistoryStore();
  
  // 本地状态管理，避免频繁的loading闪烁
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // 初始化加载，默认显示文本对话
  useEffect(() => {
    if (selectedType === null) {
      setSelectedType('text'); // 默认选择文本
    }
  }, [selectedType, setSelectedType]);

  // 只在组件初始化时加载一次
  useEffect(() => {
    const initializeData = async () => {
      setIsInitialLoading(true);
      await Promise.all([loadRecords(), loadTags()]);
      setIsInitialLoading(false);
    };
    
    initializeData();
  }, [loadRecords, loadTags]);

  // 对话store
  const { loadConversation } = useConversationStore();

  // 加载对话到聊天页面
  const handleLoadConversation = async (record: HistoryRecord) => {
    try {
      await loadConversation(record.id);
      console.log('对话已切换:', record.title);
    } catch (error) {
      console.error('加载对话失败:', error);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* 头部搜索区域 */}
      <div className="p-4 space-y-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">历史记录</h2>
        
        {/* 搜索框 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索对话、标题或内容..."
            className="pl-10"
          />
        </div>
        
        {/* 类型过滤器 */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          <Button
            variant={selectedType === 'text' ? "default" : "ghost"}
            size="sm"
            onClick={() => setSelectedType('text')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 transition-all",
              selectedType === 'text' 
                ? "bg-background text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <MessageSquare className="h-4 w-4" />
            文本对话
          </Button>
          <Button
            variant={selectedType === 'media' ? "default" : "ghost"}
            size="sm"
            onClick={() => setSelectedType('media')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 transition-all",
              selectedType === 'media' 
                ? "bg-background text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Image className="h-4 w-4" />
            媒体内容
          </Button>
        </div>
        
        {/* 错误信息 */}
        {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
            {error}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearError}
              className="ml-2 h-auto p-0 text-destructive hover:text-destructive"
            >
              ✕
            </Button>
          </div>
        )}
        
        {/* 统计信息 */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>共 {total} 条记录</span>
          {(searchQuery || selectedTags.length > 0) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-auto p-1 text-xs"
            >
              清空筛选
            </Button>
          )}
        </div>
      </div>

      {/* 记录列表 */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-3">
            {isInitialLoading ? (
              // 初始加载状态
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">加载中...</p>
                </div>
              </div>
            ) : records.length === 0 ? (
              // 空状态
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery || selectedType ? '没有找到匹配的记录' : '暂无历史记录'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    开始对话后，记录会自动保存在这里
                  </p>
                </div>
              </div>
            ) : selectedType === 'media' ? (
              // 媒体网格
              <MediaGrid />
            ) : (
              // 记录列表
              <AnimatePresence mode="wait">
                <motion.div
                  key={`text-records-${selectedType}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {records.map((record, index) => (
                    <motion.div
                      key={record.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.2 }}
                    >
                      <HistoryCard 
                        record={record} 
                        onLoadConversation={handleLoadConversation}
                      />
                    </motion.div>
                  ))}
                  
                  {/* 分页 */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center pt-4">
                      <div className="text-xs text-muted-foreground">
                        第 {currentPage} 页，共 {totalPages} 页
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
} 