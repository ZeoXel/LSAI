# AI工具开发模版

## 📋 基于聊天工具的开发参考

本模版基于 `src/components/chat/ChatPage.tsx` 提供新AI工具开发参考，保持现有架构不变。

## 🏗️ 基础结构模版

### 1. 组件文件结构
```typescript
// src/components/[工具名]/[工具名]Page.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Send, Bot, User, Settings, Zap, [工具图标] } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useHistoryStore } from "@/lib/history-store";
import { useConversationStore } from "@/lib/conversation-store";
import { localStorageService } from "@/lib/local-storage";
// 根据需要添加其他导入
```

### 2. 状态管理模版
```typescript
export function [工具名]Page() {
  // 基础输入状态
  const [inputValue, setInputValue] = useState("");
  const [selectedModel, setSelectedModel] = useState("gpt-4o");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(false);
  
  // 工具特有状态（可选）
  const [toolSpecificState, setToolSpecificState] = useState(null);
  
  // Store hooks（复用历史记录功能）
  const { loadRecords } = useHistoryStore();
  const { 
    currentConversation, 
    messages, 
    setMessages, 
    addMessage, 
    clearConversation 
  } = useConversationStore();
}
```

### 3. 模型选择器模版（可复用）
从ChatPage.tsx复制模型选择器部分：
- AI_MODELS 常量定义
- showModelSelector 状态管理
- 模型选择器UI组件

### 4. 核心处理函数模版
```typescript
const handleProcess = async () => {
  if (!inputValue.trim() || isProcessing) return;

  setIsProcessing(true);

  try {
    // 1. 构建请求内容
    const requestData = {
      input: inputValue.trim(),
      model: selectedModel,
      // 添加工具特有参数
    };

    // 2. 调用API
    const response = await fetch('/api/[工具API路由]', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || '请求失败');
    }

    // 3. 处理响应结果
    // 根据工具类型处理结果

    // 4. 保存到历史记录（可选）
    // 参考ChatPage的历史记录保存逻辑

  } catch (error) {
    console.error('[工具名] error:', error);
    // 错误处理
  } finally {
    setIsProcessing(false);
  }
};
```

### 5. UI布局模版
```typescript
return (
  <div className="h-full flex flex-col bg-background">
    {/* 顶部工具栏 - 参考ChatPage */}
    <div className="flex-shrink-0 p-4 border-b border-border bg-card">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">[工具名]</h2>
        {/* 模型选择器等控件 */}
      </div>
    </div>

    {/* 主内容区域 */}
    <ScrollArea className="flex-1 p-4">
      {/* 工具特有的内容展示区域 */}
    </ScrollArea>

    {/* 底部输入区域 */}
    <div className="flex-shrink-0 p-4 border-t border-border">
      <div className="flex space-x-2">
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="输入内容..."
          className="flex-1 min-h-[40px] max-h-[120px] px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          disabled={isProcessing}
        />
        <Button
          onClick={handleProcess}
          disabled={!inputValue.trim() || isProcessing}
          size="sm"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  </div>
);
```

## 🔗 集成到现有系统

### 1. 添加到MainContent.tsx
在 `renderToolContent()` 函数中添加新case：
```typescript
case '[工具id]':
  return <[工具名]Page />;
```

### 2. 添加到LeftSidebar.tsx
在 `tools` 数组中添加新工具：
```typescript
{
  id: "[工具id]",
  name: "[工具显示名]",
  icon: [工具图标],
  description: "[工具描述]",
  gradient: "from-[颜色1] to-[颜色2]",
  bgColor: "bg-[语义色]/10 dark:bg-[语义色]/20",
}
```

### 3. 添加到HomePage.tsx
在 `features` 数组中添加新功能卡片：
```typescript
{
  id: "[工具id]",
  title: "[工具标题]",
  description: "[工具描述]",
  icon: [工具图标],
  color: "text-[语义色]",
}
```

## 🎨 样式规范

### 必须使用设计系统
- ✅ 语义化颜色：`text-primary`, `bg-card`, `border-border`
- ✅ 预设间距：`p-4`, `m-6`, `space-y-2`
- ✅ 组件变体：`<Button variant="outline" size="sm">`
- ❌ 禁止硬编码：`text-blue-500`, `p-[12px]`, `bg-[#ff0000]`

### 色彩方案建议
- 聊天功能：蓝色系 (`text-info`, `bg-info`)
- 图像功能：紫色系 (`text-success`, `bg-success`) 
- 视频功能：橙红系 (`text-accent`, `bg-accent`)
- 工作流功能：绿色系 (`text-warning`, `bg-warning`)

## 📁 推荐目录结构
```
src/
  components/
    [工具名]/
      [工具名]Page.tsx          # 主组件
      [工具名]Settings.tsx      # 设置组件（可选）
      [工具名]Result.tsx        # 结果展示组件（可选）
  app/
    api/
      [工具名]/
        route.ts               # API路由
```

## 🚀 快速开始步骤

1. **复制ChatPage.tsx**作为起点
2. **修改工具特有逻辑**（API调用、结果处理）
3. **调整UI界面**以适配工具功能
4. **添加API路由**处理后端逻辑  
5. **集成到导航系统**（MainContent、LeftSidebar、HomePage）
6. **测试功能完整性**

## 💡 开发建议

- **保持一致性**：UI风格、交互方式与现有工具保持一致
- **复用历史记录**：使用现有的conversation store和history store
- **模块化设计**：将复杂功能拆分为子组件
- **错误处理**：参考ChatPage的错误处理模式
- **性能优化**：大文件处理、长列表渲染等考虑性能优化

---

**📌 重要：此模版仅供参考，不修改现有稳定功能，新工具开发时复制相关代码块并根据需求调整。** 