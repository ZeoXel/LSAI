# LSJX - AI多模态内容生成平台

基于Next.js 15和可灵AI的多模态内容生成平台，支持智能对话、图像生成、视频创作等功能。

## ✨ 核心功能

- 🤖 **智能对话** - 基于大语言模型的智能聊天
- 🎨 **图像生成** - 文生图、图生图、多图合并
- 🎬 **视频创作** - 文生视频、图生视频、多图参考生视频
- 📚 **历史记录** - 完整的创作历史管理
- 🎯 **统一设计** - 基于设计系统的一致性UI

## 🚀 快速开始

### 环境要求
- Node.js 18+
- Bun 或 npm/yarn/pnpm

### 安装依赖
```bash
bun install
# 或 npm install
```

### 环境配置
创建 `.env.local` 文件：
```env
# 可灵AI配置
KLING_ACCESS_KEY=your_access_key
KLING_SECRET_KEY=your_secret_key

# 其他AI服务配置（可选）
OPENAI_API_KEY=your_openai_key
```

### 启动开发服务器
```bash
bun dev
# 或 npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## 🛠️ 技术栈

- **框架**: Next.js 15 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS + 设计系统
- **UI组件**: shadcn/ui
- **状态管理**: React Hooks + Local Storage
- **AI服务**: 可灵AI、OpenAI等

## 📁 项目结构

```
src/
├── app/                 # Next.js App Router
│   ├── api/            # API路由
│   └── globals.css     # 全局样式
├── components/         # React组件
│   ├── ai/            # AI工具基座
│   ├── chat/          # 聊天功能
│   ├── image/         # 图像生成
│   ├── video/         # 视频生成
│   ├── layout/        # 布局组件
│   └── ui/            # 基础UI组件
├── lib/               # 工具函数和配置
│   ├── design-system.ts  # 设计系统
│   ├── kling-api.ts      # 可灵API
│   └── utils.ts          # 工具函数
└── templates/         # 开发模板
```

## 🎨 设计系统

项目采用严格的设计系统，确保UI一致性：

- **语义化颜色**: chat(蓝)、image(紫)、video(橙)、workflow(绿)
- **统一间距**: 基于4px网格的标准间距
- **组件变体**: 预定义的按钮、卡片等组件样式

### 样式检查
```bash
# 检查样式规范
bun run style-enforce

# 自动修复样式违规
bun run style-enforce-fix
```

## 🔧 开发指南

### 添加新功能
1. 基于 `AIToolBase` 创建新工具组件
2. 参考 `src/templates/` 下的开发模板
3. 遵循设计系统规范
4. 添加相应的API路由

### 代码规范
- 使用TypeScript严格模式
- 遵循ESLint配置
- 提交前自动运行样式检查
- 使用语义化的commit消息

## 📚 API文档

### 可灵AI集成
项目已集成可灵AI的完整API：
- 文生视频/图生视频
- 多图参考生视频
- 智能参数验证
- 自动任务轮询

详细API文档请查看 `docs/video-api-archive/`

## 🚀 部署

### Vercel部署（推荐）
1. Fork本项目到GitHub
2. 在Vercel中导入项目
3. 配置环境变量
4. 自动部署完成

### 其他平台
支持任何支持Next.js的部署平台，如Netlify、Railway等。

## 🤝 贡献

欢迎提交Issue和Pull Request！

1. Fork项目
2. 创建功能分支
3. 提交变更
4. 发起Pull Request

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件。

---

⭐ 如果这个项目对你有帮助，请给一个Star！
