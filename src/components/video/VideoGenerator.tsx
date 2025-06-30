/**
 * 视频生成器 - 完全基于ImageGenerator结构，实现最佳用户体验
 * 
 * 核心特性：
 * 1. 对话框中视频正常播放预览
 * 2. 历史记录中显示视频缩略图
 * 3. 点击缩略图预览完整视频
 * 4. 与图片生成100%统一的用户体验
 */

import React, { useState, useRef, useEffect } from "react";
import { Video, Settings, Zap, User, Bot, Send, ImageIcon, X, Plus, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { localStorageService } from "@/lib/local-storage";
import { toast } from 'sonner';
import { PromptOptimizer } from "@/components/ai/PromptOptimizer";
// import { VideoAssistant } from './VideoAssistant';

// 可灵视频生成模型配置 - 基于真实API
const VIDEO_MODELS = [
  {
    id: "kling-v2-1-master",
    name: "可灵 v2.1 Master",
    description: "最新版本，最高质量",
    icon: "🚀"
  },
  {
    id: "kling-v2-master",
    name: "可灵 v2 Master", 
    description: "高质量模型",
    icon: "🎬"
  },
  {
    id: "kling-v1-6",
    name: "可灵 v1.6",
    description: "图生视频专用",
    icon: "🖼️"
  },
  {
    id: "kling-v1",
    name: "可灵 v1",
    description: "基础模型",
    icon: "📹"
  }
];

// 视频模式配置 - 根据可灵文档
const VIDEO_MODES = [
  { value: "std", label: "标准模式", description: "性价比高，基础模式", icon: "⚡" },
  { value: "pro", label: "专家模式", description: "高品质，视频质量更佳", icon: "🏆" }
];

// 视频画面比例配置 - 根据可灵文档
const VIDEO_ASPECT_RATIOS = [
  { value: "16:9", label: "横屏 16:9", description: "适合电脑观看", icon: "💻" },
  { value: "9:16", label: "竖屏 9:16", description: "适合手机观看", icon: "📱" },
  { value: "1:1", label: "方形 1:1", description: "适合社交媒体", icon: "⬜" }
];

// 视频时长配置 - 根据可灵文档
const VIDEO_DURATIONS = [
  { value: 5, label: "5秒", icon: "🔥" },
  { value: 10, label: "10秒", icon: "⭐" }
];

// localStorage存储键
const VIDEO_GENERATOR_STORAGE_KEY = 'video-generator-records';

// 生成记录接口 - 根据可灵文档更新
interface GenerationRecord {
  id: string;
  prompt: string;
  model: string;
  mode: string; // 新增：视频模式 std/pro
  aspectRatio: string; // 修改：画面比例 16:9, 9:16, 1:1
  duration: number;
  timestamp: Date;
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  isGenerating: boolean;
  sourceImageUrl?: string;

  originalPrompt?: string; // 新增：原始prompt（未优化）
}

// 从localStorage加载记录
const loadRecordsFromStorage = (): GenerationRecord[] => {
  try {
    const stored = localStorage.getItem(VIDEO_GENERATOR_STORAGE_KEY);
    if (stored) {
      const records = JSON.parse(stored);
      return records.map((record: any) => ({
        ...record,
        timestamp: new Date(record.timestamp)
      }));
    }
  } catch (error) {
    console.error('加载视频生成记录失败:', error);
  }
  return [];
};

// 保存记录到localStorage
const saveRecordsToStorage = (records: GenerationRecord[]) => {
  try {
    localStorage.setItem(VIDEO_GENERATOR_STORAGE_KEY, JSON.stringify(records));
  } catch (error) {
    console.error('保存视频生成记录失败:', error);
  }
};

// 删除generateVideoThumbnail函数，不再需要生成缩略图

export function VideoGenerator() {
  const [selectedModel, setSelectedModel] = useState("kling-v2-1-master");
  const [selectedMode, setSelectedMode] = useState("std"); // 新增：模式选择
  const [selectedAspectRatio, setSelectedAspectRatio] = useState("16:9"); // 修改：比例选择
  const [selectedDuration, setSelectedDuration] = useState(5);
  const [prompt, setPrompt] = useState("");
  const [records, setRecords] = useState<GenerationRecord[]>(() => loadRecordsFromStorage());
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]); // 多图支持
  const [isDragOver, setIsDragOver] = useState(false);
  

  
  // 提示词优化器状态
  const [showPromptOptimizer, setShowPromptOptimizer] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null); // 多图文件输入
  const modelSelectorRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // 根据模型和场景判断模式是否可用
  const isModeSupported = (mode: string): boolean => {
    const hasImages = selectedImage || selectedImages.length > 0;
    const isMultiImage = selectedImages.length > 1;
    
    switch (selectedModel) {
      case 'kling-v1':
        // kling-v1: 文生视频/图生视频都支持 std/pro
        return true;
        
      case 'kling-v1-6':
        if (isMultiImage) {
          // 多图参考: 支持 std/pro
          return true;
        } else if (hasImages) {
          // 图生视频: 支持 std/pro
          return true;
        } else {
          // 文生视频: 仅支持 std
          return mode === 'std';
        }
        
      case 'kling-v2-master':
      case 'kling-v2-1-master':
        // v2模型不支持 std/pro 选项，使用默认模式
        return false;
        
      default:
        return true;
    }
  };

  // 检查当前模型是否支持模式选择
  const supportsMode = (): boolean => {
    return selectedModel === 'kling-v1' || selectedModel === 'kling-v1-6';
  };



  // 自动保存记录到localStorage
  useEffect(() => {
    saveRecordsToStorage(records);
  }, [records]);

  // 多图上传时自动切换到kling-v1-6模型
  useEffect(() => {
    if (selectedImages.length > 1) {
      if (selectedModel !== "kling-v1-6") {
        setSelectedModel("kling-v1-6");
        toast.info("检测到多图上传，已自动切换到可灵 v1.6 模型（图生视频专用）");
      }
    }
  }, [selectedImages.length, selectedModel]);

  // 自动调整模式选择，当模型或场景变化时
  useEffect(() => {
    if (!supportsMode()) {
      // v2模型不支持模式选择，设置为默认值
      setSelectedMode('std');
      return;
    }

    // 检查当前选择的模式是否在新场景下仍然可用
    if (!isModeSupported(selectedMode)) {
      // 如果当前模式不可用，自动切换到std
      setSelectedMode('std');
      
      const hasImages = selectedImage || selectedImages.length > 0;
      
      if (selectedModel === 'kling-v1-6' && !hasImages) {
        toast.info("可灵 v1.6 文生视频模式仅支持标准模式，已自动切换");
      }
    }
  }, [selectedModel, selectedImage, selectedImages.length, selectedMode]);



  // 监听页面刷新，刷新时清空记录
  useEffect(() => {
    const handleBeforeUnload = () => {
      localStorage.removeItem(VIDEO_GENERATOR_STORAGE_KEY);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // 组件卸载时清理Blob URLs
  useEffect(() => {
    return () => {
      records.forEach(record => {
        if (record.sourceImageUrl && record.sourceImageUrl.startsWith('blob:')) {
          URL.revokeObjectURL(record.sourceImageUrl);
        }
      });
    };
  }, []);

  // 监听新建对话事件
  useEffect(() => {
    const handleNewSession = () => {
      const emptyRecords: GenerationRecord[] = [];
      setRecords(emptyRecords);
      saveRecordsToStorage(emptyRecords);
      
      setPrompt("");
      setSelectedImage(null);
      setSelectedImages([]); // 清空多图选择
      setShowPromptOptimizer(false); // 关闭提示词优化器
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (multiFileInputRef.current) {
        multiFileInputRef.current.value = '';
      }
      
      toast.success("已开始新的视频生成对话");
    };

    // 监听视频生成完成事件（跨页面状态同步）
    const handleVideoCompleted = (event: CustomEvent) => {
      const { recordId, videoUrl, thumbnailUrl } = event.detail;
      console.log('🎬 收到视频生成完成事件:', recordId);
      
      setRecords(prev => prev.map(record => 
        record.id === recordId 
          ? { 
              ...record, 
              videoUrl,
              thumbnailUrl,
              isGenerating: false 
            }
          : record
      ));
      
      setIsGenerating(false);
    };

    window.addEventListener('newVideoSession', handleNewSession);
    window.addEventListener('videoGenerationCompleted', handleVideoCompleted as EventListener);
    
    return () => {
      window.removeEventListener('newVideoSession', handleNewSession);
      window.removeEventListener('videoGenerationCompleted', handleVideoCompleted as EventListener);
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
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, [records]);

  // 监听页面可见性变化，恢复生成状态
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // 页面重新可见时，检查是否有正在生成的任务需要更新状态
        console.log('📱 页面重新可见，检查生成状态...');
        
        // 检查localStorage中是否有已完成的任务
        const storedRecords = loadRecordsFromStorage();
        setRecords(prev => {
          const updatedRecords = prev.map(record => {
            if (record.isGenerating) {
              // 查找localStorage中对应的已完成记录
              const storedRecord = storedRecords.find(stored => 
                stored.id === record.id && !stored.isGenerating && stored.videoUrl
              );
              if (storedRecord) {
                console.log('🔄 恢复已完成的生成任务:', record.id);
                return { ...storedRecord, isGenerating: false };
              }
            }
            return record;
          });
          
          // 如果有更新，保存到localStorage
          if (JSON.stringify(updatedRecords) !== JSON.stringify(prev)) {
            saveRecordsToStorage(updatedRecords);
            toast.success('已同步最新的生成结果');
          }
          
          return updatedRecords;
        });
        
        // 更新全局生成状态
        const hasGenerating = storedRecords.some(record => record.isGenerating);
        setIsGenerating(hasGenerating);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // 处理图片选择
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error("请选择图片文件");
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) {
        toast.error("图片大小不能超过10MB");
        return;
      }
      
      setSelectedImage(file);
      toast.success("图片已选择");
    }
  };

  // 移除选中的图片
  const removeSelectedImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 多图上传处理
  const handleMultipleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // 验证文件类型和数量
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
      
      // 自动切换到可灵 v1.6 模型（当有多图时）
      const totalImages = selectedImages.length + validImages.length;
      if (totalImages > 1 && selectedModel !== 'kling-v1-6') {
        setSelectedModel('kling-v1-6');
        toast.info("检测到多图上传，已自动切换到可灵 v1.6 模型");
      }
      
      toast.success(`已添加${validImages.length}张参考图片`);
    }
  };

  // 移除多图中的单张图片
  const removeImageFromMultiple = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  // 清空所有多图
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

  // 删除handlePreviewVideo函数，视频直接在对话框中播放

  // 滚动到底部
  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };





  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("请输入描述");
      return;
    }

    const newRecord: GenerationRecord = {
      id: Date.now().toString(),
      prompt: prompt.trim(),
      model: selectedModel,
      mode: selectedMode,
      aspectRatio: selectedAspectRatio,
      duration: selectedDuration,
      timestamp: new Date(),
      isGenerating: true,
      sourceImageUrl: selectedImage ? URL.createObjectURL(selectedImage) : undefined,

    };

    setRecords(prev => [...prev, newRecord]);
    setPrompt("");
    setIsGenerating(true);

    try {
      // 准备API调用数据
      const requestBody: any = {
        input: newRecord.prompt,
        model: selectedModel,
        mode: selectedMode,
        aspect_ratio: selectedAspectRatio,
        duration: selectedDuration
      };





      // 处理图片上传 - 支持单图和多图
      if (selectedImages.length > 0) {
        // 多图模式 - 转换为image_list格式
        const imageList = [];
        for (const image of selectedImages) {
          const base64Image = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              // 移除data:image/xxx;base64,前缀，只保留Base64编码部分
              const base64Only = result.split(',')[1];
              resolve(base64Only);
            };
            reader.onerror = reject;
            reader.readAsDataURL(image);
          });
          
          imageList.push({ image: base64Image });
        }
        
        requestBody.image_list = imageList;
        console.log(`🖼️ ${selectedImages.length}张图片已转换为Base64，准备多图生视频`);
      } else if (selectedImage) {
        // 单图模式 - 保持原有逻辑
        const base64Image = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            // 移除data:image/xxx;base64,前缀，只保留Base64编码部分
            const base64Only = result.split(',')[1];
            resolve(base64Only);
          };
          reader.onerror = reject;
          reader.readAsDataURL(selectedImage);
        });
        
        requestBody.images = [base64Image];
        console.log('🖼️ 单张图片已转换为Base64');
      }

      // API调用
      const response = await fetch('/api/video/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      // 检查响应是否为JSON格式
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("API返回非JSON响应:", text.substring(0, 200));
        throw new Error("服务器响应格式错误，请检查API配置或网络连接");
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "视频生成失败");
      }

      // 更新记录
      setRecords(prev => prev.map(record => 
        record.id === newRecord.id 
          ? { 
              ...record, 
              videoUrl: data.videoUrl,
              thumbnailUrl: data.thumbnailUrl,
              isGenerating: false 
            }
          : record
      ));

      // 保存视频到历史记录数据库
      if (data.videoUrl) {
        try {
          console.log("🎬 开始保存视频到历史记录...");
          
          // 下载视频
          const videoResponse = await fetch(data.videoUrl);
          const videoBlob = await videoResponse.blob();
          
          // 创建视频文件
          const videoFile = new File([videoBlob], `generated_video_${Date.now()}.mp4`, {
            type: 'video/mp4'
          });
          
          // 保存到数据库（只保存一个记录）
          const mediaRecord = await localStorageService.createRecord({
            type: 'media',
            title: newRecord.prompt.slice(0, 50) + (newRecord.prompt.length > 50 ? '...' : ''),
            messages: [],
            modelName: VIDEO_MODELS.find(m => m.id === selectedModel)?.name || selectedModel,
            status: 'completed',
            metadata: {
              generationModel: selectedModel,
              videoDuration: data.duration,
              videoResolution: data.resolution,
              originalPrompt: newRecord.prompt,
              task_id: data.metadata?.task_id,
              hasImages: selectedImage ? true : false,
              fileType: 'video',
              videoUrl: data.videoUrl // 保存原始URL用于预览
            },
            tags: ['AI生成', '视频']
          });
          
          // 只上传视频文件，不上传缩略图（避免重复记录）
          await localStorageService.uploadFile(videoFile, mediaRecord.id);
          
          console.log("✅ 视频已保存到历史记录数据库");
          window.dispatchEvent(new CustomEvent('mediaFilesUpdated'));
          
          // 发送视频生成完成事件，用于跨页面状态同步
          window.dispatchEvent(new CustomEvent('videoGenerationCompleted', {
            detail: {
              recordId: newRecord.id,
              videoUrl: data.videoUrl,
              thumbnailUrl: data.thumbnailUrl
            }
          }));
          
          toast.success("视频已保存到历史记录");
        } catch (error) {
          console.error("❌ 保存视频到数据库失败:", error);
          toast.error("保存到历史记录失败，但视频生成成功");
        }
      }

      // 清理选中的图片和运镜设置
      if (selectedImage) {
        setSelectedImage(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
      if (selectedImages.length > 0) {
        setSelectedImages([]);
        if (multiFileInputRef.current) {
          multiFileInputRef.current.value = '';
        }
      }



      toast.success("视频生成成功！");
    } catch (error) {
      console.error("生成错误:", error);
      
      // 更新记录为错误状态
      setRecords(prev => prev.map(record => 
        record.id === newRecord.id 
          ? { ...record, error: error instanceof Error ? error.message : "生成失败", isGenerating: false }
          : record
      ));

      toast.error(error instanceof Error ? error.message : "生成失败");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  // 处理拖拽 - 完全复制ImageGenerator的逻辑
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
          let blob: Blob | undefined;
          let fileName = dragData.fileName || 'dragged-image.png';
          
          if (dragData.type === 'history-image' && dragData.dragId) {
            console.log('🔍 请求历史记录图片数据:', dragData.dragId);
            const event = new CustomEvent('getHistoryImageData', { detail: { dragId: dragData.dragId } });
            window.dispatchEvent(event);
            
            await new Promise(resolve => {
              const handler = (e: CustomEvent) => {
                console.log('📦 收到历史记录图片响应:', e.detail);
                if (e.detail.dragId === dragData.dragId && e.detail.blob) {
                  blob = e.detail.blob as Blob;
                  fileName = e.detail.fileName || fileName;
                  console.log('✅ 历史记录图片数据获取成功，大小:', blob.size);
                } else {
                  console.log('❌ 历史记录图片数据获取失败');
                }
                window.removeEventListener('historyImageDataResponse', handler as EventListener);
                resolve(void 0);
              };
              window.addEventListener('historyImageDataResponse', handler as EventListener);
              setTimeout(() => {
                console.log('⏰ 历史记录图片数据获取超时');
                resolve(void 0);
              }, 1000); // 增加超时时间到1秒
            });
          }
          
          // 如果没有获取到blob数据，尝试从URL获取
          if (!blob && dragData.imageUrl) {
            console.log('🔄 从URL获取图片数据:', dragData.imageUrl);
            try {
              const response = await fetch(dragData.imageUrl);
              if (response.ok) {
                blob = await response.blob();
                console.log('✅ 从URL获取图片成功，大小:', blob.size);
              } else {
                console.error('❌ 从URL获取图片失败:', response.status);
              }
            } catch (error) {
              console.error('❌ 从URL获取图片异常:', error);
            }
          }
          
          // 验证blob数据
          if (!blob || blob.size < 1000) {
            console.error('❌ 图片数据无效，大小:', blob?.size || 0);
            toast.error('拖拽的图片数据无效，请重新尝试或直接上传图片文件');
            return;
          }
          
          // 验证是否为图片类型
          if (!blob.type.startsWith('image/')) {
            console.error('❌ 不是图片类型:', blob.type);
            toast.error('拖拽的文件不是图片格式');
            return;
          }
          
          const file = new File([blob], fileName, { type: blob.type });
          
          // 智能添加逻辑：优先添加到多图列表，实现累积效果
          if (selectedImages.length >= 4) {
            toast.error('最多只能选择4张图片');
            return;
          }
          
          // 如果当前有单图但没有多图，将单图移到多图列表
          if (selectedImage && selectedImages.length === 0) {
            setSelectedImages([selectedImage, file]);
            setSelectedImage(null);
            
            // 自动切换到可灵 v1.6 模型
            if (selectedModel !== 'kling-v1-6') {
              setSelectedModel('kling-v1-6');
              toast.info("检测到多图上传，已自动切换到可灵 v1.6 模型");
            }
            
            toast.success('图片已添加到多图参考中（共2张）');
          } else if (selectedImages.length > 0) {
            // 已有多图，直接添加
            setSelectedImages(prev => [...prev, file]);
            toast.success(`图片已添加到多图参考中（共${selectedImages.length + 1}张）`);
          } else {
            // 没有任何图片，设置为单图
            setSelectedImage(file);
            toast.success('图片已添加到视频生成中');
          }
          
          console.log('🎉 图片文件创建成功:', {
            name: file.name,
            size: file.size,
            type: file.type
          });
          return;
        }
      }

      // 处理文件拖拽 - 支持多图
      const files = Array.from(e.dataTransfer.files);
      const imageFiles = files.filter(file => file.type.startsWith('image/'));
      
      if (imageFiles.length > 0) {
        // 验证文件大小
        const validImages = imageFiles.filter(file => {
          if (file.size > 10 * 1024 * 1024) {
            toast.error(`${file.name} 文件过大，请选择小于10MB的图片`);
            return false;
          }
          return true;
        });

        if (validImages.length === 0) return;

        // 检查数量限制
        if (selectedImages.length + validImages.length > 4) {
          toast.error('最多只能选择4张图片');
          return;
        }

        // 智能处理拖拽文件：支持累积多图
        if (selectedImage && selectedImages.length === 0) {
          // 如果有单图，将其移到多图列表
          setSelectedImages([selectedImage, ...validImages]);
          setSelectedImage(null);
          
          // 自动切换到可灵 v1.6 模型
          if (selectedModel !== 'kling-v1-6') {
            setSelectedModel('kling-v1-6');
            toast.info("检测到多图上传，已自动切换到可灵 v1.6 模型");
          }
          
          toast.success(`已添加${validImages.length}张参考图片（共${1 + validImages.length}张）`);
        } else if (selectedImages.length > 0) {
          // 已有多图，直接添加
          setSelectedImages(prev => [...prev, ...validImages]);
          toast.success(`已添加${validImages.length}张参考图片（共${selectedImages.length + validImages.length}张）`);
        } else if (validImages.length === 1) {
          // 没有任何图片，且只拖拽了一张，设置为单图模式
          setSelectedImage(validImages[0]);
          toast.success('图片已添加到视频生成中');
        } else {
          // 没有任何图片，但拖拽了多张，直接设置为多图模式
          setSelectedImages(validImages);
          
          // 自动切换到可灵 v1.6 模型
          if (selectedModel !== 'kling-v1-6') {
            setSelectedModel('kling-v1-6');
            toast.info("检测到多图上传，已自动切换到可灵 v1.6 模型");
          }
          
          toast.success(`已添加${validImages.length}张参考图片`);
        }
      } else {
        toast.error('请拖拽图片文件');
      }
    } catch (error) {
      console.error('拖拽处理失败:', error);
      toast.error('拖拽处理失败');
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* 生成记录区域 - 完全复制ImageGenerator的结构 */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full" ref={scrollAreaRef}>
          <div className="p-4 space-y-4">
            {records.length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Video className="h-12 w-12 mb-4" />
                <h3 className="text-lg font-medium">开始创作吧</h3>
                <p className="text-sm">输入描述，让AI为您生成精彩视频</p>
              </div>
            )}

            {records.map((record, index) => (
              <div key={record.id} className="space-y-4">
                {/* 用户输入 - 完全复制ImageGenerator */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex gap-3 justify-end"
                >
                  <div className="max-w-3xl rounded-lg px-4 py-2 bg-secondary text-foreground border border-border">
                    <div className="font-medium mb-1">{record.prompt}</div>
                    <div className="text-xs opacity-70 space-y-1">
                      <div>模型: {VIDEO_MODELS.find(m => m.id === record.model)?.name}</div>
                      <div>模式: {VIDEO_MODES.find(m => m.value === record.mode)?.label}</div>
                      <div>比例: {VIDEO_ASPECT_RATIOS.find(r => r.value === record.aspectRatio)?.label}</div>
                      <div>时长: {record.duration}秒</div>
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

                {/* AI响应 - 关键：视频显示逻辑 */}
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
                        <span className="text-sm text-muted-foreground">正在生成视频...</span>
                      </div>
                    ) : record.error ? (
                      <div className="text-sm text-destructive">
                        生成失败: {record.error}
                      </div>
                    ) : record.videoUrl ? (
                      <div className="space-y-3">
                        <video
                          src={record.videoUrl}
                          controls
                          className="max-w-full h-auto rounded-lg border shadow-sm"
                          draggable={true}
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', record.videoUrl!);
                            e.dataTransfer.setData('application/json', JSON.stringify({
                              type: 'generated-video',
                              videoUrl: record.videoUrl!,
                              fileName: `generated_${record.id}.mp4`,
                              prompt: record.prompt
                            }));
                          }}
                          title="拖拽到对话输入框使用此视频"
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

      {/* 模型选择和输入区域 - 完全复制ImageGenerator */}
      <div className="p-4 space-y-4 bg-card/50">
        {/* 模型选择 */}
        <div className="space-y-2" ref={modelSelectorRef}>
          <Button
            variant="outline"
            onClick={() => setShowModelSelector(!showModelSelector)}
            className="w-full justify-between h-auto p-3"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Settings className="h-4 w-4 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{VIDEO_MODELS.find(m => m.id === selectedModel)?.icon}</span>
                  <span className="font-medium">{VIDEO_MODELS.find(m => m.id === selectedModel)?.name}</span>
                </div>
                <div className="text-xs text-muted-foreground text-left">
                  {supportsMode() ? (
                    <>
                      {VIDEO_MODES.find(m => m.value === selectedMode)?.icon} {VIDEO_MODES.find(m => m.value === selectedMode)?.label} · 
                      {VIDEO_ASPECT_RATIOS.find(r => r.value === selectedAspectRatio)?.label} · 
                      {selectedDuration}秒
                    </>
                  ) : (
                    <>
                       默认模式 · {VIDEO_ASPECT_RATIOS.find(r => r.value === selectedAspectRatio)?.label} · {selectedDuration}秒
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className={cn(
              "transform transition-transform duration-200 flex-shrink-0",
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
                {VIDEO_MODELS.map((model) => (
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
              </div>

              {/* 模式选择 */}
              {supportsMode() ? (
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground px-1">
                    视频模式 {!selectedImage && selectedImages.length === 0 && selectedModel === 'kling-v1-6' && 
                      <span className="text-amber-600">（文生视频仅支持标准模式）</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {VIDEO_MODES.map((mode) => {
                      const isSupported = isModeSupported(mode.value);
                      return (
                        <Button
                          key={mode.value}
                          variant={selectedMode === mode.value ? "secondary" : "outline"}
                          className={cn(
                            "h-auto p-3 text-left",
                            selectedMode === mode.value && "ring-2 ring-primary/20",
                            !isSupported && "opacity-50 cursor-not-allowed bg-muted/50"
                          )}
                          disabled={!isSupported}
                          onClick={() => {
                            if (isSupported) {
                              setSelectedMode(mode.value);
                              setShowModelSelector(false);
                            }
                          }}
                        >
                          <div className="flex items-center gap-2 w-full">
                            <span className={cn("text-lg", !isSupported && "grayscale")}>
                              {mode.icon}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className={cn(
                                "font-medium text-sm",
                                !isSupported && "text-muted-foreground"
                              )}>
                                {mode.label}
                                {!isSupported && <span className="ml-1 text-xs">（不支持）</span>}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {mode.description}
                              </div>
                            </div>
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {/* 画面比例选择 */}
              <div className="grid grid-cols-3 gap-2">
                {VIDEO_ASPECT_RATIOS.map((ratio) => (
                  <Button
                    key={ratio.value}
                    variant={selectedAspectRatio === ratio.value ? "secondary" : "outline"}
                    className={cn(
                      "h-auto p-2 text-center",
                      selectedAspectRatio === ratio.value && "ring-2 ring-primary/20"
                    )}
                    onClick={() => {
                      setSelectedAspectRatio(ratio.value);
                      setShowModelSelector(false);
                    }}
                  >
                    <div className="text-center w-full">
                      <div className="text-lg">{ratio.icon}</div>
                      <div className="text-xs text-muted-foreground">{ratio.label}</div>
                    </div>
                  </Button>
                ))}
              </div>

              {/* 时长选择 */}
              <div className="grid grid-cols-3 gap-2">
                {VIDEO_DURATIONS.map((duration) => (
                  <Button
                    key={duration.value}
                    variant={selectedDuration === duration.value ? "secondary" : "outline"}
                    className={cn(
                      "h-auto p-2 text-center",
                      selectedDuration === duration.value && "ring-2 ring-primary/20"
                    )}
                    onClick={() => {
                      setSelectedDuration(duration.value);
                      setShowModelSelector(false);
                    }}
                  >
                    <div className="text-center w-full">
                      <div className="text-lg">{duration.icon}</div>
                      <div className="text-xs text-muted-foreground">{duration.label}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* 选中的单图预览 */}
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
                <div className="text-xs text-muted-foreground">
                  📁 用于图生视频
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 多图参考预览 - 仅kling-v1-6模型支持 */}
        {selectedImages.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">多图参考</span>
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                  可灵 v1.6 专用
                </span>
                <span className="text-xs text-muted-foreground">
                  {selectedImages.length}/4
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearMultipleImages}
                className="h-6 text-xs"
              >
                清空
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-2 p-2 bg-muted/30 rounded-lg">
              {selectedImages.map((image, index) => (
                <div key={index} className="relative group">
                  <img
                    src={URL.createObjectURL(image)}
                    alt={`参考图片 ${index + 1}`}
                    className="w-16 h-16 object-cover rounded-lg border-2 border-border"
                  />
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeImageFromMultiple(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 rounded-b-lg truncate">
                    {image.name}
                  </div>
                </div>
              ))}
              
              {/* 添加更多图片按钮 */}
              {selectedImages.length < 4 && (
                <button
                  onClick={() => multiFileInputRef.current?.click()}
                  className="w-16 h-16 border-2 border-dashed border-border rounded-lg flex items-center justify-center hover:border-primary transition-colors"
                >
                  <Plus className="h-6 w-6 text-muted-foreground" />
                </button>
              )}
            </div>
            
            <div className="text-xs text-muted-foreground">
              💡 多图参考功能仅支持可灵 v1.6 模型，最多4张图片
            </div>
          </div>
        )}

        {/* 输入区域 - 完全复制ImageGenerator的样式 */}
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
                : selectedImages.length > 0
                  ? `描述您想要生成的视频内容，将基于${selectedImages.length}张参考图片...`
                  : selectedImage
                    ? "描述您想要生成的视频内容，将基于上传的图片..."
                    : "描述您想要生成的视频内容和场景，或拖拽图片进行图生视频... (Enter生成，Shift+Enter换行)"
            }
            className={cn(
              "w-full min-h-16 max-h-32 p-3 pr-20 text-sm bg-background border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200",
              isDragOver && "border-primary/50 bg-primary/5"
            )}
            disabled={isGenerating}
          />
          
          {/* 右下角按钮组 - 完全复制ImageGenerator */}
          <div className="absolute right-2 bottom-2 flex gap-1">
            {/* AI提示词优化按钮 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShowPromptOptimizer}
              disabled={isGenerating || !prompt.trim()}
              className="h-8 w-8 hover:bg-muted"
              title="AI提示词优化 - 自动按照专业格式优化提示词"
            >
              <Wand2 className="h-4 w-4" />
            </Button>
            

            
            {/* 图片上传按钮 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isGenerating}
              className="h-8 w-8 hover:bg-muted"
              title="上传图片进行图生视频"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
            
            {/* 发送按钮 */}
            <Button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-muted"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>


      </div>

      {/* AI提示词优化器 */}
      {showPromptOptimizer && (
        <PromptOptimizer
          originalPrompt={prompt}
          type="video"
          onApplyOptimized={handleApplyOptimizedPrompt}
          onClose={handleClosePromptOptimizer}
          autoRun={true}
        />
      )}



      {/* 运镜助手对话框 - 暂时注释掉 */}
      {/* {showVideoAssistant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg border border-border max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-semibold text-foreground">
                🎬 AI视频运镜助手
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                AI将分析您的视频描述，推荐合适的运镜方式并优化prompt
              </p>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <VideoAssistant
                userPrompt={assistantPrompt}
                onApplyPreset={handleApplyPreset}
                onClose={handleCloseAssistant}
              />
            </div>
          </div>
        </div>
      )} */}
    </div>
  );
} 