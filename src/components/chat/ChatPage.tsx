"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Send, Bot, User, Settings, Zap, ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useHistoryStore } from "@/lib/history-store";
import { useConversationStore } from "@/lib/conversation-store";
import { ChatMessage, TextContent, ImageContent } from "@/lib/types";
import { localStorageService } from "@/lib/local-storage";
import { convertFileToBase64, isValidImageFile, compressImage } from "@/lib/utils";
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import 'highlight.js/styles/github-dark.css';

interface AIModel {
  id: string;
  name: string;
  description: string;
  icon: string;
}

const AI_MODELS: AIModel[] = [
  {
    id: "gpt-4o",
    name: "GPT-4o",
    description: "最强大的多模态模型",
    icon: "🧠",
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    description: "快速响应，经济实惠",
    icon: "⚡",
  },
  {
    id: "claude-3.5",
    name: "Claude 3.5 Sonnet",
    description: "优秀的代码和分析能力",
    icon: "🔮",
  },
  {
    id: "gemini-pro",
    name: "Gemini Pro",
    description: "Google的多模态AI",
    icon: "💎",
  },
];

export function ChatPage() {
  const [inputValue, setInputValue] = useState("");
  const [selectedModel, setSelectedModel] = useState("gpt-4o");
  const [isTyping, setIsTyping] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 滚动控制
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // Store hooks
  const { loadRecords } = useHistoryStore();
  const { 
    currentConversation, 
    messages, 
    setMessages, 
    addMessage, 
    clearConversation,
    loadConversation
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

  // 消息更新时滚动到底部
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  // 输入状态变化时滚动到底部
  useEffect(() => {
    if (isTyping) {
      scrollToBottom();
    }
  }, [isTyping]);
  
  // 加载当前对话
  useEffect(() => {
    const loadCurrentConversation = async () => {
      try {
        const conversation = await localStorageService.getActiveConversation();
        if (conversation) {
          setMessages(conversation.messages);
          setSelectedModel(conversation.modelName);
        }
      } catch (error) {
        console.error('加载当前对话失败:', error);
      }
    };
    
    loadCurrentConversation();
  }, [setMessages]);

  // 监听历史记录点击跳转事件
  useEffect(() => {
    const handleLoadHistoryConversation = async (event: CustomEvent) => {
      const { conversationId } = event.detail;
      if (conversationId) {
        await loadConversation(conversationId);
        setSelectedImages([]);
        
        // 从本地存储获取对话信息来设置模型
        try {
          const conversation = await localStorageService.getRecord(conversationId);
          if (conversation) {
            setSelectedModel(conversation.modelName);
          }
        } catch (error) {
          console.error('获取对话模型失败:', error);
        }
      }
    };

    window.addEventListener('loadHistoryConversation', handleLoadHistoryConversation as any);
    
    return () => {
      window.removeEventListener('loadHistoryConversation', handleLoadHistoryConversation as any);
    };
  }, [loadConversation]);

  // 监听新建对话事件
  useEffect(() => {
    const handleNewChatSession = () => {
      handleNewConversation();
    };
    
    window.addEventListener('newChatSession', handleNewChatSession);
    
    return () => {
      window.removeEventListener('newChatSession', handleNewChatSession);
    };
  }, []);

  // 新建对话
  const handleNewConversation = async () => {
    try {
      clearConversation();
      setSelectedImages([]);
      loadRecords(); // 刷新历史记录列表
      console.log('已开始新对话，将在有内容时保存到历史记录');
    } catch (error) {
      console.error('新建对话失败:', error);
    }
  };

  const handleSendMessage = async () => {
    if ((!inputValue.trim() && selectedImages.length === 0) || isTyping) return;

    setIsTyping(true);

    try {
      // 构建消息内容
      const messageContent: (TextContent | ImageContent)[] = [];
      
      // 添加文本内容
      if (inputValue.trim()) {
        messageContent.push({
          type: 'text',
          text: inputValue.trim(),
        });
      }

      // 添加图片内容
      for (const image of selectedImages) {
        try {
          const compressedImage = await compressImage(image);
          const base64Image = await convertFileToBase64(compressedImage);
          
          messageContent.push({
            type: 'image',
            imageUrl: base64Image,
            fileName: image.name,
            size: image.size,
          });
        } catch (error) {
          console.error('图片处理失败:', error);
          continue;
        }
      }

      // 创建用户消息
      const newUserMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content: messageContent,
        timestamp: Date.now(),
      };

      addMessage(newUserMessage);

      // 构建API请求消息格式
      const apiMessages: ChatCompletionMessageParam[] = messages.map(msg => {
        if (typeof msg.content === 'string') {
          return {
            role: msg.role,
            content: msg.content,
          } as ChatCompletionMessageParam;
        } else {
          // 处理混合内容消息
          const content = msg.content.map(item => {
            if (item.type === 'text') {
              return {
                type: 'text' as const,
                text: item.text,
              };
            } else {
              return {
                type: 'image_url' as const,
                image_url: {
                  url: item.imageUrl,
                },
              };
            }
          });
          
          return {
            role: msg.role,
            content: content,
          } as ChatCompletionMessageParam;
        }
      });

      // 添加当前用户消息到API请求
      const currentMessageContent = messageContent.map(item => {
        if (item.type === 'text') {
          return {
            type: 'text' as const,
            text: item.text,
          };
        } else {
          return {
            type: 'image_url' as const,
            image_url: {
              url: item.imageUrl,
            },
          };
        }
      });

      apiMessages.push({
        role: 'user',
        content: currentMessageContent,
      } as ChatCompletionMessageParam);

      // 保存原始输入用于后续判断
      const originalInput = inputValue.trim();
      const originalImages = [...selectedImages];

      // 清空输入
      setInputValue("");
      setSelectedImages([]);

      // 调用后端API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: apiMessages,
          model: selectedModel,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '请求失败');
      }

      // 添加AI回复
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message.content,
        timestamp: Date.now(),
      };

      addMessage(aiResponse);

      // 保存消息到当前对话 - 只有包含实际内容的对话才保存
      try {
        // 检查是否有实际的用户输入内容（排除初始问候语）
        // 使用保存的原始输入进行判断
        const hasUserContent = originalInput || originalImages.length > 0;
        
        if (hasUserContent) {
          let activeConversation = currentConversation || await localStorageService.getActiveConversation();
          
          if (!activeConversation) {
            // 创建新对话
            const title = originalInput.length > 30 ? originalInput.substring(0, 30) + '...' : 
                          (originalInput || (originalImages.length > 0 ? '图片分析' : '新对话'));
            activeConversation = await localStorageService.createConversation(title, selectedModel);
          }
          
          // 添加用户消息
          await localStorageService.addMessageToConversation(activeConversation.id, newUserMessage);
          
          // 添加AI回复
          await localStorageService.addMessageToConversation(activeConversation.id, aiResponse);
          
          console.log('对话已保存到历史记录');
        } else {
          console.log('空对话未保存到历史记录');
        }
      } catch (saveError) {
        console.error('保存历史记录失败:', saveError);
      }
    } catch (error: unknown) {
      console.error('Chat error:', error);
      
      // 显示错误消息
      const errorObj = error as { message?: string };
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `❌ 抱歉，发生了错误：${errorObj.message || '网络连接失败，请稍后重试'}`,
        timestamp: Date.now(),
      };

      addMessage(errorMessage);
    } finally {
      setIsTyping(false);
    }
  };

  // 处理图片选择
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

  // 渲染消息内容
  const renderMessageContent = (content: string | (TextContent | ImageContent)[]) => {
    if (typeof content === 'string') {
      return (
        <div className="text-sm prose max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight, rehypeRaw]}
            components={{
              // 自定义代码块样式
              code: ({ inline, className, children, ...props }: any) => {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <pre className="bg-muted rounded-lg p-4 overflow-x-auto">
                    <code className={className} {...props}>
                      {children}
                    </code>
                  </pre>
                ) : (
                  <code className="bg-muted px-1.5 py-0.5 rounded text-xs" {...props}>
                    {children}
                  </code>
                );
              },
              // 自定义表格样式
              table: ({ children }) => (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse border border-border">
                    {children}
                  </table>
                </div>
              ),
              th: ({ children }) => (
                <th className="border border-border bg-muted p-2 text-left font-medium">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="border border-border p-2">
                  {children}
                </td>
              ),
              // 自定义链接样式
              a: ({ children, href }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 underline"
                >
                  {children}
                </a>
              ),
              // 自定义引用样式
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground">
                  {children}
                </blockquote>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {content.map((item, index) => {
          if (item.type === 'text') {
            return (
              <div key={index} className="text-sm prose max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight, rehypeRaw]}
                  components={{
                    // 自定义代码块样式
                    code: ({ inline, className, children, ...props }: any) => {
                      const match = /language-(\w+)/.exec(className || '');
                      return !inline && match ? (
                        <pre className="bg-muted rounded-lg p-4 overflow-x-auto">
                          <code className={className} {...props}>
                            {children}
                          </code>
                        </pre>
                      ) : (
                        <code className="bg-muted px-1.5 py-0.5 rounded text-xs" {...props}>
                          {children}
                        </code>
                      );
                    },
                    // 自定义表格样式
                    table: ({ children }) => (
                      <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse border border-border">
                          {children}
                        </table>
                      </div>
                    ),
                    th: ({ children }) => (
                      <th className="border border-border bg-muted p-2 text-left font-medium">
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className="border border-border p-2">
                        {children}
                      </td>
                    ),
                    // 自定义链接样式
                    a: ({ children, href }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80 underline"
                      >
                        {children}
                      </a>
                    ),
                    // 自定义引用样式
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground">
                        {children}
                      </blockquote>
                    ),
                  }}
                >
                  {item.text}
                </ReactMarkdown>
              </div>
            );
          } else {
            return (
              <div key={index} className="space-y-1">
                <img
                  src={item.imageUrl}
                  alt={item.fileName || '上传的图片'}
                  className="max-w-full max-h-48 rounded-lg object-cover cursor-grab active:cursor-grabbing hover:opacity-80 transition-opacity"
                  draggable={true}
                  onClick={async (e) => {
                    // 只有在没有拖拽的情况下才触发预览
                    if (!e.defaultPrevented) {
                      try {
                        // 将图片转换为Blob格式，以便与历史记录预览保持一致
                        const response = await fetch(item.imageUrl);
                        const blob = await response.blob();
                        
                        // 创建临时的文件对象
                        const mockFile = {
                          id: `chat_${Date.now()}`,
                          fileName: item.fileName || 'chat-image.png',
                          blob: blob,
                          record: {
                            id: `chat_record_${Date.now()}`,
                            title: item.fileName || '对话中的图片',
                            type: 'media' as const,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            messages: [],
                            modelName: 'Chat Image',
                            status: 'completed' as const,
                            metadata: {
                              source: 'chat'
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
                        window.open(item.imageUrl, '_blank');
                      }
                    }
                  }}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', item.imageUrl);
                    e.dataTransfer.setData('application/json', JSON.stringify({
                      type: 'chat-image',
                      imageUrl: item.imageUrl,
                      fileName: item.fileName
                    }));
                  }}
                  title="点击预览，拖拽到输入框使用此图片"
                />
                {item.fileName && (
                  <p className="text-xs text-muted-foreground">{item.fileName}</p>
                )}
              </div>
            );
          }
        })}
      </div>
    );
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
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

  return (
    <div className="h-full flex flex-col bg-background">
      {/* 聊天消息区域 */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea ref={scrollAreaRef} className="h-full">
          <div className="p-4 space-y-4">
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  "flex gap-3",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "assistant" && (
                  <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
                
                <div
                  className={cn(
                    "max-w-3xl rounded-lg px-4 py-2",
                    message.role === "user"
                      ? "bg-secondary text-foreground border border-border"
                      : "bg-muted text-foreground"
                  )}
                >
                  {renderMessageContent(message.content)}
                  <div className="text-xs opacity-70 mt-1">
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>

                {message.role === "user" && (
                  <div className="flex-shrink-0 w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-secondary-foreground" />
                  </div>
                )}
              </motion.div>
            ))}

            {/* 正在输入指示器 */}
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 justify-start"
              >
                <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary-foreground" />
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

      {/* 模型选择和输入区域 */}
      <div className="p-4 space-y-4 bg-card/50">
        {/* 模型选择 */}
        <div className="space-y-2">
          <Button
            variant="outline"
            onClick={() => setShowModelSelector(!showModelSelector)}
            className="w-full justify-between h-auto p-3"
          >
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="text-sm font-medium">当前模型</span>
              <span className="text-lg">{AI_MODELS.find(m => m.id === selectedModel)?.icon}</span>
              <span className="font-medium">{AI_MODELS.find(m => m.id === selectedModel)?.name}</span>
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
              {AI_MODELS.map((model) => (
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

        {/* 选中的图片预览 */}
        {selectedImages.length > 0 && (
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
            multiple
            className="hidden"
            onChange={handleImageSelect}
          />
          
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isDragOver ? "松开鼠标添加图片..." : "输入您的问题或拖拽图片进行分析... (Enter发送，Shift+Enter换行)"}
            className={cn(
              "w-full min-h-16 max-h-32 p-3 pr-20 text-sm bg-background border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200",
              isDragOver && "border-primary/50 bg-primary/5"
            )}
            disabled={isTyping}
          />
          
          {/* 右下角按钮组 */}
          <div className="absolute right-2 bottom-2 flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isTyping || selectedImages.length >= 4}
              className="h-8 w-8 hover:bg-muted"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
            
            <Button
              onClick={handleSendMessage}
              disabled={(!inputValue.trim() && selectedImages.length === 0) || isTyping}
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