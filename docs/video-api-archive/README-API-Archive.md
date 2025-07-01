# 可灵视频生成API - 使用说明

## 📖 概述

本项目已集成可灵AI的完整视频生成功能，支持文生视频、图生视频、多图参考生视频。

## 🎯 功能特性

- ✅ **文生视频**: 通过文字描述生成视频
- ✅ **图生视频**: 基于图片生成动态视频  
- ✅ **多图参考生视频**: 使用多张图片作为参考生成视频
- ✅ **任务状态查询**: 实时查询视频生成状态
- ✅ **参数验证**: 完整的输入参数验证和错误处理

## 🚀 快速开始

### 环境配置

```env
# .env.local
KLING_ACCESS_KEY=your_kling_access_key
KLING_SECRET_KEY=your_kling_secret_key
```

### API调用示例

```javascript
// 文生视频
const response = await fetch('/api/video/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: '一只可爱的小猫在阳光下玩耍',
            model: 'kling-v1',
            duration: 5,
            mode: 'std',
            aspect_ratio: '16:9'
  })
});

// 图生视频
const response = await fetch('/api/video/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: '让图片中的场景动起来',
            model: 'kling-v1',
    image: 'base64_image_data',
            duration: 5,
            mode: 'std'
  })
});

// 多图参考生视频
const response = await fetch('/api/video/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: '基于这些图片创建动态视频',
    model: 'kling-v1-6',
    image_list: [
            { image: 'base64_image_1' },
      { image: 'base64_image_2' }
    ],
            duration: '5',
    mode: 'std'
  })
});
```

## 📋 API参数说明

### 通用参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| model | string | ✅ | 模型名称: `kling-v1`, `kling-v1-6`, `kling-v2-master` |
| prompt | string | ✅ | 视频描述文本（最长2500字符） |
| duration | number/string | ❌ | 视频时长: 5, 10（秒） |
| mode | string | ❌ | 生成模式: `std`（标准）, `pro`（专家） |
| aspect_ratio | string | ❌ | 宽高比: `16:9`, `9:16`, `1:1` |

### 图生视频专用参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| image | string | ✅ | Base64格式图片数据 |

### 多图参考专用参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| image_list | array | ✅ | 图片数组，最多4张 |

## 🔧 支持的模型

| 模型 | 文生视频 | 图生视频 | 多图参考 | 模式支持 |
|------|----------|----------|----------|----------|
| `kling-v1` | ✅ | ✅ | ❌ | std, pro |
| `kling-v1-6` | ✅ (仅std) | ✅ | ✅ | std, pro |
| `kling-v2-master` | ✅ | ✅ | ❌ | 无模式选择 |
| `kling-v2-1-master` | ✅ | ✅ | ❌ | 无模式选择 |

## ⚠️ 重要注意事项

1. **API密钥安全**: 请确保API密钥安全，配置在环境变量中
2. **图片格式**: 支持jpg/jpeg/png，大小<10MB，尺寸>200px
3. **参数限制**: 
   - 提示词最长2500字符
   - 多图参考最多4张图片
   - 宽高比范围1:2.5~2.5:1
4. **任务状态**: 视频生成是异步任务，通常需要60-180秒
5. **模型限制**: 不同模型支持的功能和参数不同

## 🔍 错误处理

常见错误及解决方案：

- **API密钥无效**: 检查环境变量配置
- **请求参数错误**: 验证输入参数格式和范围
- **图片格式不支持**: 确保图片为jpg/jpeg/png格式
- **任务创建失败**: 检查网络连接和API配额

## 📚 相关文件

- `src/lib/kling-api.ts` - API客户端实现
- `src/app/api/video/generate/route.ts` - API路由处理
- `src/components/video/VideoGenerator.tsx` - 前端组件

---

💡 **提示**: 查看项目源码了解完整的实现细节！ 