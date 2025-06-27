/**
 * 示例AI工具组件
 * 基于 ChatPage.tsx 结构创建，供新工具开发参考
 * 
 * 使用方法：
 * 1. 复制此文件到 src/components/[工具名]/[工具名]Page.tsx
 * 2. 修改组件名称和工具特有逻辑
 * 3. 在 MainContent.tsx 中添加路由
 * 4. 在 LeftSidebar.tsx 中添加工具项
 * 5. 在 HomePage.tsx 中添加功能卡片
 */

"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Send, Settings, Zap, Sparkles, FileText } from "lucide-react"; // 示例图标
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useHistoryStore } from "@/lib/history-store";
import { useConversationStore } from "@/lib/conversation-store";
import { localStorageService } from "@/lib/local-storage";

// 模型配置（从ChatPage复制）
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
];

export function ExampleAITool() {
  // 基础状态（从ChatPage复制的通用状态）
  const [inputValue, setInputValue] = useState("");
  const [selectedModel, setSelectedModel] = useState("gpt-4o");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(false);
  
  // 工具特有状态（根据需求自定义）
  const [result, setResult] = useState<string>("");
  const [resultHistory, setResultHistory] = useState<Array<{input: string, output: string, timestamp: number}>>([]);
  
  // Store hooks（复用现有历史记录功能）
  const { loadRecords } = useHistoryStore();
  const { 
    currentConversation, 
    addMessage, 
    clearConversation 
  } = useConversationStore();

  // 新建会话（参考ChatPage模式）
  useEffect(() => {
    const handleNewSession = () => {
      handleNewConversation();
    };
    
    window.addEventListener('newExampleSession', handleNewSession);
    
    return () => {
      window.removeEventListener('newExampleSession', handleNewSession);
    };
  }, []);

  const handleNewConversation = async () => {
    try {
      clearConversation();
      setResult("");
      setResultHistory([]);
      loadRecords();
      console.log('已开始新会话');
    } catch (error) {
      console.error('新建会话失败:', error);
    }
  };

  // 核心处理函数（根据工具类型自定义）
  const handleProcess = async () => {
    if (!inputValue.trim() || isProcessing) return;

    setIsProcessing(true);
    const currentInput = inputValue.trim();

    try {
      // 1. 构建请求数据
      const requestData = {
        input: currentInput,
        model: selectedModel,
        // 添加工具特有参数
        toolType: 'example',
      };

      // 2. 调用API（示例，需要创建对应的API路由）
      const response = await fetch('/api/example-tool', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '处理失败');
      }

      // 3. 处理结果
      const processedResult = data.result;
      setResult(processedResult);
      
      // 添加到历史
      const newRecord = {
        input: currentInput,
        output: processedResult,
        timestamp: Date.now(),
      };
      setResultHistory(prev => [newRecord, ...prev]);

      // 4. 可选：保存到对话历史
      if (currentConversation || true) { // 根据需求决定是否保存
        // 参考ChatPage的保存逻辑
        try {
          let activeConversation = currentConversation || await localStorageService.getActiveConversation();
          
          if (!activeConversation) {
            const title = currentInput.length > 30 ? currentInput.substring(0, 30) + '...' : currentInput;
            activeConversation = await localStorageService.createConversation(title, selectedModel);
          }
          
          // 保存输入和输出
          const userMessage = {
            id: Date.now().toString(),
            role: "user" as const,
            content: currentInput,
            timestamp: Date.now(),
          };
          
          const assistantMessage = {
            id: (Date.now() + 1).toString(),
            role: "assistant" as const,
            content: processedResult,
            timestamp: Date.now(),
          };
          
          await localStorageService.addMessageToConversation(activeConversation.id, userMessage);
          await localStorageService.addMessageToConversation(activeConversation.id, assistantMessage);
          
          addMessage(userMessage);
          addMessage(assistantMessage);
        } catch (saveError) {
          console.error('保存历史记录失败:', saveError);
        }
      }

      // 清空输入
      setInputValue("");

    } catch (error: unknown) {
      console.error('ExampleTool error:', error);
      
      const errorObj = error as { message?: string };
      setResult(`❌ 处理失败：${errorObj.message || '未知错误'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 键盘事件处理
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleProcess();
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* 顶部工具栏（参考ChatPage结构） */}
      <div className="flex-shrink-0 p-4 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">示例AI工具</h2>
          <div className="flex items-center space-x-2">
            {/* 模型选择器（从ChatPage复制） */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowModelSelector(!showModelSelector)}
                className="flex items-center space-x-2"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {AI_MODELS.find(m => m.id === selectedModel)?.name || selectedModel}
                </span>
              </Button>

              {/* 模型选择器弹出层 */}
              {showModelSelector && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className="absolute top-full mt-2 right-0 w-80 bg-card border border-border rounded-lg shadow-lg z-50"
                >
                  <div className="p-4">
                    <h3 className="text-sm font-medium text-foreground mb-3">选择AI模型</h3>
                    <div className="space-y-2">
                      {AI_MODELS.map((model) => (
                        <div
                          key={model.id}
                          onClick={() => {
                            setSelectedModel(model.id);
                            setShowModelSelector(false);
                          }}
                          className={cn(
                            "flex items-start space-x-3 p-3 rounded-lg cursor-pointer transition-colors",
                            selectedModel === model.id
                              ? "bg-primary/10 text-primary"
                              : "hover:bg-muted"
                          )}
                        >
                          <span className="text-lg">{model.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <h4 className="text-sm font-medium">{model.name}</h4>
                              {selectedModel === model.id && (
                                <Zap className="h-3 w-3" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {model.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {/* 工具介绍 */}
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">示例AI工具</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              这是一个基于ChatPage结构的示例工具，展示了如何创建新的AI功能组件。
            </p>
          </div>

          {/* 当前结果展示 */}
          {result && (
            <div className="bg-card rounded-lg p-4 border border-border">
              <h4 className="text-sm font-medium text-foreground mb-2">处理结果：</h4>
              <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                {result}
              </div>
            </div>
          )}

          {/* 处理中状态 */}
          {isProcessing && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Sparkles className="h-4 w-4 animate-spin" />
                <span className="text-sm">正在处理...</span>
              </div>
            </div>
          )}

          {/* 历史记录 */}
          {resultHistory.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-foreground">历史记录：</h4>
              {resultHistory.slice(0, 5).map((record, index) => (
                <div key={record.timestamp} className="bg-muted/50 rounded-lg p-3 border border-border/50">
                  <div className="text-xs text-muted-foreground mb-1">
                    {new Date(record.timestamp).toLocaleString()}
                  </div>
                  <div className="text-sm font-medium mb-1">输入: {record.input}</div>
                  <div className="text-sm text-muted-foreground">输出: {record.output}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* 底部输入区域（参考ChatPage结构） */}
      <div className="flex-shrink-0 p-4 border-t border-border">
        <div className="flex space-x-2">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入内容进行处理..."
            className="flex-1 min-h-[40px] max-h-[120px] px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            disabled={isProcessing}
          />
          <Button
            onClick={handleProcess}
            disabled={!inputValue.trim() || isProcessing}
            size="sm"
            className="px-3"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 点击遮罩关闭模型选择器 */}
      {showModelSelector && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowModelSelector(false)}
        />
      )}
    </div>
  );
}

// 导出供参考
export default ExampleAITool; 