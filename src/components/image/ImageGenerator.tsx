"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { 
  Zap, 
  Send, 
  Settings, 
  User, 
  Bot, 
  Plus,
  Palette,
  ImageIcon,
  X,
  Wand2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useHistoryStore } from "@/lib/history-store";
import { PromptOptimizer } from "@/components/ai/PromptOptimizer";
import { useAppStore, useStorage } from "@/lib/store";

// 图像生成模型配置
const IMAGE_MODELS = [
  {
    id: "dall-e-3",
    name: "DALL·E 3",
    description: "OpenAI最新图像生成模型",
    icon: "🎨"
  },
  {
    id: "seedream-3.0",
    name: "Seedream 3.0", 
    description: "高质量创意图像生成",
    icon: "🌟"
  },
  {
    id: "flux-kontext-pro",
    name: "Flux Kontext Pro",
    description: "专业级上下文理解图像生成",
    icon: "⚡"
  },
  {
    id: "gpt-image-1",
    name: "GPT Image Editor",
    description: "智能图像编辑工具",
    icon: "✏️"
  }
];

// 图像尺寸配置
const IMAGE_SIZES = [
  { value: "1024x1024", label: "正方形 (1:1)", icon: "⏹️" },
  { value: "1792x1024", label: "横屏 (16:9)", icon: "📱" },
  { value: "1024x1792", label: "竖屏 (9:16)", icon: "📲" }
];

interface GenerationRecord {
  id: string;
  prompt: string;
  model: string;
  size: string;
  timestamp: Date;
  imageUrl?: string;
  error?: string;
  isGenerating: boolean;
  sourceImageUrl?: string; // 用于记录编辑源图片
}

// 持久化存储键名
const IMAGE_GENERATOR_STORAGE_KEY = 'imageGeneratorRecords';

// 从localStorage加载记录
const loadRecordsFromStorage = (): GenerationRecord[] => {
  try {
    const stored = localStorage.getItem(IMAGE_GENERATOR_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // 重新构造Date对象，并过滤掉无效的记录
      return parsed
        .map((record: any) => ({
          ...record,
          timestamp: new Date(record.timestamp)
        }))
        .filter((record: GenerationRecord) => {
          // 确保必要字段存在
          return record.id && record.prompt && record.model && record.timestamp;
        });
    }
  } catch (error) {
    console.error('加载图像生成记录失败:', error);
  }
  return [];
};

// 保存记录到localStorage
const saveRecordsToStorage = (records: GenerationRecord[]) => {
  try {
    localStorage.setItem(IMAGE_GENERATOR_STORAGE_KEY, JSON.stringify(records));
  } catch (error) {
    console.error('保存图像生成记录失败:', error);
  }
};

