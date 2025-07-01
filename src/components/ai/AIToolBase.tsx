/**
 * AI工具基座组件 - 确保所有AI工具100%样式统一
 * 提取ChatPage的标准布局，所有工具共享相同的视觉规范
 */

"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Send, Settings, Zap, ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useHistoryStore } from "@/lib/history-store";
import { useConversationStore } from "@/lib/conversation-store";
import { useStorage } from "@/lib/store";
import { getSemanticColor } from "@/lib/design-system";
import { convertFileToBase64, isValidImageFile, compressImage } from "@/lib/utils";
import { toast } from 'sonner';

// 基座配置接口
interface AIToolConfig {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  semanticColor: 'chat' | 'image' | 'video' | 'workflow';
  placeholder: string;
  newSessionEvent: string;
  storageKey?: string; // localStorage存储键名
  supportsSizes?: { value: string; label: string; icon: string }[]; // 支持的尺寸选项
  supportsDurations?: { value: number; label: string; icon: string }[]; // 支持的时长选项
}

interface AIModel {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface AIToolResult {
  id: string;
  input: string;
  output: any;
  timestamp: number;
}

interface AIToolBaseProps {
  config: AIToolConfig;
  models: AIModel[];
  defaultModel: string;
  onProcess: (input: string, model: string, options?: {
    images?: File[];
    size?: string;
    duration?: number;
  }) => Promise<any>;
  renderResult: (result: AIToolResult) => React.ReactNode;
  renderEmptyState?: () => React.ReactNode;
  isProcessing?: boolean;
  supportsImages?: boolean; // 是否支持图片上传
  saveToConversation?: boolean; // 是否保存到对话历史，默认true
}

export function AIToolBase({
  config,
  models,
  defaultModel,
  onProcess,
  renderResult,
  renderEmptyState,
  isProcessing = false,
  supportsImages = false,
  saveToConversation = true
}: AIToolBaseProps) {
  const storageService = useStorage();
  // 基础状态 - 与ChatPage完全一致
  const [inputValue, setInputValue] = useState("");
  const [selectedModel, setSelectedModel] = useState(defaultModel);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [results, setResults] = useState<AIToolResult[]>([]);
  const [isWorking, setIsWorking] = useState(false);
  
  // 扩展选项状态
  const [selectedSize, setSelectedSize] = useState(config.supportsSizes?.[0]?.value || "");
  const [selectedDuration, setSelectedDuration] = useState(config.supportsDurations?.[0]?.value || 5);
  
  // 图片上传相关状态
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 滚动控制和模型选择器引用
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const modelSelectorRef = useRef<HTMLDivElement>(null);
  
  // Store hooks - 复用ChatPage的历史记录逻辑
  const { loadRecords } = useHistoryStore();
  const { 
    currentConversation, 
    addMessage, 
    clearConversation 
  } = useConversationStore();

  // 自动滚动到底部的函数
  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };

  // 页面加载时滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, []);

  // 结果更新时滚动到底部
  useEffect(() => {
    if (results.length > 0) {
      scrollToBottom();
    }
  }, [results]);

  // 处理状态变化时滚动到底部
  useEffect(() => {
    if (isWorking || isProcessing) {
      scrollToBottom();
    }
  }, [isWorking, isProcessing]);

  // 监听新建会话事件 - 与ChatPage模式一致
  useEffect(() => {
    const handleNewSession = () => {
      handleNewConversation();
    };
    
    window.addEventListener(config.newSessionEvent, handleNewSession);
    
    return () => {
      window.removeEventListener(config.newSessionEvent, handleNewSession);
    };
  }, [config.newSessionEvent]);

