"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MessageSquare, Image, Tag, Trash2, Calendar, Download, Eye, X, Edit, Video, Workflow } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from "@/components/ui/separator";
import { cn } from '@/lib/utils';
import { useHistoryStore } from '@/lib/history-store';
import { useConversationStore } from '@/lib/conversation-store';
import { HistoryRecord, MediaFile } from '@/lib/types';
import { useStorage } from "@/lib/store";
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { getWorkflowTemplate } from '@/lib/workflow-templates';
import { FixedSizeGrid as Grid } from 'react-window';
import { MediaGridSkeleton, HistoryListSkeleton } from '@/components/ui/skeleton';

// 临时存储拖拽的文件数据
const dragFileCache = new Map<string, MediaFile & { record: HistoryRecord }>();

import { mediaCache } from '@/lib/media-cache-manager';

// 清理过期缓存函数现在由 mediaCache 内部管理

// 🚀 虚拟滚动媒体项组件
function VirtualizedMediaItem({ 
  file, 
  onPreview, 
  onDelete, 
  thumbnailsLoading 
}: {
  file: MediaFile & { record: HistoryRecord };
  onPreview: (file: MediaFile & { record: HistoryRecord }) => Promise<void>;
  onDelete: (file: MediaFile & { record: HistoryRecord }) => Promise<void>;
  thumbnailsLoading: boolean;
}) {
  const { setSelectedTool } = useAppStore();
  const dragFileCache = useMemo(() => new Map<string, MediaFile & { record: HistoryRecord }>(), []);

  const handleEdit = useCallback(async (file: MediaFile & { record: HistoryRecord }) => {
    try {
      setSelectedTool('image');
      
      setTimeout(() => {
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
  }, [setSelectedTool]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative group aspect-square bg-muted rounded-lg overflow-hidden"
    >
      {/* 媒体内容 - 智能分层显示：优先缩略图，按需加载完整图片 */}
      {file.mimeType?.startsWith('image/') && (file.thumbnailBlob || file.blob) ? (
        <div className="relative w-full h-full">
          <img
            src={URL.createObjectURL(file.thumbnailBlob || file.blob!)}
            alt={file.record.title}
            className={cn(
              "w-full h-full object-cover cursor-grab active:cursor-grabbing group-hover:scale-105 transition-transform duration-200",
              // 缩略图时添加轻微模糊效果，暗示这是预览图
              file.thumbnailBlob && !file.blob ? "filter blur-[0.5px]" : ""
            )}
            draggable={true}
            onClick={async (e) => {
              // 只有在没有拖拽的情况下才触发预览
              if (!e.defaultPrevented) {
                await onPreview(file);
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
            onDragEnd={() => {
              // 清理缓存
              setTimeout(() => {
                dragFileCache.clear();
              }, 1000);
              console.log('拖拽结束');
            }}
            title="点击预览，拖拽到输入框使用此图片"
          />
          

        </div>
      ) : file.mimeType?.startsWith('video/') ? (
        // 视频显示逻辑 - 修复缩略图显示
        <div className="relative w-full h-full">
          {file.thumbnailBlob ? (
            // 优先显示缩略图
            <img
              src={URL.createObjectURL(file.thumbnailBlob)}
              alt={file.record.title}
              className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform duration-200"
              onClick={async (e) => {
                if (!e.defaultPrevented) {
                  await onPreview(file);
                }
              }}
              title="点击预览完整视频"
            />
          ) : file.blob ? (
            // 如果没有缩略图，显示视频第一帧
            <video
              src={URL.createObjectURL(file.blob)}
              className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform duration-200"
              preload="metadata"
              onClick={async (e) => {
                if (!e.defaultPrevented) {
                  await onPreview(file);
                }
              }}
              title="点击预览视频"
            />
          ) : (
            // 视频占位符
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <Video className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
          {/* 视频播放图标覆盖层 */}
          <div 
            className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors cursor-pointer"
            onClick={async (e) => {
              if (!e.defaultPrevented) {
                await onPreview(file);
              }
            }}
            title="点击预览完整视频"
          >
            <div className="w-8 h-8 bg-white/80 rounded-full flex items-center justify-center">
              <Video className="w-4 h-4 text-black ml-0.5" />
            </div>
          </div>
        </div>
      ) : (
        // 其他文件类型的占位符
        <div className="w-full h-full bg-muted flex items-center justify-center">
          <div className="text-center">
            <div className="w-6 h-6 bg-muted-foreground/20 rounded mx-auto mb-1"></div>
            <p className="text-xs text-muted-foreground">
              {file.fileName.split('.').pop()?.toUpperCase()}
            </p>
          </div>
        </div>
      )}
      
      {/* 底部信息 */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 pr-8">
        <p className="text-white text-xs truncate">
          {file.record.title}
        </p>
        <p className="text-white/70 text-xs">
          {new Date(file.record.createdAt).toLocaleDateString()}
        </p>
      </div>
      
      {/* 删除按钮 */}
      <Button
        size="sm"
        variant="destructive"
        onClick={async (e) => {
          e.stopPropagation();
          e.preventDefault();
          await onDelete(file);
        }}
        className="absolute bottom-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10"
        title="删除图片"
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </motion.div>
  );
}

// 🚀 优化的媒体网格组件（先修复显示问题，再优化性能）
function VirtualizedMediaGrid({
  mediaFiles,
  onPreview,
  onDelete,
  previewFile,
  isPreviewOpen,
  onClosePreview,
  thumbnailsLoading
}: {
  mediaFiles: (MediaFile & { record: HistoryRecord })[];
  onPreview: (file: MediaFile & { record: HistoryRecord }) => Promise<void>;
  onDelete: (file: MediaFile & { record: HistoryRecord }) => Promise<void>;
  previewFile: (MediaFile & { record: HistoryRecord }) | null;
  isPreviewOpen: boolean;
  onClosePreview: () => void;
  thumbnailsLoading: boolean;
}) {
  const { showConfirmDialog, ConfirmDialogComponent } = useConfirmDialog();

  // 如果没有媒体文件，显示空状态
  if (mediaFiles.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <Image className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">暂无媒体内容</p>
          <p className="text-xs text-muted-foreground mt-1">
            生成图片或视频后会自动保存在这里
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <ScrollArea className="w-full h-full">
      {/* 修复的网格布局 - 3项一行，支持滚动 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4">
        {mediaFiles.map((file, index) => (
          <div key={`${file.record.id}-${file.fileName}-${index}`} className="aspect-square">
            <VirtualizedMediaItem
              file={file}
              onPreview={onPreview}
              onDelete={onDelete}
              thumbnailsLoading={thumbnailsLoading}
            />
          </div>
        ))}
      </div>
      
      {/* 图片预览模态框 */}
      <ImagePreviewModal
        file={previewFile}
        isOpen={isPreviewOpen}
        onClose={onClosePreview}
      />
      
      {/* 确认对话框 */}
      <ConfirmDialogComponent />
    </ScrollArea>
  );
}

// 获取类型对应的图标
const getTypeIcon = (record: HistoryRecord) => {
  // 检查是否是工作流记录（通过metadata判断）
  if (record.metadata?.workflowId) {
    return <Workflow className="h-4 w-4" />;
  }
  
  // 根据类型显示图标
  switch (record.type) {
    case 'text':
      return <MessageSquare className="h-4 w-4" />;
    case 'media':
      return <Image className="h-4 w-4" />;
    case 'chat':
      return <MessageSquare className="h-4 w-4" />;
    case 'workflow':
      return <Workflow className="h-4 w-4" />;
    default:
      return <MessageSquare className="h-4 w-4" />;
  }
};

// 获取类型对应的颜色
const getTypeColor = (record: HistoryRecord) => {
  // 检查是否是工作流记录（通过metadata判断）
  if (record.metadata?.workflowId) {
    return 'text-workflow-primary';
  }
  
  // 根据类型显示颜色
  switch (record.type) {
    case 'text':
      return 'text-info';
    case 'media':
      return 'text-success';
    case 'chat':
      return 'text-primary';
    case 'workflow':
      return 'text-workflow-primary';
    default:
      return 'text-muted';
  }
};

// 获取显示名称（工作流显示工作流类型，普通对话显示模型名）
const getDisplayName = (record: HistoryRecord) => {
  // 检查是否是工作流记录
  if (record.metadata?.workflowId) {
    const template = getWorkflowTemplate(record.metadata.workflowId);
    return template ? template.name : '工作流';
  }
  
  // 普通对话显示模型名
  return record.modelName;
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
    if (record.messages.length === 0) return null; // 不显示任何内容
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
      : content || null; // 没有内容时返回null
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
          <div className={cn("mt-1 flex-shrink-0", getTypeColor(record))}>
            {getTypeIcon(record)}
          </div>
          
          <div className="flex-1 min-w-0">
            {/* 标题 */}
            <h3 className="font-medium text-sm text-foreground truncate mb-1">
              {record.title}
            </h3>
            
            {/* 内容预览 */}
            {getLastMessage() && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {getLastMessage()}
            </p>
            )}
            
            {/* 标签 */}
            {(() => {
              // 过滤掉"工作流"标签
              const filteredTags = record.tags.filter(tag => tag !== '工作流');
              return filteredTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                  {filteredTags.slice(0, 3).map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 text-xs bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded"
                  >
                    <Tag className="h-2 w-2" />
                    {tag}
                  </span>
                ))}
                  {filteredTags.length > 3 && (
                  <span className="text-xs text-muted-foreground">
                      +{filteredTags.length - 3}
                  </span>
                )}
              </div>
              );
            })()}
            
            {/* 元信息 */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>{getDisplayName(record)}</span>
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

// 媒体预览模态框组件（支持图片和视频）
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
      if (!file.blob) {
        console.error('文件数据不可用');
        return;
      }
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

            {/* 媒体内容 */}
            <div className="relative">
              {file.mimeType?.startsWith('image/') && file.blob ? (
              <img
                src={URL.createObjectURL(file.blob)}
                alt={file.record.title}
                className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
              />
              ) : file.mimeType?.startsWith('video/') && file.blob ? (
                <video
                  src={URL.createObjectURL(file.blob)}
                  controls
                  className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl border"
                  preload="metadata"
                  onLoadedMetadata={(e) => {
                    // 视频元数据加载完成后，设置到第一帧并暂停
                    const video = e.currentTarget;
                    video.currentTime = 0;
                    video.pause();
                  }}
                  style={{
                    // 确保视频背景不是黑色
                    backgroundColor: 'transparent'
                  }}
                >
                  您的浏览器不支持视频播放
                </video>
              ) : (
                <div className="w-full h-[60vh] flex items-center justify-center bg-muted rounded-lg shadow-2xl">
                  <div className="text-center text-muted-foreground">
                    <div className="w-16 h-16 bg-muted-foreground/10 rounded-lg mx-auto mb-4 flex items-center justify-center">
                      <span className="text-2xl">📄</span>
                    </div>
                    <p>不支持预览此文件类型</p>
                    <p className="text-sm mt-1">{file.fileName}</p>
                  </div>
                </div>
              )}
              
              {/* 媒体信息 - 悬浮在底部，为视频控制条留出空间 */}
              <div className={cn(
                "absolute left-0 right-0 p-4",
                file.mimeType?.startsWith('video/') 
                  ? "bottom-16 rounded-lg" // 视频：给控制条留出空间（64px） 
                  : "bottom-0 rounded-b-lg" // 图片：贴底显示
              )}>
                {/* 信息容器 - 带自适应背景 */}
                <div className="bg-black/60 backdrop-blur-sm rounded-lg p-3 space-y-2">
                  <h3 className="text-white text-lg font-medium truncate">
                  {file.record.title}
                </h3>
                
                  {/* 信息行 */}
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-white/90 text-sm">
                      <span className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded text-xs">
                      {file.record.modelName}
                    </span>
                    <span>
                      {new Date(file.record.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                    <div className="flex items-center gap-2 text-white/80 text-xs">
                    <span className="truncate">{file.fileName}</span>
                      {file.mimeType?.startsWith('image/') && file.width && file.height && (
                      <>
                        <span>•</span>
                        <span>{file.width} × {file.height}</span>
                      </>
                    )}
                      {file.mimeType?.startsWith('video/') && file.record.metadata?.videoDuration && (
                        <>
                          <span>•</span>
                          <span>{file.record.metadata.videoDuration}s</span>
                        </>
                      )}
                      {file.mimeType?.startsWith('video/') && file.record.metadata?.videoResolution && (
                        <>
                          <span>•</span>
                          <span>{file.record.metadata.videoResolution}</span>
                        </>
                      )}
                  </div>
                  
                  {file.record.metadata?.originalPrompt && (
                      <p className="text-white/70 text-xs mt-2 line-clamp-2">
                      "{file.record.metadata.originalPrompt}"
                    </p>
                  )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// 🚀 渲染优化：媒体网格组件
const MediaGrid = React.memo(function MediaGrid() {
  const [mediaFiles, setMediaFiles] = useState<(MediaFile & { record: HistoryRecord })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<(MediaFile & { record: HistoryRecord }) | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { records } = useHistoryStore();
  const { setSelectedTool } = useAppStore();
  const { showConfirmDialog, ConfirmDialogComponent } = useConfirmDialog();
  const storageService = useStorage();  // 使用Supabase存储服务

  // 使用useMemo优化媒体记录的计算，避免不必要的重新渲染
  const mediaRecords = useMemo(() => 
    records.filter(r => r.type === 'media'), 
    [records]
  );

  // 生成媒体记录的唯一标识，只在真正变化时触发重新加载
  const mediaRecordsKey = useMemo(() => 
    mediaRecords.map((r: HistoryRecord) => `${r.id}-${r.updatedAt}`).join('|'),
    [mediaRecords]
  );

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



  // 移除重复的事件监听，只保留records变化监听，避免闪烁

  // 监听历史记录变化，只在media记录真正变化时重新加载
  useEffect(() => {
    console.log('媒体记录变化，数量:', mediaRecords.length);
    
    const loadMediaFiles = async () => {
      setIsLoading(true);
      try {
        // 🚀 如果media记录数量少于20，直接加载所有媒体记录（突破分页限制）
        let allMediaRecords = mediaRecords;
        
        if (mediaRecords.length < 50) { // 如果当前记录数少于50，尝试加载更多
          try {
            // 直接调用存储服务获取所有媒体记录
            const allMediaResponse = await storageService.listRecords({
              type: 'media',
              limit: 1000, // 获取更多记录
              page: 1,
              sortBy: 'createdAt',
              sortOrder: 'desc'
            });
            allMediaRecords = allMediaResponse.items;
            console.log('🔄 获取所有媒体记录:', allMediaRecords.length);
          } catch (error) {
            console.warn('无法获取所有媒体记录，使用当前记录:', error);
          }
        }
        
        // 🚀 阶段1：快速显示基础布局（批量查询优化）
        const mediaRecordIds = allMediaRecords.map(record => record.id);
        const filesMap = await storageService.getFilesByHistoryIds(mediaRecordIds);
        
        // 构建基础媒体文件数组（不包含blob数据）
        const allMediaFiles: (MediaFile & { record: HistoryRecord })[] = [];
        for (const record of allMediaRecords) {
          const files = filesMap.get(record.id) || [];
          for (const file of files) {
            allMediaFiles.push({ ...file, record });
          }
        }
        
        allMediaFiles.sort((a, b) => 
          new Date(b.record.createdAt).getTime() - new Date(a.record.createdAt).getTime()
        );
        
        console.log('✅ 阶段1：基础布局加载完成:', allMediaFiles.length, '个文件');
        setMediaFiles(allMediaFiles);
        setIsLoading(false);
        
        // 🔄 阶段2：分批加载所有缩略图（支持图片和视频）
        if (mediaCache) {
          const batchSize = 12; // 每批加载12个
          const batches = [];
          
          // 分批处理所有媒体文件
          for (let i = 0; i < allMediaFiles.length; i += batchSize) {
            batches.push(allMediaFiles.slice(i, i + batchSize));
          }
          
          console.log(`🔄 阶段2：开始分批加载 ${allMediaFiles.length} 个缩略图，共 ${batches.length} 批`);
          
          // 逐批加载缩略图
          for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            const batch = batches[batchIndex];
            const batchPromises = batch.map(async (file, index) => {
              // 只为图片和视频生成缩略图
              if (!file.mimeType?.startsWith('image/') && !file.mimeType?.startsWith('video/')) {
                return file;
              }
              
              try {
                const thumbnailBlob = await mediaCache!.getThumbnailBlob(file.url, 200);
                if (thumbnailBlob) {
                  file.thumbnailBlob = thumbnailBlob;
                  console.log(`✅ 缩略图加载成功 (批${batchIndex + 1}/${batches.length}, 第${index + 1}/${batch.length}): ${file.fileName}`);
                }
              } catch (error) {
                console.warn(`缩略图加载失败: ${file.fileName}`, error);
              }
              
              return file;
            });
            
            // 等待当前批次完成
            const batchWithThumbnails = await Promise.all(batchPromises);
            
            // 立即更新状态，让用户看到加载进度
            setMediaFiles(prev => {
              const updated = [...prev];
              batchWithThumbnails.forEach((fileWithThumbnail) => {
                if (fileWithThumbnail.thumbnailBlob) {
                  const fileIndex = updated.findIndex(f => f.id === fileWithThumbnail.id);
                  if (fileIndex !== -1) {
                    updated[fileIndex] = fileWithThumbnail;
                  }
                }
              });
              return updated;
            });
            
            // 短暂延迟，避免阻塞UI
            if (batchIndex < batches.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
          
          console.log('✅ 阶段2：所有缩略图加载完成');
        }
        
        // 🔧 显示增强的缓存统计信息
        if (mediaCache) {
          const cacheStats = mediaCache.getCacheStats();
          console.log(`📊 缓存详情: ${cacheStats.memoryEntries}个文件, ${cacheStats.memorySize}, 配置${cacheStats.configInfo}`);
          console.log(`📈 缓存指标: 内存使用${(cacheStats.memoryUsage * 100).toFixed(1)}%, 缩略图${cacheStats.thumbnailCacheSize}个, 内存压力${(cacheStats.memoryPressure * 100).toFixed(1)}%`);
          console.log(`🎯 访问统计: 平均访问${cacheStats.averageAccessCount.toFixed(1)}次, 最新文件${cacheStats.newestEntry}`);
        }
        
        // 🚀 阶段3：智能预热缓存（基于使用模式）
        setTimeout(async () => {
          if (mediaCache) {
            const recentFiles = allMediaFiles.slice(0, 12); // 最近12个文件
            const frequentFiles = allMediaFiles.slice(12, 24); // 次新的12个文件
            
            console.log(`🚀 阶段3：启动智能预热机制`);
            await mediaCache.warmUpCache(recentFiles, frequentFiles);
          }
        }, 2000); // 延迟2秒，确保用户界面响应优先
        
      } catch (error) {
        console.error('❌ 分层加载失败:', error);
        setIsLoading(false);
      }
    };

    loadMediaFiles();
  }, [mediaRecordsKey, mediaRecords, storageService]);

  // 下载图片
  const handleDownload = async (file: MediaFile) => {
    try {
      if (!file.blob) {
        console.error('文件数据不可用');
        return;
      }
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

  // 预览图片 - 支持按需加载完整图片
  const handlePreview = async (file: MediaFile & { record: HistoryRecord }) => {
    setPreviewFile(file);
    setIsPreviewOpen(true);
    
    // 🚀 按需加载完整图片：如果当前只有缩略图，异步加载完整图片
    if (file.thumbnailBlob && !file.blob && mediaCache) {
      console.log(`🔄 按需加载完整图片: ${file.fileName}`);
      
      try {
        const fullBlob = await mediaCache.getMediaBlob(file.url, 'high');
        if (fullBlob) {
          // 更新文件的blob数据
          file.blob = fullBlob;
          
          // 更新状态以触发重新渲染
          setMediaFiles(prev => prev.map(f => 
            f.id === file.id ? { ...f, blob: fullBlob } : f
          ));
          
          // 更新预览文件
          setPreviewFile({ ...file, blob: fullBlob });
          console.log(`✅ 完整图片加载成功: ${file.fileName}`);
        }
      } catch (error) {
        console.warn(`完整图片加载失败: ${file.fileName}`, error);
      }
    }
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
      // 从数据库删除历史记录
      await storageService.deleteRecord(file.record.id);
      
      // 删除媒体文件
      await storageService.deleteFile(file.id);
      
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

  // 显示基本加载状态
  if (isLoading && mediaFiles.length > 0) {
    return (
      <div className="space-y-4">
        {/* 已经有基础布局，显示缩略图加载进度 */}
        <div className="flex items-center justify-center py-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span>正在加载缩略图...</span>
          </div>
        </div>
        
        {/* 使用简化的网格显示所有媒体文件 */}
        <VirtualizedMediaGrid
          mediaFiles={mediaFiles}
          onPreview={handlePreview}
          onDelete={handleDeleteMedia}
          previewFile={previewFile}
          isPreviewOpen={isPreviewOpen}
          onClosePreview={handleClosePreview}
          thumbnailsLoading={false}
        />
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
            生成图片或视频后会自动保存在这里
          </p>
        </div>
      </div>
    );
  }

        // 🚀 使用优化的网格显示媒体文件
      return (
        <VirtualizedMediaGrid
          mediaFiles={mediaFiles}
          onPreview={handlePreview}
          onDelete={handleDeleteMedia}
          previewFile={previewFile}
          isPreviewOpen={isPreviewOpen}
          onClosePreview={handleClosePreview}
          thumbnailsLoading={false}
        />
      );
});

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
  
  // 获取全局状态
  const { historyType } = useAppStore();
  
  // 本地状态管理，避免频繁的loading闪烁
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [userManuallyChanged, setUserManuallyChanged] = useState(false);

  // 智能切换逻辑：工具切换时自动切换，但不覆盖用户手动选择
  useEffect(() => {
    // 只有在用户没有手动切换的情况下才自动切换
    if (!userManuallyChanged) {
      const typeMapping: { [key: string]: HistoryRecord['type'] } = {
        'chat': 'text',    // 聊天工具 -> 智能助理区块
        'image': 'media',  // 图像工具 -> 媒体内容区块
        'video': 'media',  // 视频工具 -> 媒体内容区块
      };
      
      const mappedType = typeMapping[historyType] || 'text';
      if (selectedType !== mappedType) {
        setSelectedType(mappedType);
      }
    }
  }, [historyType, selectedType, setSelectedType, userManuallyChanged]);

  // 重置用户手动切换状态（当工具切换时）
  useEffect(() => {
    setUserManuallyChanged(false);
  }, [historyType]);

  // 初始化加载，默认显示智能助理
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

  // 监听媒体生成成功事件，自动切换到媒体板块
  useEffect(() => {
    const handleMediaGenerated = () => {
      console.log('检测到媒体生成成功，切换到媒体内容板块');
      setSelectedType('media');
      setUserManuallyChanged(false); // 重置手动切换状态，允许后续自动切换
    };

    window.addEventListener('mediaFilesUpdated', handleMediaGenerated);
    
    return () => {
      window.removeEventListener('mediaFilesUpdated', handleMediaGenerated);
    };
  }, [setSelectedType]);

  // 对话store
  const { loadConversation } = useConversationStore();

  // 加载对话到聊天页面
  const handleLoadConversation = async (record: HistoryRecord) => {
    try {
      await loadConversation(record.id);
      
      // 触发自定义事件通知ChatPage
      const event = new CustomEvent('loadHistoryConversation', {
        detail: { conversationId: record.id }
      });
      window.dispatchEvent(event);
      
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
            variant={selectedType !== 'media' ? "default" : "ghost"}
            size="sm"
            onClick={() => {
              setSelectedType('text'); // 默认选择text类型代表智能助理
              setUserManuallyChanged(true); // 标记为用户手动切换
            }}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 transition-all",
              selectedType !== 'media' 
                ? "bg-background text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <MessageSquare className="h-4 w-4" />
            智能助理
          </Button>
          <Button
            variant={selectedType === 'media' ? "default" : "ghost"}
            size="sm"
            onClick={() => {
              setSelectedType('media');
              setUserManuallyChanged(true); // 标记为用户手动切换
            }}
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
            ) : selectedType === 'media' ? (
              // 媒体网格 - 让MediaGrid自己处理空状态
              <MediaGrid />
            ) : records.filter(record => record.type !== 'media').length === 0 ? (
              // 智能助理空状态
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery || records.length > 0 
                      ? '没有找到匹配的智能助理记录' 
                      : '暂无历史记录'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    开始对话后，记录会自动保存在这里
                  </p>
                </div>
              </div>
            ) : (
              // 记录列表 - 显示所有非媒体类型的记录
              <AnimatePresence mode="wait">
                <motion.div
                  key={`assistant-records-${selectedType}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {records
                    .filter(record => record.type !== 'media') // 智能助理：显示所有非媒体类型
                    .map((record, index) => (
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