export function ImageGenerator() {
  const storageService = useStorage();
  const [selectedModel, setSelectedModel] = useState("seedream-3.0");
  const [selectedSize, setSelectedSize] = useState("1024x1024");
  const [prompt, setPrompt] = useState("");
  const [records, setRecords] = useState<GenerationRecord[]>(() => loadRecordsFromStorage());
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [isGenerating, setIsGenerating] = useState(() => {
    // 初始化时检查是否有正在生成的任务
    const loadedRecords = loadRecordsFromStorage();
    return loadedRecords.some(record => record.isGenerating);
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]); // 多图片选择
  const [autoUseLastImage, setAutoUseLastImage] = useState(false); // 自动使用上一张图片
  const [showEditTip, setShowEditTip] = useState(true); // 控制编辑提示的显示
  const [isDragOver, setIsDragOver] = useState(false); // 拖拽状态
  const [showPromptOptimizer, setShowPromptOptimizer] = useState(false); // 显示提示词优化器

  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null);
  const modelSelectorRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // 检查当前模型是否支持多图片上传
  const supportsMultipleImages = () => {
    return selectedModel === "gpt-image-1" || selectedModel === "flux-kontext-pro";
  };

  // 自动保存记录到localStorage
  useEffect(() => {
    saveRecordsToStorage(records);
  }, [records]);

  // 组件挂载时清理过期的生成状态
  useEffect(() => {
    const cleanupStaleGenerations = () => {
      const currentTime = Date.now();
      const maxGenerationTime = 10 * 60 * 1000; // 10分钟超时
      
      // 直接从localStorage加载最新记录进行清理
      const currentRecords = loadRecordsFromStorage();
      const updatedRecords = currentRecords.map(record => {
        // 如果记录标记为正在生成，但已超过最大生成时间，标记为失败
        if (record.isGenerating && (currentTime - record.timestamp.getTime()) > maxGenerationTime) {
          console.log(`清理过期生成任务: ${record.id}, 耗时: ${(currentTime - record.timestamp.getTime()) / 1000}秒`);
          return {
            ...record,
            isGenerating: false,
            error: '生成超时，请重新尝试'
          };
        }
        return record;
      });
      
      // 检查是否有清理，如果有则保存到localStorage并更新组件状态
      const hasChanges = updatedRecords.some((record, index) => 
        record.isGenerating !== currentRecords[index]?.isGenerating || 
        record.error !== currentRecords[index]?.error
      );
      
      if (hasChanges) {
        console.log('已清理过期的图像生成任务');
        saveRecordsToStorage(updatedRecords);
        setRecords(updatedRecords);
      }
    };
    
    // 组件挂载时立即检查一次
    cleanupStaleGenerations();
    
    // 每30秒检查一次过期任务
    const cleanupInterval = setInterval(cleanupStaleGenerations, 30000);
    
    return () => clearInterval(cleanupInterval);
  }, []);

  // 监听页面刷新，刷新时清空记录
  useEffect(() => {
    const handleBeforeUnload = () => {
      // 页面刷新时清空localStorage中的记录
      localStorage.removeItem(IMAGE_GENERATOR_STORAGE_KEY);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // 组件卸载时清理Blob URLs（如果有的话）
  useEffect(() => {
    return () => {
      records.forEach(record => {
        if (record.sourceImageUrl && record.sourceImageUrl.startsWith('blob:')) {
          URL.revokeObjectURL(record.sourceImageUrl);
        }
      });
    };
  }, []);

  // 监听新建对话事件和生成状态同步
  useEffect(() => {
    const handleNewSession = () => {
      // 清空记录和localStorage
      const emptyRecords: GenerationRecord[] = [];
      setRecords(emptyRecords);
      saveRecordsToStorage(emptyRecords);
      
      setPrompt("");
      setSelectedImage(null);
      setSelectedImages([]);
      setAutoUseLastImage(false);
      setShowEditTip(true);
      setShowPromptOptimizer(false);
      
      // 清理文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (multiFileInputRef.current) {
        multiFileInputRef.current.value = '';
      }
      
      toast.success("已开始新的生成对话");
    };

    // 监听图像生成完成事件 - 从历史记录或其他地方触发
    const handleImageGenerationComplete = (event: CustomEvent) => {
      const { taskId, imageUrl, success, error } = event.detail;
      
      if (taskId) {
        // 直接更新localStorage中的记录（防止组件卸载时状态丢失）
        const currentRecords = loadRecordsFromStorage();
        const updatedRecords = currentRecords.map(record => {
          if (record.id === taskId) {
            console.log(`收到生成完成通知: ${taskId}, 成功: ${success}`);
            return {
              ...record,
              isGenerating: false,
              imageUrl: success ? imageUrl : undefined,
              error: success ? undefined : (error || '生成失败')
            };
          }
          return record;
        });
        
        // 保存到localStorage并更新组件状态
        saveRecordsToStorage(updatedRecords);
        setRecords(updatedRecords);
      }
    };

    // 监听历史记录编辑事件
    const handleEditFromHistory = (event: CustomEvent) => {
      const { imageBlob, fileName, originalPrompt } = event.detail;
      
      try {
        // 创建File对象
        const file = new File([imageBlob], fileName, { type: imageBlob.type });
        setSelectedImage(file);
        setAutoUseLastImage(false); // 这不是来自上一张图片
        
        // 切换到编辑模式
        setSelectedModel("gpt-image-1");
        
        // 如果有原始提示词，可以预填充到输入框
        if (originalPrompt && originalPrompt !== fileName) {
          setPrompt(`基于以下原始描述进行修改：${originalPrompt}\n\n`);
        }
        
        toast.success("图片已加载，可以开始编辑");
      } catch (error) {
        console.error('加载历史图片失败:', error);
        toast.error('加载历史图片失败');
      }
    };

    window.addEventListener('newImageSession', handleNewSession);
    window.addEventListener('editImageFromHistory', handleEditFromHistory as EventListener);
    window.addEventListener('imageGenerationComplete', handleImageGenerationComplete as EventListener);
    
    return () => {
      window.removeEventListener('newImageSession', handleNewSession);
      window.removeEventListener('editImageFromHistory', handleEditFromHistory as EventListener);
      window.removeEventListener('imageGenerationComplete', handleImageGenerationComplete as EventListener);
    };
  }, []);

  // 点击外部区域关闭模型选择器
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelSelectorRef.current && !modelSelectorRef.current.contains(event.target as Node)) {
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

  // 监听records变化，自动滚动到底部
  useEffect(() => {
    if (records.length > 0) {
      // 延迟滚动，确保DOM已更新
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, [records]);

  // 监听records变化，同步isGenerating状态
  useEffect(() => {
    const hasActiveGeneration = records.some(record => record.isGenerating);
    setIsGenerating(hasActiveGeneration);
  }, [records]);

  // 处理单图片选择
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 验证文件类型
      if (!file.type.startsWith('image/')) {
        toast.error("请选择图片文件");
        return;
      }
      
      // 验证文件大小 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("图片大小不能超过10MB");
        return;
      }
      
      // 检查是否已经有这张图片了（避免重复添加）
      const isDuplicate = selectedImages.some(img => 
        img.name === file.name && img.size === file.size
      );
      
      if (isDuplicate) {
        toast.error("该图片已经添加过了");
        return;
      }
      
      // 检查图片总数限制
      if (selectedImages.length >= 5) {
        toast.error("最多只能选择5张图片");
        return;
      }
      
      // 将新图片添加到多图片列表中，而不是覆盖单图片
      setSelectedImages(prev => [...prev, file]);
      // 清除单图片选择
      setSelectedImage(null);
      toast.success(`图片已添加，当前共 ${selectedImages.length + 1} 张`);
    }
  };

  // 处理多图片选择
  const handleMultipleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;
    
    // 验证文件数量
    if (files.length > 5) {
      toast.error("最多只能选择5张图片");
      return;
    }
    
    // 验证每个文件
    const validFiles: File[] = [];
    for (const file of files) {
      // 验证文件类型
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} 不是有效的图片文件`);
        continue;
      }
      
      // 验证文件大小 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} 大小不能超过10MB`);
        continue;
      }
      
      validFiles.push(file);
    }
    
    if (validFiles.length > 0) {
      // 检查是否会超过总数限制
      const totalFiles = selectedImages.length + validFiles.length;
      if (totalFiles > 5) {
        toast.error(`最多只能选择5张图片，当前已有${selectedImages.length}张`);
        return;
      }
      
      // 过滤掉重复的文件
      const newFiles = validFiles.filter(newFile => 
        !selectedImages.some(existing => 
          existing.name === newFile.name && existing.size === newFile.size
        )
      );
      
      if (newFiles.length === 0) {
        toast.error("所选图片已存在，请选择其他图片");
        return;
      }
      
      // 累积添加而不是覆盖
      setSelectedImages(prev => [...prev, ...newFiles]);
      toast.success(`已添加 ${newFiles.length} 张图片，当前共 ${selectedImages.length + newFiles.length} 张`);
    }
  };

  // 移除选中的图片
  const removeSelectedImage = () => {
    setSelectedImage(null);
    setAutoUseLastImage(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 移除多图片中的某一张
  const removeImageFromMultiple = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  // 清空所有多图片
  const clearMultipleImages = () => {
    setSelectedImages([]);
    if (multiFileInputRef.current) {
      multiFileInputRef.current.value = '';
    }
  };

  // 处理提示词优化
  const handleShowPromptOptimizer = () => {
    if (!prompt.trim()) {
      toast.error("请先输入提示词");
      return;
    }
    setShowPromptOptimizer(true);
  };

  const handleApplyOptimizedPrompt = (optimizedPrompt: string) => {
    setPrompt(optimizedPrompt);
    setShowPromptOptimizer(false);
  };

  const handleClosePromptOptimizer = () => {
    setShowPromptOptimizer(false);
  };

  // 预览图片 - 使用全局事件触发历史记录的预览
  const handlePreviewImage = async (imageUrl: string, prompt: string) => {
    try {
      // 将图片转换为Blob格式，以便与历史记录预览保持一致
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      // 创建临时的文件对象
      const mockFile = {
        id: `temp_${Date.now()}`,
        fileName: `generated_${Date.now()}.png`,
        blob: blob,
        mimeType: 'image/png', // 添加mimeType属性
        record: {
          id: `temp_record_${Date.now()}`,
          title: prompt,
          type: 'media' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          messages: [],
          modelName: 'Generated Image',
          status: 'completed' as const,
          metadata: {
            originalPrompt: prompt
          },
          tags: []
        }
      };
      
      // 触发历史记录的预览事件
      const previewEvent = new CustomEvent('showImagePreview', {
        detail: { file: mockFile }
      });
      window.dispatchEvent(previewEvent);
    } catch (error) {
      console.error('预览图片失败:', error);
      // 降级方案：直接在新窗口打开图片
      window.open(imageUrl, '_blank');
    }
  };

  // 滚动到底部
  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };

  // 获取上一张成功生成的图片
  const getLastGeneratedImage = (): GenerationRecord | null => {
    const successfulRecords = records.filter(r => r.imageUrl && !r.error && !r.isGenerating);
    return successfulRecords.length > 0 ? successfulRecords[successfulRecords.length - 1] : null;
  };

  // 将URL转换为File对象
  const urlToFile = async (url: string, filename: string): Promise<File> => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new File([blob], filename, { type: blob.type });
  };

  // 使用上一张图片进行编辑
  const useLastImageForEdit = async () => {
    const lastImage = getLastGeneratedImage();
    if (lastImage?.imageUrl) {
      try {
        const file = await urlToFile(lastImage.imageUrl, `generated_${lastImage.id}.png`);
        setSelectedImage(file);
        setAutoUseLastImage(true);
        
        // 自动切换到编辑模式
        if (selectedModel !== "gpt-image-1") {
          setSelectedModel("gpt-image-1");
        }
        
        toast.success("已选择上一张生成的图片进行编辑");
      } catch (error) {
        console.error("加载上一张图片失败:", error);
        toast.error("加载上一张图片失败");
      }
    } else {
      toast.error("没有可用的上一张图片");
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("请输入描述");
      return;
    }

    // 检查是否有图像输入（支持文生图和图生图两种模式）
    const hasImageInput = selectedImage || selectedImages.length > 0;
    const isImageEdit = selectedModel === "gpt-image-1" && hasImageInput;
    const isMultiImageModel = supportsMultipleImages() && hasImageInput;

    const newRecord: GenerationRecord = {
      id: Date.now().toString(),
      prompt: prompt.trim(),
      model: selectedModel,
      size: selectedSize,
      timestamp: new Date(),
      isGenerating: true,
      sourceImageUrl: isImageEdit && selectedImage ? URL.createObjectURL(selectedImage) : undefined
    };

    setRecords(prev => [...prev, newRecord]);
    setPrompt("");

    try {
      let response;
      
      if ((isImageEdit || isMultiImageModel) && (selectedImage || selectedImages.length > 0)) {
        // 图像编辑/多图合并请求
        const formData = new FormData();
        formData.append('prompt', newRecord.prompt);
        
        // 如果有多张图片，发送多张
        if (selectedImages.length > 0) {
          selectedImages.forEach((image, index) => {
            formData.append('image', image);
          });
        } else if (selectedImage) {
          // 兼容单图模式
          formData.append('image', selectedImage);
        }
        
        response = await fetch("/api/images/edit", {
          method: "POST",
          body: formData,
        });
      } else {
        // 普通图像生成请求
        response = await fetch("/api/images/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: newRecord.prompt,
            model: selectedModel,
            size: selectedSize,
          }),
        });
      }

      const data = await response.json();
      console.log("📦 API返回完整数据:", JSON.stringify(data, null, 2));

      if (!response.ok) {
        throw new Error(data.error || "生成失败");
      }

      // 检查images字段
      console.log("🔍 检查images字段:", data.images);
      console.log("🔍 images是否为数组:", Array.isArray(data.images));
      console.log("🔍 images长度:", data.images?.length);
      
      if (!data.images || !Array.isArray(data.images) || data.images.length === 0) {
        console.error("❌ 返回数据中没有有效的images字段");
        throw new Error("图像生成失败：未返回图像数据");
      }

      const imageUrl = data.images[0]?.url;
      console.log("🖼️ 提取的图像URL:", imageUrl);

      if (!imageUrl) {
        console.error("❌ 第一个图像对象中没有URL字段");
        console.log("🔍 第一个图像对象:", data.images[0]);
        throw new Error("图像生成失败：图像URL无效");
      }

      // 直接更新localStorage中的记录（防止组件卸载时状态丢失）
      const currentRecords = loadRecordsFromStorage();
      const updatedRecords = currentRecords.map(record => 
        record.id === newRecord.id 
          ? { ...record, imageUrl: imageUrl, isGenerating: false }
          : record
      );
      saveRecordsToStorage(updatedRecords);

      // 更新组件状态（如果组件还存在）
      setRecords(updatedRecords);

      // 触发生成完成事件通知
      window.dispatchEvent(new CustomEvent('imageGenerationComplete', {
        detail: {
          taskId: newRecord.id,
          imageUrl: imageUrl,
          success: true,
          prompt: newRecord.prompt
        }
      }));

      // 保存图片到历史记录数据库
      if (imageUrl) {
        try {
          // 下载图片为Blob
          const imageResponse = await fetch(imageUrl);
          const imageBlob = await imageResponse.blob();
          
          // 创建File对象
          const imageFile = new File([imageBlob], `generated_${Date.now()}.png`, {
            type: 'image/png'
          });
          
          // 创建媒体类型的历史记录
          const mediaRecord = await storageService.createRecord({
            type: 'media',
            title: newRecord.prompt.slice(0, 50) + (newRecord.prompt.length > 50 ? '...' : ''),
            messages: [],
            modelName: IMAGE_MODELS.find(m => m.id === selectedModel)?.name || selectedModel,
            status: 'completed',
            metadata: {
              generationModel: selectedModel,
              imageSize: selectedSize,
              originalPrompt: newRecord.prompt
            },
            tags: ['AI生成', '图像']
          });
          
          // 上传图片文件
          await storageService.uploadFile(imageFile, mediaRecord.id);
          
          console.log("图片已保存到历史记录数据库");
          
          // 触发媒体文件更新事件，通知历史记录热重载
          window.dispatchEvent(new CustomEvent('mediaFilesUpdated'));
        } catch (error) {
          console.error("保存图片到数据库失败:", error);
          // 不阻断用户体验，只在控制台记录错误
        }
      }

      // 清理选中的图片
      if (selectedImage) {
        setSelectedImage(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
      
      // 清理多图片
      if (selectedImages.length > 0) {
        setSelectedImages([]);
        if (multiFileInputRef.current) {
          multiFileInputRef.current.value = '';
        }
      }

      toast.success("图像生成成功！");
    } catch (error) {
      console.error("生成错误:", error);
      
      // 直接更新localStorage中的记录为错误状态（防止组件卸载时状态丢失）
      const currentRecords = loadRecordsFromStorage();
      const updatedRecords = currentRecords.map(record => 
        record.id === newRecord.id 
          ? { ...record, error: error instanceof Error ? error.message : "生成失败", isGenerating: false }
          : record
      );
      saveRecordsToStorage(updatedRecords);

      // 更新组件状态（如果组件还存在）
      setRecords(updatedRecords);

      // 触发生成失败事件通知
      window.dispatchEvent(new CustomEvent('imageGenerationComplete', {
        detail: {
          taskId: newRecord.id,
          success: false,
          error: error instanceof Error ? error.message : "生成失败",
          prompt: newRecord.prompt
        }
      }));

      toast.error(error instanceof Error ? error.message : "生成失败");
    } finally {
    }
  };



  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  // 处理拖拽
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
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
          
          // 如果是支持多图的模型，添加到多图列表中
          if (supportsMultipleImages()) {
            setSelectedImages(prev => [...prev, file]);
            toast.success('图片已添加到合并列表');
          } else {
            setSelectedImage(file);
            setAutoUseLastImage(false);
            
            // 如果拖拽的是图片，自动切换到编辑模式
            if (selectedModel !== "gpt-image-1") {
              setSelectedModel("gpt-image-1");
            }
            
            toast.success('图片已添加，可以开始编辑');
          }
          return;
        }
      }

      // 处理文件拖拽
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        // 过滤出图片文件
        const imageFiles = files.filter(file => file.type.startsWith('image/'));
        
        if (imageFiles.length === 0) {
          toast.error('请拖拽图片文件');
          return;
        }
        
        // 检查文件大小
        const oversizedFiles = imageFiles.filter(file => file.size > 10 * 1024 * 1024);
        if (oversizedFiles.length > 0) {
          toast.error('有图片大小超过10MB');
          return;
        }
        
        // 如果是支持多图的模型且拖拽了多个文件
        if (supportsMultipleImages() && imageFiles.length > 1) {
          if (imageFiles.length > 5) {
            toast.error('最多只能选择5张图片');
            return;
          }
          setSelectedImages(imageFiles);
          toast.success(`已选择 ${imageFiles.length} 张图片进行合并`);
        } else {
          // 单图模式或只有一个文件
          const file = imageFiles[0];
          if (supportsMultipleImages()) {
            setSelectedImages([file]);
            toast.success('图片已添加到合并列表');
          } else {
            setSelectedImage(file);
            setAutoUseLastImage(false);
            toast.success('图片已选择');
          }
        }
      }
    } catch (error) {
      console.error('处理拖拽失败:', error);
      toast.error('处理拖拽失败');
    }
  };



  return (
    <div className="h-full flex flex-col bg-background">
      {/* 生成记录区域 */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full" ref={scrollAreaRef}>
          <div className="p-4 space-y-4">
            {records.length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Palette className="h-12 w-12 mb-4" />
                <h3 className="text-lg font-medium">开始创作吧</h3>
                <p className="text-sm">输入描述，让AI为您生成精美图像</p>
              </div>
            )}

            {records.map((record, index) => (
              <div key={record.id} className="space-y-4">
                {/* 用户输入 */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex gap-3 justify-end"
                >
                  <div className="max-w-3xl rounded-lg px-4 py-2 bg-secondary text-foreground border border-border">
                    <div className="font-medium mb-1">{record.prompt}</div>
                    <div className="text-xs opacity-70 space-y-1">
                      <div>模型: {IMAGE_MODELS.find(m => m.id === record.model)?.name}</div>
                      <div>尺寸: {IMAGE_SIZES.find(s => s.value === record.size)?.label}</div>
                      <div>
                        {record.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-secondary-foreground" />
                  </div>
                </motion.div>

                {/* AI响应 */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 + 0.2 }}
                  className="flex gap-3 justify-start"
                >
                  <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary-foreground" />
                  </div>
                  
                  <div className="max-w-3xl bg-muted text-foreground rounded-lg p-4">
                    {record.isGenerating ? (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-100" />
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-200" />
                        </div>
                        <span className="text-sm text-muted-foreground">正在生成图像...</span>
                      </div>
                    ) : record.error ? (
                      <div className="text-sm text-destructive">
                        生成失败: {record.error}
                      </div>
                                         ) : record.imageUrl ? (
                       <div className="space-y-3">
                         <img
                           src={record.imageUrl}
                           alt={record.prompt}
                           className="max-w-full h-auto rounded-lg border shadow-sm cursor-pointer hover:opacity-80 transition-opacity"
                           draggable={true}
                           onClick={() => handlePreviewImage(record.imageUrl!, record.prompt)}
                           onDragStart={(e) => {
                             e.dataTransfer.setData('text/plain', record.imageUrl!);
                             e.dataTransfer.setData('application/json', JSON.stringify({
                               type: 'generated-image',
                               imageUrl: record.imageUrl!,
                               fileName: `generated_${record.id}.png`,
                               prompt: record.prompt
                             }));
                           }}
                           title="点击预览，拖拽到对话输入框使用此图片"
                         />

                       </div>
                     ) : null}
                    
                    <div className="text-xs opacity-70 mt-2">
                      {record.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </motion.div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <Separator />

      {/* 模型选择和输入区域 */}
      <div className="p-4 space-y-4 bg-card/50">
        {/* 模型选择 */}
        <div className="space-y-2" ref={modelSelectorRef}>
          <Button
            variant="outline"
            onClick={() => setShowModelSelector(!showModelSelector)}
            className="w-full justify-between h-auto p-3"
          >
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="text-sm font-medium">当前模型</span>
              <span className="text-lg">{IMAGE_MODELS.find(m => m.id === selectedModel)?.icon}</span>
              <span className="font-medium">{IMAGE_MODELS.find(m => m.id === selectedModel)?.name}</span>
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
              className="space-y-2"
            >
              {/* 模型选择 */}
              <div className="grid grid-cols-2 gap-2">
                {IMAGE_MODELS.map((model) => (
                  <Button
                    key={model.id}
                    variant={selectedModel === model.id ? "secondary" : "outline"}
                    className={cn(
                      "h-auto p-3 justify-start text-left",
                      selectedModel === model.id && "ring-2 ring-primary/20"
                    )}
                    onClick={() => {
                      setSelectedModel(model.id);
                      // 选择模型后自动折叠选择器
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
              </div>

              {/* 尺寸选择 */}
              <div className="grid grid-cols-3 gap-2">
                {IMAGE_SIZES.map((size) => (
                  <Button
                    key={size.value}
                    variant={selectedSize === size.value ? "secondary" : "outline"}
                    className={cn(
                      "h-auto p-2 text-center",
                      selectedSize === size.value && "ring-2 ring-primary/20"
                    )}
                    onClick={() => {
                      setSelectedSize(size.value);
                      // 选择尺寸后自动折叠选择器
                      setShowModelSelector(false);
                    }}
                  >
                    <div className="text-center w-full">
                      <div className="text-lg">{size.icon}</div>
                      <div className="text-xs text-muted-foreground">{size.label}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* 智能编辑提示 */}
        {showEditTip && !selectedImage && getLastGeneratedImage() && selectedModel === "gpt-image-1" && (
          <div className="p-3 bg-info/10 dark:bg-info/20 border border-info/30 dark:border-info rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-info" />
                <span className="text-sm text-info dark:text-info">
                  检测到上一张生成的图片，是否要继续编辑？
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={useLastImageForEdit}
                  variant="outline"
                  size="sm"
                  className="text-info border-info/40 hover:bg-info/20"
                >
                  使用上一张
                </Button>
                <Button
                  onClick={() => setShowEditTip(false)}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-info hover:bg-info/20"
                  title="关闭提示"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 选中的图片预览 - 单图模式 */}
        {selectedImage && selectedImages.length === 0 && (
          <div className="p-2 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="relative group">
                <img
                  src={URL.createObjectURL(selectedImage)}
                  alt="选中的图片"
                  className="w-16 h-16 object-cover rounded-lg border-2 border-border"
                />
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={removeSelectedImage}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium truncate">{selectedImage.name}</div>
                {autoUseLastImage ? (
                  <div className="text-xs text-muted-foreground">
                    ✨ 来自上一张生成的图片
                  </div>
                ) : selectedImage.name.includes('generated_') || selectedImage.name.includes('edit_') ? (
                  <div className="text-xs text-muted-foreground">
                    📚 来自历史记录
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    📁 用户上传的图片
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 多图片预览 */}
        {selectedImages.length > 0 && (
          <div className="p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">已选择 {selectedImages.length} 张图片</div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearMultipleImages}
                className="h-6 px-2 text-xs"
              >
                清空全部
              </Button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {selectedImages.map((image, index) => (
                <div key={index} className="relative group">
                  <img
                    src={URL.createObjectURL(image)}
                    alt={`图片 ${index + 1}`}
                    className="w-full aspect-square object-cover rounded-lg border-2 border-border"
                  />
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeImageFromMultiple(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1 rounded-b-lg truncate">
                    图片 {index + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 输入区域 */}
        <div 
          className={cn(
            "relative transition-all duration-200",
            isDragOver && "ring-2 ring-primary/50 bg-primary/5"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageSelect}
          />
          
          <input
            ref={multiFileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleMultipleImageSelect}
          />
          
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              isDragOver 
                ? "松开鼠标添加图片..."
                : supportsMultipleImages()
                  ? selectedImages.length > 0
                    ? `描述如何合并这${selectedImages.length}张图片... (例如：将第一张图的人物抠出来，与第二张图的背景融合)`
                    : selectedImage
                      ? "描述您想要对图片进行的编辑..."
                      : "请先上传多张图片进行合并，或单张图片进行编辑"
                  : selectedModel === "gpt-image-1" 
                    ? selectedImage 
                      ? autoUseLastImage 
                        ? "描述您想要对上一张图片进行的进一步修改..."
                        : "描述您想要对图片进行的编辑..."
                      : "请先上传图片或拖拽图片进行编辑"
                    : records.some(r => r.isGenerating) ? "⏳ 后台生成中，可继续输入下一个任务... (Enter生成，Shift+Enter换行)" : "描述您想要生成的图像或拖拽图片进行参考... (Enter生成，Shift+Enter换行)"
            }
            className={cn(
              "w-full min-h-16 max-h-32 p-3 pr-20 text-sm bg-background border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200",
              isDragOver && "border-primary/50 bg-primary/5"
            )}
            
          />
          
          {/* 右下角按钮组 */}
          <div className="absolute right-2 bottom-2 flex gap-1">
            {/* AI提示词优化按钮 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShowPromptOptimizer}
              disabled={!prompt.trim()}
              className="h-8 w-8 hover:bg-muted"
              title="AI提示词优化 - 自动按照专业格式优化提示词"
            >
              <Wand2 className="h-4 w-4" />
            </Button>
            
            {/* 图片上传按钮 */}
            {supportsMultipleImages() ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => multiFileInputRef.current?.click()}
                
                className="h-8 w-8 hover:bg-muted"
                title="上传多张图片进行合并"
              >
                <div className="relative">
                  <ImageIcon className="h-4 w-4" />
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full text-xs flex items-center justify-center text-white font-bold">
                    +
                  </div>
                </div>
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                
                className="h-8 w-8 hover:bg-muted"
                title="上传参考图片"
              >
                <ImageIcon className="h-4 w-4" />
              </Button>
            )}
            
            {/* 发送按钮 */}
            <Button
              onClick={handleGenerate}
              disabled={
                !prompt.trim() || 
                (records.filter(r => r.isGenerating).length >= 3) || 
                (selectedModel === "gpt-image-1" && !selectedImage && selectedImages.length === 0) ||
                (supportsMultipleImages() && selectedImages.length === 0 && !selectedImage)
              }
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-muted"
              title={
                records.filter(r => r.isGenerating).length >= 3 
                  ? "最多同时进行3个生成任务，请等待完成后再试"
                  : "发送生成请求"
              }            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* AI提示词优化器 */}
      {showPromptOptimizer && (
        <PromptOptimizer
          originalPrompt={prompt}
          type="image"
          onApplyOptimized={handleApplyOptimizedPrompt}
          onClose={handleClosePromptOptimizer}
          autoRun={true}
        />
      )}

    </div>
  );
} 