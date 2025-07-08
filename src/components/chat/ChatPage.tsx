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
import { convertFileToBase64, isValidImageFile, compressImage, safeParseResponse, type CompressOptions } from "@/lib/utils";
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import 'highlight.js/styles/github-dark.css';
import { workflowEngine } from '@/lib/workflow-engine';
import { WORKFLOW_TEMPLATES, getWorkflowTemplate } from '@/lib/workflow-templates';
import { WorkflowExecution, WorkflowStep } from '@/lib/workflow-types';

interface AIModel {
  id: string;
  name: string;
  description: string;
  icon: string;
  type?: 'ai' | 'workflow';
  category?: string;
}

const AI_MODELS: AIModel[] = [
  {
    id: "gpt-4o",
    name: "GPT-4o",
    description: "最强大的多模态模型",
    icon: "🧠",
    type: "ai"
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    description: "快速响应，经济实惠",
    icon: "⚡",
    type: "ai"
  },
  {
    id: "claude-3.5",
    name: "Claude 3.5 Sonnet",
    description: "优秀的代码和分析能力",
    icon: "🔮",
    type: "ai"
  },
  {
    id: "gemini-pro",
    name: "Gemini Pro",
    description: "Google的多模态AI",
    icon: "💎",
    type: "ai"
  },
  // 工作流选项
  ...WORKFLOW_TEMPLATES.map(template => ({
    id: template.id,
    name: template.name,
    description: template.description,
    icon: template.icon,
    type: "workflow" as const,
    category: template.category
  }))
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
  
  // 工作流相关状态
  const [currentWorkflow, setCurrentWorkflow] = useState<WorkflowExecution | null>(null);
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep | null>(null);
  const [isWorkflowMode, setIsWorkflowMode] = useState(false);
  
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

  // 🔧 消息队列管理状态
  const [messageQueue, setMessageQueue] = useState<ChatMessage[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);

  // 🔧 消息队列处理函数
  const addToMessageQueue = (message: ChatMessage) => {
    setMessageQueue(prev => [...prev, message]);
  };
  
  const processMessageQueue = async () => {
    if (isProcessingQueue || messageQueue.length === 0) return;
    
    setIsProcessingQueue(true);
    
    try {
      // 按时间戳排序确保顺序
      const sortedQueue = [...messageQueue].sort((a, b) => a.timestamp - b.timestamp);
      
      // 逐个添加消息到界面
      for (const message of sortedQueue) {
        addMessage(message);
        // 短暂延迟确保渲染顺序
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // 清空队列
      setMessageQueue([]);
    } catch (error) {
      console.error('处理消息队列失败:', error);
    } finally {
      setIsProcessingQueue(false);
    }
  };
  
  // 监听队列变化，自动处理
  useEffect(() => {
    if (messageQueue.length > 0 && !isProcessingQueue) {
      processMessageQueue();
    }
  }, [messageQueue, isProcessingQueue]);

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
  
  // 🔧 页面加载时恢复对话状态（支持热重载和工具切换）
  useEffect(() => {
    const restoreConversationState = async () => {
      try {
        // 🔧 检查sessionStorage中是否有当前对话ID
        const sessionConversationId = getCurrentSessionConversationId();
        
        if (sessionConversationId) {
          // 🔧 优先使用session ID直接恢复对话，不要清理
          console.log('🔧 检测到session ID，尝试恢复对话:', sessionConversationId);
          
          try {
            const conversation = await storageService.getRecord(sessionConversationId);
            if (conversation) {
              // 🔧 成功恢复对话状态
              const messages = conversation.content?.messages || conversation.messages || [];
              if (messages.length > 0) {
                setMessages(messages);
                setSelectedModel(conversation.modelName);
                console.log('✅ 会话对话状态已恢复:', conversation.title, `包含${messages.length}条消息`);
                return; // 成功恢复，直接返回
              }
            }
          } catch (sessionError) {
            console.warn('⚠️ 使用session ID恢复对话失败:', sessionError);
          }
          
          // 🔧 session ID对应的对话无效，清理并继续fallback流程
          console.log('🔧 session ID无效，清理并使用fallback');
          setCurrentSessionConversationId(null);
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
        // 🔧 出错时显示默认消息
        setMessages([
          {
            id: "1",
            role: "assistant",
            content: "你好！我是AI助手，很高兴为您服务。有什么我可以帮助您的吗？",
            timestamp: Date.now(),
          },
        ]);
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

  // 监听工作流完成事件
  useEffect(() => {
    const handleWorkflowCompleted = (event: CustomEvent) => {
      const { executionId, result } = event.detail;
      
      if (currentWorkflow && currentWorkflow.id === executionId) {
        // 显示工作流结果
        const resultMessage: ChatMessage = {
          id: `workflow_result_${Date.now()}`,
          role: "assistant",
          content: result.content,
          timestamp: Date.now(),
        };
        
        addMessage(resultMessage);
        
        // 显示完成消息
        const completionMessage: ChatMessage = {
          id: `workflow_completed_${Date.now()}`,
          role: "assistant",
          content: "🎉 工作流执行完成！如需开始新的工作流，请重新选择模型。",
          timestamp: Date.now(),
        };
        
        setTimeout(() => {
          addMessage(completionMessage);
          
          // 🔧 工作流完成 - 统一保存所有消息到历史记录
          const saveCompleteWorkflow = async () => {
            try {
              // 获取工作流模板和第一个用户输入作为标题
              const template = getWorkflowTemplate(currentWorkflow?.templateId || '');
              const workflowTitle = currentWorkflow?.metadata?.title || (template ? `工作流：${template.name}` : '工作流');
              
              // 创建工作流对话记录
              const newConversation = await storageService.createRecord({
                title: workflowTitle,
                modelName: selectedModel,
                type: 'text',
                status: 'active',
                tags: [],
                content: { messages: [] },
                messages: [],
                metadata: { 
                  workflowId: currentWorkflow?.templateId || '',
                  executionId: currentWorkflow?.id || ''
                }
              });
              
              // 保存所有消息（包括欢迎、步骤、用户输入、处理、结果、完成消息）
              for (const message of messages.concat([resultMessage, completionMessage])) {
                await storageService.addMessageToConversation(newConversation.id, message);
              }
              
              console.log('✅ 工作流完整记录已保存:', { 
                id: newConversation.id, 
                title: workflowTitle,
                messageCount: messages.length + 2 
              });
              
              // 触发历史记录刷新
              loadRecords();
            } catch (saveError) {
              console.error('❌ 保存完整工作流失败:', saveError);
            }
          };
          
          saveCompleteWorkflow();
        }, 1000);
        
        // 重置工作流状态
        setCurrentWorkflow(null);
        setWorkflowStep(null);
        setIsWorkflowMode(false);
        
        toast.success('工作流执行完成！');
      }
    };

    window.addEventListener('workflowCompleted', handleWorkflowCompleted as any);
    
    return () => {
      window.removeEventListener('workflowCompleted', handleWorkflowCompleted as any);
    };
  }, [currentWorkflow, addMessage]);

  // 启动工作流
  const handleWorkflowStart = async (workflowId: string) => {
    try {
      // 创建新对话（但不显示问候语）
      await handleNewConversation(true); // 传入参数表示是工作流模式
      
      // 创建工作流执行实例
      const execution = workflowEngine.createExecution(workflowId);
      if (!execution) {
        toast.error('无法启动工作流');
        return;
      }
      
      // 启动工作流
      const startedExecution = workflowEngine.startExecution(execution.id);
      if (!startedExecution) {
        toast.error('工作流启动失败');
        return;
      }
      
      setCurrentWorkflow(startedExecution);
      setIsWorkflowMode(true);
      
      // 获取工作流模板
      const template = getWorkflowTemplate(workflowId);
      if (!template) return;
      
      // 添加工作流欢迎消息
      const welcomeMessage: ChatMessage = {
        id: `workflow_welcome_${Date.now()}`,
        role: "assistant",
        content: `🔄 **${template.name}** 工作流已启动！\n\n${template.description}\n\n📋 **流程概览**：共 ${template.steps.length} 个步骤\n⏱️ **预估时间**：${template.estimatedTime}\n\n让我们开始第一步：`,
        timestamp: Date.now(),
      };
      
      addMessage(welcomeMessage);
      
      // 🔧 工作流不立即保存，等执行完成后统一保存
      // 清空当前会话ID，因为工作流不会立即保存
      setCurrentSessionConversationId(null);
      console.log('✅ 工作流已启动，等待执行完成后统一保存');
      
      // 获取第一步并显示提示
      const firstStep = workflowEngine.getCurrentStep(execution.id);
      if (firstStep) {
        setWorkflowStep(firstStep);
        await showWorkflowStepPrompt(firstStep, 1, template.steps.length);
      }
      
    } catch (error) {
      console.error('启动工作流失败:', error);
      toast.error('启动工作流失败');
    }
  };

  // 显示工作流步骤提示
  const showWorkflowStepPrompt = async (step: WorkflowStep, current: number, total: number) => {
    const stepMessage: ChatMessage = {
      id: `workflow_step_${step.id}_${Date.now()}`,
      role: "assistant",
      content: `**步骤 ${current}/${total}：${step.name}**\n\n${step.prompt}${step.required ? ' (必填)' : ' (可选)'}`,
      timestamp: Date.now(),
    };
    
    addMessage(stepMessage);
    // 🔧 工作流中间步骤不保存，等执行完成后统一保存
  };

  // 处理工作流输入
  const handleWorkflowInput = async (input: string) => {
    if (!currentWorkflow || !workflowStep) return;

    try {
      // 提交步骤输入
      const updatedExecution = workflowEngine.submitStepInput(currentWorkflow.id, input);
      if (!updatedExecution) {
        toast.error('提交失败');
        return;
      }

      setCurrentWorkflow(updatedExecution);

      // 🔧 工作流中间步骤不保存，只记录第一个输入作为标题用
      console.log('🔍 工作流步骤信息:', {
        currentStep: updatedExecution.currentStep,
        totalSteps: updatedExecution.totalSteps,
        input: input,
        status: updatedExecution.status
      });
      
      // 记录第一个用户输入作为将来的标题
      if (updatedExecution.currentStep === 1) {
        const potentialTitle = input.length > 30 ? input.substring(0, 30) + '...' : input;
        // 存储到工作流执行的metadata中，工作流完成时使用
        if (currentWorkflow) {
          currentWorkflow.metadata = { 
            ...currentWorkflow.metadata, 
            title: potentialTitle 
          };
        }
        console.log('📝 记录工作流标题:', potentialTitle);
      }

      // 检查是否还有下一步
      if (updatedExecution.status === 'waiting_input') {
        const nextStep = workflowEngine.getCurrentStep(updatedExecution.id);
        if (nextStep) {
          setWorkflowStep(nextStep);
          setTimeout(async () => {
            await showWorkflowStepPrompt(nextStep, updatedExecution.currentStep + 1, updatedExecution.totalSteps);
          }, 500);
        }
      } else if (updatedExecution.status === 'processing') {
        setWorkflowStep(null);
        const processingMessage: ChatMessage = {
          id: `workflow_processing_${Date.now()}`,
          role: "assistant",
          content: "🔄 正在处理您的请求，请稍候...\n\n所有信息已收集完成，AI正在为您生成结果。",
          timestamp: Date.now(),
        };
        addMessage(processingMessage);
        // 🔧 处理消息也不立即保存，等工作流完成后统一保存
      }

    } catch (error) {
      console.error('工作流输入处理失败:', error);
      toast.error(error instanceof Error ? error.message : '输入处理失败');
    }
  };

  // 新建对话
  const handleNewConversation = async (isWorkflow = false) => {
    try {
      clearConversation();
      setSelectedImages([]);
      // 🔧 清空当前会话对话ID，开始新的对话分组
      setCurrentSessionConversationId(null);
      
      // 🔧 只有非工作流模式才显示问候语
      if (!isWorkflow) {
        setMessages([
          {
            id: "1",
            role: "assistant",
            content: "你好！我是AI助手，很高兴为您服务。有什么我可以帮助您的吗？",
            timestamp: Date.now(),
          },
        ]);
      } else {
        // 工作流模式清空消息，不显示默认问候语
        setMessages([]);
      }
      
      loadRecords(); // 刷新历史记录列表
      console.log('✅ 已开始新对话会话', isWorkflow ? '(工作流模式)' : '');
    } catch (error) {
      console.error('新建对话失败:', error);
    }
  };

  const handleSendMessage = async () => {
    if ((!inputValue.trim() && selectedImages.length === 0) || isTyping) return;

    // 如果是工作流模式，处理工作流输入
    if (isWorkflowMode && currentWorkflow) {
      const userInput = inputValue.trim();
      
      // 添加用户消息
      const userMessage: ChatMessage = {
        id: `user_${Date.now()}`,
        role: "user",
        content: userInput,
        timestamp: Date.now(),
      };
      addMessage(userMessage);
      
      // 清空输入
      setInputValue("");
      setSelectedImages([]);
      
      // 处理工作流输入
      await handleWorkflowInput(userInput);
      return;
    }

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

      // 🎨 添加图片内容 - 图片已预压缩
      for (const image of selectedImages) {
        try {
          const base64Image = await convertFileToBase64(image);
          
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

      // 🔧 创建用户消息 - 使用更精确的ID生成
      const userTimestamp = Date.now();
      const newUserMessage: ChatMessage = {
        id: `user_${userTimestamp}_${Math.random().toString(36).substr(2, 9)}`,
        role: "user",
        content: messageContent,
        timestamp: userTimestamp,
      };

      // 🔧 使用消息队列确保顺序
      addToMessageQueue(newUserMessage);

      // 构建API请求消息格式 - 简化逻辑
      const apiMessages: ChatCompletionMessageParam[] = [];
      
      // 添加历史消息
      for (const msg of messages) {
        if (typeof msg.content === 'string') {
          // 纯文本消息
          apiMessages.push({
            role: msg.role as 'user' | 'assistant' | 'system',
            content: msg.content,
          });
        } else {
          // 混合内容消息 - 只发送文本部分给API
          const textParts = msg.content.filter(item => item.type === 'text');
          if (textParts.length > 0) {
            const combinedText = textParts.map(item => item.text).join('\n');
            apiMessages.push({
              role: msg.role as 'user' | 'assistant' | 'system',
              content: combinedText,
            });
          }
        }
      }

      // 添加当前用户消息
      if (messageContent.length > 0) {
        // 如果只有文本，发送纯文本
        if (messageContent.length === 1 && messageContent[0].type === 'text') {
          apiMessages.push({
            role: 'user',
            content: messageContent[0].text,
          });
        } else {
          // 有图片的情况，暂时只发送文本部分
          const textParts = messageContent.filter(item => item.type === 'text');
          if (textParts.length > 0) {
            apiMessages.push({
              role: 'user',
              content: textParts.map(item => item.text).join('\n'),
            });
          } else {
            // 只有图片的情况
            apiMessages.push({
              role: 'user',
              content: '请分析这张图片',
            });
          }
        }
      }

      // 保存原始输入用于后续判断
      const originalInput = inputValue.trim();
      const originalImages = [...selectedImages];

      // 清空输入
      setInputValue("");
      setSelectedImages([]);

      // 记录API调用信息用于调试
      console.log('💬 发送Chat API请求:', {
        model: selectedModel,
        messagesCount: apiMessages.length,
        messages: apiMessages
      });

      // 🔒 调用后端API - 安全解析版本
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

      const data = await safeParseResponse(response);

      console.log('💬 Chat API响应:', { 
        status: response.status, 
        ok: response.ok, 
        data: data 
      });

      if (!response.ok) {
        console.error('❌ Chat API错误:', data);
        throw new Error(data.error || `请求失败 (${response.status})`);
      }

      // 🔧 添加AI回复 - 确保时间戳晚于用户消息
      if (!data.message || !data.message.content) {
        throw new Error('AI回复内容为空');
      }

      const aiTimestamp = userTimestamp + 100; // 确保AI回复时间戳晚于用户消息
      const aiResponse: ChatMessage = {
        id: `assistant_${aiTimestamp}_${Math.random().toString(36).substr(2, 9)}`,
        role: "assistant",
        content: data.message.content,
        timestamp: aiTimestamp,
      };

      // 🔧 使用消息队列确保顺序
      addToMessageQueue(aiResponse);

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
            
            const newConversation = await storageService.createRecord({
              title,
              modelName: selectedModel,
              type: 'text',
              status: 'active',
              tags: [],
              content: { messages: [] },
              messages: [],
              metadata: {}
            });
            conversationId = newConversation.id;
            
            // 🔧 保存到会话存储，后续消息都会添加到这个对话中
            setCurrentSessionConversationId(conversationId);
            
            console.log('✅ 创建新对话记录:', { id: conversationId, title });
          }
          
          // 🔧 添加消息到对话记录
          await storageService.addMessageToConversation(conversationId, newUserMessage);
          await storageService.addMessageToConversation(conversationId, aiResponse);
          
          console.log('✅ 消息已添加到对话记录:', conversationId);
          
          // 🔧 Chat完成后触发热重载
          loadRecords();
        } else {
          console.log('⚠️ 空对话未保存');
        }
      } catch (saveError) {
        console.error('❌ 保存历史记录失败:', saveError);
      }
    } catch (error: unknown) {
      console.error('Chat error:', error);
      
      // 🔧 显示错误消息 - 使用队列确保顺序
      const errorObj = error as { message?: string };
      const errorTimestamp = Date.now();
      const errorMessage: ChatMessage = {
        id: `error_${errorTimestamp}_${Math.random().toString(36).substr(2, 9)}`,
        role: "assistant",
        content: `❌ 抱歉，发生了错误：${errorObj.message || '网络连接失败，请稍后重试'}`,
        timestamp: errorTimestamp,
      };

      // 🔧 使用消息队列确保顺序
      addToMessageQueue(errorMessage);
      // 错误时也要隐藏"思考中"气泡
      setIsTyping(false);
    }
  };

  // 🎨 处理图片选择 - 智能压缩版本
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // 验证文件类型和数量
    const validImages = files.filter(file => {
      if (!isValidImageFile(file)) {
        toast.error(`${file.name} 不是支持的图片格式`);
        return false;
      }
      if (file.size > 50 * 1024 * 1024) { // 50MB限制（压缩前）
        toast.error(`${file.name} 文件过大，请选择小于50MB的图片`);
        return false;
      }
      return true;
    });

    if (selectedImages.length + validImages.length > 4) {
      toast.error('最多只能选择4张图片');
      return;
    }

    if (validImages.length === 0) return;

    // 🎨 智能压缩处理
    const compressedImages: File[] = [];
    let processingCount = 0;
    
    for (const file of validImages) {
      try {
        const toastId = toast.loading(`正在压缩图片: ${file.name}`, {
          description: '0%'
        });

        const compressedFile = await compressImage(file, {
          maxWidth: 1920,
          maxHeight: 1080,
          quality: 0.8,
          maxFileSize: 5 * 1024 * 1024, // 5MB
          progressCallback: (progress) => {
            toast.loading(`正在压缩图片: ${file.name}`, {
              id: toastId,
              description: `${progress}%`
            });
          }
        });

        compressedImages.push(compressedFile);
        processingCount++;
        
        toast.success(`图片压缩完成: ${file.name}`, {
          id: toastId,
          description: `${processingCount}/${validImages.length} 张图片已处理`
        });
        
      } catch (error) {
        console.error('压缩图片失败:', error);
        toast.error(`压缩失败: ${file.name}`);
      }
    }

    if (compressedImages.length > 0) {
      setSelectedImages(prev => [...prev, ...compressedImages]);
      toast.success(`已添加 ${compressedImages.length} 张图片`);
    }
    
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

      // 🎨 处理文件拖拽 - 智能压缩版本
      const files = Array.from(e.dataTransfer.files);
      const validImages = files.filter(file => {
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} 不是图片文件`);
          return false;
        }
        if (file.size > 50 * 1024 * 1024) { // 50MB限制（压缩前）
          toast.error(`${file.name} 文件过大，请选择小于50MB的图片`);
          return false;
        }
        return true;
      });

      if (selectedImages.length + validImages.length > 4) {
        toast.error('最多只能选择4张图片');
        return;
      }

      if (validImages.length > 0) {
        // 🎨 智能压缩处理
        const compressedImages: File[] = [];
        let processingCount = 0;
        
        for (const file of validImages) {
          try {
            const toastId = toast.loading(`正在压缩拖拽图片: ${file.name}`, {
              description: '0%'
            });

            const compressedFile = await compressImage(file, {
              maxWidth: 1920,
              maxHeight: 1080,
              quality: 0.8,
              maxFileSize: 5 * 1024 * 1024, // 5MB
              progressCallback: (progress) => {
                toast.loading(`正在压缩拖拽图片: ${file.name}`, {
                  id: toastId,
                  description: `${progress}%`
                });
              }
            });

            compressedImages.push(compressedFile);
            processingCount++;
            
            toast.success(`图片压缩完成: ${file.name}`, {
              id: toastId,
              description: `${processingCount}/${validImages.length} 张图片已处理`
            });
            
          } catch (error) {
            console.error('压缩拖拽图片失败:', error);
            toast.error(`压缩失败: ${file.name}`);
          }
        }

        if (compressedImages.length > 0) {
          setSelectedImages(prev => [...prev, ...compressedImages]);
          toast.success(`已添加 ${compressedImages.length} 张图片`);
        }
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
              className="space-y-3"
            >
              {/* AI 模型分类 */}
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2 px-1">AI 模型</h4>
                <div className="grid grid-cols-2 gap-2">
                  {AI_MODELS.filter(model => model.type === 'ai').map((model) => (
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
                        
                        // 切换到AI模型，退出工作流模式
                        setIsWorkflowMode(false);
                        setCurrentWorkflow(null);
                        setWorkflowStep(null);
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
              </div>

              {/* 工作流分类 */}
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2 px-1 flex items-center gap-1">
                                      <div className="h-3 w-3 rounded-full bg-workflow-primary/20 flex items-center justify-center text-xs">🔄</div>
                  智能工作流
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  {AI_MODELS.filter(model => model.type === 'workflow').map((model) => (
                    <Button
                      key={model.id}
                      variant={selectedModel === model.id ? "secondary" : "outline"}
                      className={cn(
                        "h-auto p-3 justify-start text-left",
                        selectedModel === model.id && "ring-2 ring-workflow-primary/20",
                        "border-workflow-primary/30 hover:border-workflow-primary/50"
                      )}
                      onClick={() => {
                        setSelectedModel(model.id);
                        setShowModelSelector(false);
                        
                        // 启动工作流模式
                        handleWorkflowStart(model.id);
                      }}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <span className="text-lg">{model.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{model.name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {model.description}
                          </div>
                          {model.category && (
                            <div className="text-xs text-workflow-primary mt-1">
                              {model.category}
                            </div>
                          )}
                        </div>
                        {selectedModel === model.id && (
                          <div className="h-4 w-4 rounded-full bg-workflow-primary flex items-center justify-center text-xs flex-shrink-0">🔄</div>
                        )}
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
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