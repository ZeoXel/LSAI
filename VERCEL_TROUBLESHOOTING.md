# 🚀 Vercel部署错误诊断与解决指南

## 📋 常见构建错误类型与解决方案

### 1. TypeScript编译错误
```bash
Failed to compile.
Type error: xxx
```

**解决方案：**
- ✅ 本地先运行 `npm run build` 确保构建成功
- ✅ 修复所有类型错误（我们刚刚完成了这步）
- ✅ 确保所有依赖都有正确的类型定义

### 2. 环境变量问题
```bash
Error: Environment variable missing
```

**解决方案：**
```bash
# 在Vercel项目设置中添加环境变量
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

### 3. 依赖安装失败
```bash
npm ERR! peer dep missing
```

**解决方案：**
```bash
# 清理依赖并重新安装
npm ci
npm run build
```

### 4. Node.js版本不兼容
```bash
Engine version mismatch
```

**解决方案：**
在项目根目录添加 `.node-version` 文件：
```
20
```

## 🛠️ 逐步部署流程

### 第一步：准备部署
```bash
# 1. 确保本地构建成功
npm run build

# 2. 测试生产环境
npm start

# 3. 检查环境变量
cat .env.local
```

### 第二步：初始化Vercel项目
```bash
# 如果是首次部署
npx vercel

# 按照提示：
# - Set up and deploy? [Y/n] Y
# - Which scope? 选择你的账户
# - What's the name of your project? lsai
# - In which directory is your code located? ./
```

### 第三步：配置项目设置
```bash
# 查看项目配置
npx vercel env ls

# 添加环境变量
npx vercel env add NEXT_PUBLIC_SUPABASE_URL
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### 第四步：手动部署
```bash
# 部署到预览环境
npx vercel

# 部署到生产环境
npx vercel --prod
```

## 🔍 错误诊断工具

### 1. 获取部署日志
```bash
# 查看最新部署日志
npx vercel logs

# 查看特定部署的日志
npx vercel logs [deployment-url]
```

### 2. 检查构建输出
```bash
# 本地模拟Vercel构建环境
npx vercel build
```

### 3. 调试模式部署
```bash
# 启用详细日志
npx vercel --debug
```

## ⚡ 快速修复清单

### 构建错误修复
- [ ] 运行 `npm run build` 检查本地构建
- [ ] 检查 TypeScript 类型错误
- [ ] 确认所有导入路径正确
- [ ] 验证环境变量配置

### 运行时错误修复
- [ ] 检查 Supabase 连接配置
- [ ] 验证 API 路由响应格式
- [ ] 确认客户端/服务端代码分离
- [ ] 检查动态导入是否正确

### 性能优化
- [ ] 启用图片优化
- [ ] 配置缓存策略
- [ ] 分析包大小
- [ ] 启用压缩

## 🏥 常见错误代码对照表

| 错误代码 | 含义 | 解决方案 |
|---------|------|----------|
| `FUNCTION_INVOCATION_TIMEOUT` | 函数执行超时 | 优化代码性能，增加超时时间 |
| `FUNCTION_INVOCATION_FAILED` | 函数执行失败 | 检查服务端代码错误 |
| `BUILD_FAILED` | 构建失败 | 修复编译错误 |
| `DEPLOYMENT_ERROR` | 部署错误 | 检查项目配置 |

## 📞 获取详细错误信息

### 方法1：Vercel Dashboard
1. 访问 [vercel.com/dashboard](https://vercel.com/dashboard)
2. 选择你的项目
3. 点击失败的部署
4. 查看 "Build Logs" 和 "Function Logs"

### 方法2：CLI命令
```bash
# 获取项目列表
npx vercel ls

# 获取部署历史
npx vercel inspect [deployment-url]

# 获取详细日志
npx vercel logs --follow
```

### 方法3：实时监控
```bash
# 监控实时日志
npx vercel logs --follow

# 监控特定函数
npx vercel logs api/chat --follow
```

## 🎯 部署最佳实践

### 1. 预部署检查
```bash
#!/bin/bash
# pre-deploy.sh

echo "🔍 预部署检查..."

# 检查构建
npm run build || exit 1

# 检查类型
npm run type-check || exit 1

# 检查环境变量
[ -z "$NEXT_PUBLIC_SUPABASE_URL" ] && echo "❌ Supabase URL missing" && exit 1
[ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ] && echo "❌ Supabase Key missing" && exit 1

echo "✅ 预部署检查通过"
```

### 2. 分阶段部署
```bash
# 开发环境
npx vercel --prod=false

# 预生产测试
npx vercel --prod=false --target=preview

# 生产部署
npx vercel --prod
```

### 3. 回滚策略
```bash
# 查看部署历史
npx vercel ls

# 回滚到特定版本
npx vercel rollback [deployment-url]
```

## 🔧 高级故障排除

### 1. 内存问题
```javascript
// vercel.json
{
  "functions": {
    "app/api/**/*.ts": {
      "memory": 512
    }
  }
}
```

### 2. 超时问题
```javascript
// vercel.json
{
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  }
}
```

### 3. 区域配置
```javascript
// vercel.json
{
  "regions": ["hkg1", "sin1"]
}
```

## 📝 记录和分析

### 构建日志分析
```bash
# 保存构建日志
npx vercel logs > deployment-logs.txt

# 分析错误模式
grep -i "error\|failed\|timeout" deployment-logs.txt
```

### 性能监控
```bash
# 分析构建时间
npx vercel inspect [url] --meta

# 查看函数执行时间
npx vercel logs --json | jq '.duration'
```

---

**🚨 遇到问题时的操作顺序：**
1. 复制完整错误信息
2. 检查本地构建是否成功
3. 验证环境变量配置
4. 查看 Vercel Dashboard 详细日志
5. 根据错误类型选择对应解决方案
6. 如需帮助，提供错误日志和部署URL 