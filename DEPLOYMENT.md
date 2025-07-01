# 🚀 AI平台 Supabase + Vercel 部署指南

## 📋 部署流程概览

1. **配置Supabase数据库** - 创建表结构和Storage
2. **配置环境变量** - 本地和Vercel
3. **部署到Vercel** - 自动化部署

---

## 第一步：Supabase数据库配置

### 1.1 执行数据库初始化脚本

1. 打开你的Supabase项目控制台
2. 进入 `SQL Editor`
3. 复制并执行 `supabase-setup.sql` 中的完整脚本
4. 确认所有表和策略创建成功

### 1.2 验证数据库结构

执行完脚本后，检查以下表是否已创建：
- ✅ `history_records` - 历史记录
- ✅ `media_files` - 媒体文件元数据
- ✅ `tags` - 标签管理
- ✅ `app_settings` - 应用设置
- ✅ Storage bucket: `media` - 文件存储

---

## 第二步：环境变量配置

### 2.1 创建本地环境变量文件

在项目根目录创建 `.env.local` 文件：

```bash
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# OpenAI API 配置
OPENAI_API_KEY=sk-your-openai-api-key

# 可灵AI视频生成配置
KLING_ACCESS_KEY=your-kling-access-key
KLING_SECRET_KEY=your-kling-secret-key

# 生产环境配置
NODE_ENV=production
```

### 2.2 获取Supabase配置

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择你的项目
3. 进入 `Settings` > `API`
4. 复制：
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2.3 测试本地连接

```bash
npm run dev
```

确认：
- ✅ 没有Supabase连接错误
- ✅ 历史记录模块正常工作
- ✅ 图像/视频生成能保存到Supabase

---

## 第三步：Vercel部署

### 3.1 连接GitHub仓库

1. 登录 [Vercel Dashboard](https://vercel.com)
2. 点击 `New Project`
3. 导入你的GitHub仓库
4. 选择 `Next.js` 框架

### 3.2 配置环境变量

在Vercel项目设置中添加环境变量：

```
NEXT_PUBLIC_SUPABASE_URL = https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = your-anon-key
OPENAI_API_KEY = sk-your-openai-api-key
KLING_ACCESS_KEY = your-kling-access-key
KLING_SECRET_KEY = your-kling-secret-key
NODE_ENV = production
```

### 3.3 部署设置

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "devCommand": "npm run dev"
}
```

### 3.4 自动部署

1. 推送代码到GitHub仓库
2. Vercel自动触发部署
3. 检查部署日志确认无错误

---

## 🔧 数据迁移（可选）

### 从本地IndexedDB迁移到Supabase

如果有本地数据需要迁移：

1. **导出本地数据**：
   ```typescript
   // 在浏览器控制台执行
   import { db } from './src/lib/database';
   const data = await db.export();
   console.log(data); // 复制数据
   ```

2. **导入到Supabase**：
   - 使用Supabase SQL Editor
   - 或通过应用的导入功能

---

## 🚨 常见问题解决

### 问题1：Supabase连接失败
```
Error: Invalid API key
```
**解决**：检查环境变量是否正确配置

### 问题2：文件上传失败
```
Error: Storage bucket not found
```
**解决**：确认Storage bucket `media` 已创建且为public

### 问题3：Vercel部署失败
```
Error: Build failed
```
**解决**：
1. 检查所有环境变量已配置
2. 确认代码没有TypeScript错误
3. 查看Vercel部署日志

### 问题4：数据库权限错误
```
Error: Row level security policy
```
**解决**：确认RLS策略已正确创建

---

## ✅ 部署检查清单

- [ ] Supabase项目已创建
- [ ] 数据库脚本执行成功
- [ ] Storage bucket配置完成
- [ ] 本地环境变量配置
- [ ] 本地测试通过
- [ ] GitHub代码已推送
- [ ] Vercel项目已创建
- [ ] Vercel环境变量配置
- [ ] 部署成功无错误
- [ ] 生产环境功能测试

---

## 🎯 优化建议

### 性能优化
- 启用Supabase CDN
- 配置适当的数据库索引
- 使用Edge Functions处理重计算

### 安全优化
- 配置更严格的RLS策略
- 启用用户认证（可选）
- 定期轮换API密钥

### 监控优化
- 配置Vercel Analytics
- 设置Supabase监控报警
- 定期检查数据库性能

---

## 📞 技术支持

如遇到部署问题：
1. 检查本指南的常见问题
2. 查看Vercel/Supabase官方文档
3. 检查GitHub Issues

部署成功后，你的AI平台将拥有：
- 🌐 全球CDN加速
- 💾 云端数据存储
- 🔄 自动备份和恢复
- 📈 无限扩展能力 