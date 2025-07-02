"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Send, Bot, User, Settings, Zap, ImageIcon, X, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useHistoryStore } from "@/lib/history-store";
import { useConversationStore } from "@/lib/conversation-store";
import { ChatMessage, TextContent, ImageContent } from "@/lib/types";
import { useStorage } from "@/lib/store";
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
  const storageService = useStorage();
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
    messages, 
    setMessages, 
    addMessage, 
    clearConversation
  } = useConversationStore();

  // 🔧 会话对话ID管理 - 用于分组存储
  const getCurrentSessionConversationId = (): string | null => {
    return sessionStorage.getItem('currentChatConversationId');
  };
  
  const setCurrentSessionConversationId = (id: string | null) => {
    if (id) {
      sessionStorage.setItem('currentChatConversationId', id);
    } else {
      sessionStorage.removeItem('currentChatConversationId');
    }
  };

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

  // 🔧 消息更新时滚动到底部 - 优化历史对话加载体验
  useEffect(() => {
    if (messages.length > 0) {
      // 🔧 延迟滚动，让消息先完全渲染，避免加载历史对话时的闪烁
      const timeoutId = setTimeout(() => {
      scrollToBottom();
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [messages]);

  // 输入状态变化时滚动到底部
  useEffect(() => {
    if (isTyping) {
      scrollToBottom();
    }
  }, [isTyping]);
  
  // 🔧 页面加载时恢复对话状态（支持热重载）
  useEffect(() => {
    const restoreConversationState = async () => {
      try {
        // 🔧 检查sessionStorage中是否有当前对话ID
        const sessionConversationId = getCurrentSessionConversationId();
        
        if (sessionConversationId) {
          // 🔧 恢复具体对话
          const conversation = await storageService.getRecord(sessionConversationId);
          if (conversation) {
            const messages = conversation.content?.messages || conversation.messages || [];
            if (messages.length > 0) {
              setMessages(messages);
              setSelectedModel(conversation.modelName);
              console.log('✅ 会话对话状态已恢复:', conversation.title, `包含${messages.length}条消息`);
              return;
            }
          }
        }
        
        // 🔧 fallback: 尝试从存储服务获取活跃对话
        const conversation = await storageService.getActiveConversation();
        if (conversation) {
          setMessages(conversation.messages);
          setSelectedModel(conversation.modelName);
          console.log('✅ 活跃对话状态已恢复:', conversation.title);
        } else {
          // 🔧 没有任何对话时，显示初始问候语
          setMessages([
            {
              id: "1",
              role: "assistant",
              content: "你好！我是AI助手，很高兴为您服务。有什么我可以帮助您的吗？",
              timestamp: Date.now(),
            },
          ]);
        }
      } catch (error) {
        console.error('⚠️ 恢复对话状态失败:', error);
      }
    };
    
    restoreConversationState();
  }, [setMessages]);

  // 监听历史记录点击跳转事件
  useEffect(() => {
    const handleLoadHistoryConversation = async (event: CustomEvent) => {
      const { conversationId } = event.detail;
      if (conversationId) {
        try {
          // 🔧 直接从存储服务加载对话数据
          const conversation = await storageService.getRecord(conversationId);
          if (conversation) {
            // 🔧 设置当前会话对话ID
            setCurrentSessionConversationId(conversationId);
            
            // 🔧 加载消息到UI - 避免fallback，直接使用历史消息
            const messages = conversation.content?.messages || conversation.messages || [];
            if (messages.length > 0) {
              setMessages(messages);
            } else {
              // 只有在真的没有消息时才显示默认消息
              setMessages([
                {
                  id: "1",
                  role: "assistant",
                  content: "你好！我是AI助手，很高兴为您服务。有什么我可以帮助您的吗？",
                  timestamp: Date.now(),
                },
              ]);
            }
            
            // 🔧 设置模型
            setSelectedModel(conversation.modelName);
            
            // 🔧 清空选中的图片
            setSelectedImages([]);
            
            console.log('✅ 历史对话已加载:', conversation.title, `包含${messages.length}条消息`);
          }
        } catch (error) {
          console.error('❌ 加载历史对话失败:', error);
        }
      }
    };

    window.addEventListener('loadHistoryConversation', handleLoadHistoryConversation as any);
    
    return () => {
      window.removeEventListener('loadHistoryConversation', handleLoadHistoryConversation as any);
    };
  }, [setMessages]);

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
      // 🔧 清空当前会话对话ID，开始新的对话分组
      setCurrentSessionConversationId(null);
      
      // 🔧 显示新对话的问候语
      setMessages([
        {
          id: "1",
          role: "assistant",
          content: "你好！我是AI助手，很高兴为您服务。有什么我可以帮助您的吗？",
          timestamp: Date.now(),
        },
      ]);
      
      loadRecords(); // 刷新历史记录列表
      console.log('✅ 已开始新对话会话');
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

      // 立即隐藏"思考中"气泡
      setIsTyping(false);

      // 🔧 重新构建的分组存储逻辑
      try {
        const hasUserContent = originalInput || originalImages.length > 0;
        
        if (hasUserContent) {
          // 🔧 获取当前会话的对话ID
          let conversationId = getCurrentSessionConversationId();
          
          if (!conversationId) {
            // 🔧 创建新对话记录
            const title = originalInput.length > 30 ? originalInput.substring(0, 30) + '...' : 
                          (originalInput || (originalImages.length > 0 ? '图片分析' : '新对话'));
            
            const newConversation = await storageService.createConversation(title, selectedModel);
            conversationId = newConversation.id;
            
            // 🔧 保存到会话存储，后续消息都会添加到这个对话中
            setCurrentSessionConversationId(conversationId);
            
            console.log('✅ 创建新对话记录:', { id: conversationId, title });
          }
          
          // 🔧 添加消息到对话记录
          await storageService.addMessageToConversation(conversationId, newUserMessage);
          await storageService.addMessageToConversation(conversationId, aiResponse);
          
          console.log('✅ 消息已添加到对话记录:', conversationId);
        } else {
          console.log('⚠️ 空对话未保存');
        }
      } catch (saveError) {
        console.error('❌ 保存历史记录失败:', saveError);
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
      // 错误时也要隐藏"思考中"气泡
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
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight, rehypeRaw]}
            components={{
              code: ({ inline, className, children, ...props }: any) => {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                <div className="relative w-full overflow-hidden rounded-md bg-background my-2">
                  <div className="flex items-center justify-between px-4 py-2 bg-muted/50">
                    <span className="text-xs font-mono text-muted-foreground">{match[1]}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 hover:bg-muted/80"
                      onClick={() => {
                        navigator.clipboard.writeText(children as string);
                        toast.success('代码已复制');
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="overflow-x-auto">
                    <pre className="p-4 m-0">
                      <code className={cn("text-sm whitespace-pre-wrap break-words", match[1])}>
                      {children}
                    </code>
                  </pre>
                  </div>
                </div>
              ) : (
                <code className={cn("bg-muted/50 px-1.5 py-0.5 rounded-md text-sm font-mono", className)} {...props}>
                  {children}
                </code>
              );
            }
            }}
          >
            {content}
          </ReactMarkdown>
      );
    }

    return (
      <div className="space-y-2 w-full">
        {content.map((item, index) => {
          if (item.type === 'text') {
            return (
              <div key={index} className="w-full break-words">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight, rehypeRaw]}
                  components={{
                    code: ({ inline, className, children, ...props }: any) => {
                      const match = /language-(\w+)/.exec(className || '');
                      return !inline && match ? (
                        <div className="relative w-full overflow-hidden rounded-md bg-background my-2">
                          <div className="flex items-center justify-between px-4 py-2 bg-muted/50">
                            <span className="text-xs font-mono text-muted-foreground">{match[1]}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 hover:bg-muted/80"
                              onClick={() => {
                                navigator.clipboard.writeText(children as string);
                                toast.success('代码已复制');
                              }}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="overflow-x-auto">
                            <pre className="p-4 m-0">
                              <code className={cn("text-sm whitespace-pre-wrap break-words", match[1])}>
                            {children}
                          </code>
                        </pre>
                          </div>
                        </div>
                      ) : (
                        <code className={cn("bg-muted/50 px-1.5 py-0.5 rounded-md text-sm font-mono", className)} {...props}>
                          {children}
                        </code>
                      );
                    }
                  }}
                >
                  {item.text}
                </ReactMarkdown>
              </div>
            );
          } else if (item.type === 'image') {
            return (
                <img
                key={index}
                  src={item.imageUrl}
                alt={item.fileName || `图片 ${index + 1}`}
                className="max-w-full h-auto rounded-lg"
              />
            );
          }
          return null;
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
                  "flex gap-3 w-full",
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
                    "max-w-[calc(100%-4rem)] rounded-lg px-4 py-2 message-bubble overflow-hidden",
                    message.role === "user"
                      ? "bg-muted/50 text-foreground"
                      : "bg-muted/50 text-foreground"
                  )}
                >
                  <div className="prose prose-sm dark:prose-invert w-full max-w-none break-words">
                  {renderMessageContent(message.content)}
                  </div>
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
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3"
              >
                <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="bg-muted rounded-lg px-4 py-2">
                  <span className="typing-dots">思考中</span>
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
                  alt={`图片 ${index + 1}`}
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
            placeholder={
              isDragOver 
                ? "松开鼠标添加图片..." 
                : "输入消息... (支持拖拽图片上传，Enter发送，Shift+Enter换行)"
            }
            className={cn(
              "w-full min-h-16 max-h-32 p-3 text-sm bg-background border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200 pr-20",
              isDragOver && "border-primary/50 bg-primary/5"
            )}
            disabled={isTyping}
          />
          
          {/* 右下角按钮组 */}
          <div className="absolute bottom-2 right-2 flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 hover:bg-muted/80"
              onClick={() => fileInputRef.current?.click()}
              disabled={isTyping}
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
            
            <Button
              size="icon"
              variant="ghost"
              onClick={handleSendMessage}
              disabled={(!inputValue.trim() && selectedImages.length === 0) || isTyping}
              className="h-8 w-8 hover:bg-muted/80"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 