  // 点击外部区域关闭模型选择器 - 与三个模块保持一致
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showModelSelector &&
        modelSelectorRef.current &&
        !modelSelectorRef.current.contains(event.target as Node)
      ) {
        setShowModelSelector(false);
      }
    };

    if (showModelSelector) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showModelSelector]);

  // 监听页面刷新，清空localStorage记录 - 与ImageGenerator和VideoGenerator一致
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (config.storageKey) {
        localStorage.removeItem(config.storageKey);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [config.storageKey]);

  // 新建对话 - 复用ChatPage逻辑
  const handleNewConversation = async () => {
    try {
      clearConversation();
      setResults([]);
      setSelectedImages([]);
      setInputValue("");
      setShowModelSelector(false);
      
      // 重置扩展选项到默认值
      if (config.supportsSizes && config.supportsSizes.length > 0) {
        setSelectedSize(config.supportsSizes[0].value);
      }
      if (config.supportsDurations && config.supportsDurations.length > 0) {
        setSelectedDuration(config.supportsDurations[0].value);
      }
      
      // 清空localStorage记录
      if (config.storageKey) {
        localStorage.removeItem(config.storageKey);
      }
      
      loadRecords();
      console.log(`已开始新${config.name}会话`);
    } catch (error) {
      console.error(`新建${config.name}会话失败:`, error);
    }
  };

  // 处理用户输入 - 标准化处理流程
  const handleSubmit = async () => {
    if ((!inputValue.trim() && selectedImages.length === 0) || isWorking || isProcessing) return;

    setIsWorking(true);
    const currentInput = inputValue.trim();
    const currentImages = [...selectedImages];

    try {
      // 调用工具特定的处理函数
      const output = await onProcess(currentInput, selectedModel, {
        images: supportsImages ? currentImages : undefined,
        size: selectedSize || undefined,
        duration: selectedDuration || undefined
      });
      
      // 创建结果对象
      const result: AIToolResult = {
        id: Date.now().toString(),
        input: currentInput,
        output,
        timestamp: Date.now(),
      };

      setResults(prev => [result, ...prev]);

      // 保存到对话历史 - 只有启用时才保存
      if (saveToConversation) {
        try {
          let activeConversation = currentConversation || await storageService.getActiveConversation();
          
          if (!activeConversation) {
            const title = `${config.name}: ${currentInput.length > 20 ? currentInput.substring(0, 20) + '...' : currentInput}`;
            activeConversation = await storageService.createConversation(title, selectedModel);
          }
          
          const userMessage = {
            id: Date.now().toString(),
            role: "user" as const,
            content: currentInput,
            timestamp: Date.now(),
          };
          
          const assistantMessage = {
            id: (Date.now() + 1).toString(),
            role: "assistant" as const,
            content: typeof output === 'string' ? output : `✅ ${config.name}处理完成`,
            timestamp: Date.now(),
          };
          
          await storageService.addMessageToConversation(activeConversation.id, userMessage);
          await storageService.addMessageToConversation(activeConversation.id, assistantMessage);
          
          addMessage(userMessage);
          addMessage(assistantMessage);
        } catch (saveError) {
          console.error(`保存${config.name}历史记录失败:`, saveError);
        }
      }

      setInputValue("");
      setSelectedImages([]);

    } catch (error) {
      console.error(`${config.name}处理错误:`, error);
      
      // 添加错误结果
      const errorResult: AIToolResult = {
        id: Date.now().toString(),
        input: currentInput,
        output: { error: error instanceof Error ? error.message : '处理失败' },
        timestamp: Date.now(),
      };
      setResults(prev => [errorResult, ...prev]);
    } finally {
      setIsWorking(false);
    }
  };

  // 键盘事件处理 - 与ChatPage一致
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // 图片选择处理 - 复用ChatPage逻辑
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!supportsImages) return;
    
    const files = Array.from(e.target.files || []);
    
    // 验证文件类型和数量
    const validImages = files.filter(file => {
      if (!isValidImageFile(file)) {
        toast.error(`${file.name} 不是支持的图片格式`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB限制
        toast.error(`${file.name} 文件过大，请选择小于10MB的图片`);
        return false;
      }
      return true;
    });

    if (selectedImages.length + validImages.length > 4) {
      toast.error('最多只能选择4张图片');
      return;
    }

    setSelectedImages(prev => [...prev, ...validImages]);
    
    // 清空input以允许选择相同文件
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 移除选中的图片
  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  // 拖拽处理 - 复用ChatPage逻辑
  const handleDragOver = (e: React.DragEvent) => {
    if (!supportsImages) return;
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!supportsImages) return;
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    if (!supportsImages) return;
    e.preventDefault();
    setIsDragOver(false);

    try {
      // 检查是否是从对话或历史记录拖拽的图片
      const jsonData = e.dataTransfer.getData('application/json');
      if (jsonData) {
        const dragData = JSON.parse(jsonData);
        if (dragData.type === 'chat-image' || dragData.type === 'history-image' || dragData.type === 'generated-image') {
          let blob: Blob;
          let fileName = dragData.fileName || 'dragged-image.png';
          
          // 如果是历史记录图片，尝试从缓存获取
          if (dragData.type === 'history-image' && dragData.dragId) {
            // 通过全局事件获取文件数据
            const event = new CustomEvent('getHistoryImageData', { detail: { dragId: dragData.dragId } });
            window.dispatchEvent(event);
            
            // 等待响应
            await new Promise(resolve => {
              const handler = (e: CustomEvent) => {
                if (e.detail.dragId === dragData.dragId && e.detail.blob) {
                  blob = e.detail.blob;
                  fileName = e.detail.fileName || fileName;
                }
                window.removeEventListener('historyImageDataResponse', handler as EventListener);
                resolve(void 0);
              };
              window.addEventListener('historyImageDataResponse', handler as EventListener);
              setTimeout(resolve, 100); // 超时保护
            });
          }
          
          // 如果没有从缓存获取到，则从URL获取
          if (!blob!) {
            const response = await fetch(dragData.imageUrl);
            blob = await response.blob();
          }
          
          const file = new File([blob], fileName, { type: blob.type });
          
          if (selectedImages.length >= 4) {
            toast.error('最多只能选择4张图片');
            return;
          }
          
          setSelectedImages(prev => [...prev, file]);
          toast.success('图片已添加到对话中');
          return;
        }
      }

      // 处理文件拖拽
      const files = Array.from(e.dataTransfer.files);
      const validImages = files.filter(file => {
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} 不是图片文件`);
          return false;
        }
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} 文件过大，请选择小于10MB的图片`);
          return false;
        }
        return true;
      });

      if (selectedImages.length + validImages.length > 4) {
        toast.error('最多只能选择4张图片');
        return;
      }

      if (validImages.length > 0) {
        setSelectedImages(prev => [...prev, ...validImages]);
        toast.success(`已添加${validImages.length}张图片`);
      }
    } catch (error) {
      console.error('处理拖拽失败:', error);
      toast.error('处理拖拽失败');
    }
  };

  // 获取当前模型信息
  const currentModel = models.find(model => model.id === selectedModel);

  // 默认空状态渲染 - 统一使用ImageGenerator的样式风格
  const defaultEmptyState = () => (
    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
      <config.icon className="h-12 w-12 mb-4" />
      <h3 className="text-lg font-medium">开始创作吧</h3>
      <p className="text-sm">输入描述，让AI为您生成精美{config.name.replace('生成器', '').replace('器', '')}</p>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-background">
      {/* 结果展示区域 - 复用ChatPage的ScrollArea布局 */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea ref={scrollAreaRef} className="h-full">
          <div className="p-4 space-y-4">
            {results.length === 0 ? (
              renderEmptyState ? renderEmptyState() : defaultEmptyState()
            ) : (
              results.map((result, index) => (
                <motion.div
                  key={result.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  {renderResult(result)}
                </motion.div>
              ))
            )}

            {/* 处理中指示器 - 复用ChatPage的样式 */}
            {(isWorking || isProcessing) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 justify-start"
              >
                <div className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                  getSemanticColor(config.semanticColor, 'bg')
                )}>
                  <config.icon className={cn("h-4 w-4", getSemanticColor(config.semanticColor, 'icon'))} />
                </div>
                <div className="bg-muted rounded-lg px-4 py-2">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </ScrollArea>
      </div>

      <Separator />

      {/* 模型选择和输入区域 - 完全复用ChatPage的布局和样式 */}
      <div className="p-4 space-y-4 bg-card/50">
        {/* 模型选择 - 与ChatPage样式完全一致 */}
        <div className="space-y-2" ref={modelSelectorRef}>
          <Button
            variant="outline"
            onClick={() => setShowModelSelector(!showModelSelector)}
            className="w-full justify-between h-auto p-3"
          >
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="text-sm font-medium">当前模型</span>
              <span className="text-lg">{currentModel?.icon}</span>
              <span className="font-medium">{currentModel?.name}</span>
            </div>
            <div className={cn(
              "transform transition-transform duration-200",
              showModelSelector && "rotate-180"
            )}>
              ▼
            </div>
          </Button>
          
          {showModelSelector && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-2 gap-2"
            >
              {models.map((model) => (
                <Button
                  key={model.id}
                  variant={selectedModel === model.id ? "secondary" : "outline"}
                  className={cn(
                    "h-auto p-3 justify-start text-left",
                    selectedModel === model.id && "ring-2 ring-primary/20"
                  )}
                  onClick={() => {
                    setSelectedModel(model.id);
                    setShowModelSelector(false);
                  }}
                >
                  <div className="flex items-center gap-2 w-full">
                    <span className="text-lg">{model.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{model.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {model.description}
                      </div>
                    </div>
                    {selectedModel === model.id && (
                      <Zap className="h-4 w-4 text-primary flex-shrink-0" />
                    )}
                  </div>
                </Button>
              ))}
            </motion.div>
          )}
        </div>

        {/* 尺寸选择 - 仅当配置支持时显示 */}
        {config.supportsSizes && config.supportsSizes.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-foreground">尺寸选择</div>
            <div className="grid grid-cols-3 gap-2">
              {config.supportsSizes.map((size) => (
                <Button
                  key={size.value}
                  variant={selectedSize === size.value ? "secondary" : "outline"}
                  className={cn(
                    "h-auto p-2 justify-start text-left",
                    selectedSize === size.value && "ring-2 ring-primary/20"
                  )}
                  onClick={() => setSelectedSize(size.value)}
                >
                  <div className="flex items-center gap-2 w-full">
                    <span>{size.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium">{size.label}</div>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* 时长选择 - 仅当配置支持时显示 */}
        {config.supportsDurations && config.supportsDurations.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-foreground">时长选择</div>
            <div className="grid grid-cols-3 gap-2">
              {config.supportsDurations.map((duration) => (
                <Button
                  key={duration.value}
                  variant={selectedDuration === duration.value ? "secondary" : "outline"}
                  className={cn(
                    "h-auto p-2 justify-start text-left",
                    selectedDuration === duration.value && "ring-2 ring-primary/20"
                  )}
                  onClick={() => setSelectedDuration(duration.value)}
                >
                  <div className="flex items-center gap-2 w-full">
                    <span>{duration.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium">{duration.label}</div>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* 选中的图片预览 */}
        {supportsImages && selectedImages.length > 0 && (
          <div className="flex flex-wrap gap-2 p-2 bg-muted/30 rounded-lg">
            {selectedImages.map((image, index) => (
              <div key={index} className="relative group">
                <img
                  src={URL.createObjectURL(image)}
                  alt={`选中的图片 ${index + 1}`}
                  className="w-16 h-16 object-cover rounded-lg border-2 border-border"
                />
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeImage(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 rounded-b-lg truncate">
                  {image.name}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 输入区域 - 与ChatPage完全一致 */}
        <div 
          className={cn(
            "relative transition-all duration-200",
            supportsImages && isDragOver && "ring-2 ring-primary/50 bg-primary/5"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {supportsImages && (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageSelect}
            />
          )}
          
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              supportsImages && isDragOver 
                ? "松开鼠标添加图片..." 
                : supportsImages 
                  ? `${config.placeholder} (支持拖拽图片上传，Enter发送，Shift+Enter换行)`
                  : `${config.placeholder} (Enter发送，Shift+Enter换行)`
            }
            className={cn(
              "w-full min-h-16 max-h-32 p-3 text-sm bg-background border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200",
              supportsImages ? "pr-20" : "pr-12",
              supportsImages && isDragOver && "border-primary/50 bg-primary/5"
            )}
            disabled={isWorking || isProcessing}
          />
          
          {/* 右下角按钮组 - 与ChatPage样式一致 */}
          <div className="absolute right-2 bottom-2 flex gap-1">
            {supportsImages && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={isWorking || isProcessing || selectedImages.length >= 4}
                className="h-8 w-8 hover:bg-muted"
              >
                <ImageIcon className="h-4 w-4" />
              </Button>
            )}
            
            <Button
              onClick={handleSubmit}
              disabled={(!inputValue.trim() && selectedImages.length === 0) || isWorking || isProcessing}
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-muted"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 