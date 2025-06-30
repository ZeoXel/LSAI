# AI工具开发模板

## 🎯 概述

AIToolBase 是统一的AI工具基座组件，提供一致的样式和交互体验，已集成图片上传、拖拽、历史记录等核心功能。

## 🚀 快速开始

### 基础配置

```typescript
import { AIToolBase } from "@/components/ai/AIToolBase";
import { YourIcon } from "lucide-react";

export function YourAITool() {
  return (
    <AIToolBase
      config={{
        id: "your-tool",                    // 工具唯一标识
        name: "您的AI工具",                 // 显示名称
        description: "工具描述",            // 功能描述
        icon: YourIcon,                     // Lucide图标组件
        semanticColor: "chat",              // 语义化颜色主题
        placeholder: "输入提示文字...",      // 输入框占位符
        newSessionEvent: "newYourToolSession" // 新会话事件名
      }}
      models={YOUR_MODELS}                  // 模型列表
      defaultModel="default-model"          // 默认模型
      onProcess={handleProcess}             // 处理函数
      renderResult={renderResult}           // 结果渲染函数
      supportsImages={true}                 // 是否支持图片上传
    />
  );
}
```

### 语义化颜色主题

```typescript
semanticColor: "chat"      // 🔵 蓝色系 - 聊天对话
semanticColor: "image"     // 🟣 紫色系 - 图像生成  
semanticColor: "video"     // 🟠 橙红系 - 视频音频
semanticColor: "workflow"  // 🟢 绿色系 - 工作流程
```

## 🔧 核心接口

### 处理函数签名

```typescript
const handleProcess = async (input: string, model: string, images?: File[]) => {
  // 处理图片（如果支持）
  if (images && images.length > 0) {
    for (const image of images) {
      const base64 = await convertFileToBase64(image);
      // 使用图片...
    }
  }
  
  // 处理文本输入和API调用
  try {
    const response = await fetch('/api/your-endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input, model, images })
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    throw new Error('处理失败');
  }
};
```

### 结果渲染函数

```typescript
const renderResult = (result: any, isGenerating: boolean) => {
  if (isGenerating) {
    return <div className="text-muted-foreground">生成中...</div>;
  }
  
  return (
    <div className="max-w-3xl rounded-lg px-4 py-2 bg-muted text-foreground">
      {/* 渲染你的结果 */}
      <p>{result.content}</p>
    </div>
  );
};
```

## 📝 模型配置

```typescript
const YOUR_MODELS = [
  {
    id: "model-1",
    name: "模型名称",
    description: "模型描述",
    icon: "🤖"
  }
];
```

## 🎨 样式规范

### 消息气泡
```typescript
// AI回复气泡 - 标准样式
<div className="flex gap-3 justify-start">
  <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
    <YourIcon className="h-4 w-4 text-primary-foreground" />
  </div>
  <div className="max-w-3xl rounded-lg px-4 py-2 bg-muted text-foreground">
    {/* 内容 */}
  </div>
</div>
```

### 操作按钮
```typescript
<Button variant="outline" size="sm" className="gap-2">
  <Icon className="w-3 h-3" />
  操作文本
</Button>
```

## 🖼️ 图片处理

```typescript
import { convertFileToBase64, isValidImageFile } from "@/lib/utils";

// 文件转Base64
const base64 = await convertFileToBase64(file);

// 验证图片格式
const isValid = isValidImageFile(file);
```

## ✅ 完整示例

参考 `src/templates/ExampleAITool.tsx` 查看完整实现，包括：
- 基础配置设置
- 图片上传处理  
- API调用逻辑
- 结果渲染样式
- 错误处理机制

---

💡 **提示**: 遵循设计系统规范，使用语义化颜色和预设间距！ 