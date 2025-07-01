# 🚀 Vercel自动部署工作流程指南

## 📋 当前部署状态

- **生产环境**: https://lsai-tau.vercel.app
- **GitHub仓库**: https://github.com/ZeoXel/LSAI.git
- **Vercel项目**: zeoxels-projects/lsai

## 🔄 标准开发部署流程

### 1. 本地开发
```bash
# 启动开发服务器
npm run dev

# 在浏览器中测试: http://localhost:3000
```

### 2. 提交更改
```bash
# 添加修改的文件
git add .

# 提交更改（使用语义化提交信息）
git commit -m "✨ feat: 添加新功能"
git commit -m "🐛 fix: 修复bug"
git commit -m "💄 style: 样式优化"
git commit -m "🔧 chore: 配置更新"
```

### 3. 推送到GitHub
```bash
# 推送到远程仓库
git push origin main
```

### 4. 自动部署
- ✅ Vercel检测到GitHub更新
- ✅ 自动触发构建和部署
- ✅ 几分钟后新版本上线

## ⚡ 快速部署选项

### CLI直接部署
```bash
# 预览部署（用于测试）
npx vercel

# 生产部署
npx vercel --prod

# 查看部署状态
npx vercel ls
```

### 分支部署策略
```bash
# 开发分支（自动生成预览URL）
git checkout -b feature/new-feature
git push origin feature/new-feature

# 主分支（自动部署到生产环境）
git checkout main
git merge feature/new-feature
git push origin main
```

## 🔍 部署监控和回滚

### 查看部署历史
```bash
# 列出所有部署
npx vercel ls

# 查看特定部署详情
npx vercel inspect [deployment-url]

# 查看实时日志
npx vercel logs --follow
```

### 回滚部署
```bash
# 回滚到上一个版本
npx vercel rollback [previous-deployment-url]

# 或者通过GitHub恢复提交
git revert HEAD
git push origin main
```

## 🎯 最佳实践

### 1. 预部署检查清单
- [ ] `npm run build` 构建成功
- [ ] `npm run dev` 本地测试正常
- [ ] 环境变量配置正确
- [ ] 没有TypeScript错误
- [ ] 没有ESLint警告

### 2. 提交信息规范
```bash
# 功能开发
git commit -m "✨ feat: 添加图像生成功能"

# Bug修复  
git commit -m "🐛 fix: 修复聊天历史显示问题"

# 样式更新
git commit -m "💄 style: 优化移动端响应式布局"

# 重构代码
git commit -m "♻️ refactor: 重构存储服务架构"

# 性能优化
git commit -m "⚡ perf: 优化图像加载性能"
```

### 3. 环境管理
```bash
# 查看环境变量
npx vercel env ls

# 添加环境变量
npx vercel env add VARIABLE_NAME

# 更新环境变量
npx vercel env rm VARIABLE_NAME
npx vercel env add VARIABLE_NAME
```

## 🚨 故障排除

### 构建失败
```bash
# 本地重现问题
npm run build

# 查看详细错误
npx vercel logs

# 检查依赖
npm ci
```

### 部署失败
```bash
# 强制重新部署
npx vercel --force

# 清理缓存
npx vercel --prod --force
```

### 网络问题
```bash
# 检查Vercel状态
curl -I https://vercel.com

# 使用代理（如需要）
npx vercel --debug
```

## 📊 性能监控

### 构建时间优化
```bash
# 分析构建时间
npx vercel inspect [url] --meta

# 查看包大小
npm run analyze
```

### 运行时监控
```bash
# 查看函数执行时间
npx vercel logs --json | jq '.duration'

# 监控错误率
npx vercel logs --prod --follow | grep ERROR
```

## 🔧 高级配置

### vercel.json 配置示例
```json
{
  "framework": "nextjs",
  "regions": ["hkg1", "sin1"],
  "functions": {
    "app/api/**/*.ts": {
      "memory": 512,
      "maxDuration": 30
    }
  },
  "github": {
    "silent": true
  }
}
```

### GitHub Actions集成
```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

## 📞 快速参考

### 常用命令速查
```bash
# 开发
npm run dev              # 启动开发服务器
npm run build            # 构建项目
npm run start            # 启动生产服务器

# Git
git status               # 查看状态
git add .                # 添加所有更改
git commit -m "message"  # 提交更改
git push origin main     # 推送到远程

# Vercel
npx vercel               # 预览部署
npx vercel --prod        # 生产部署
npx vercel ls            # 查看部署列表
npx vercel logs          # 查看日志
```

### 紧急修复流程
```bash
# 1. 快速修复
# 编辑代码...

# 2. 立即部署
npx vercel --prod

# 3. 补充提交
git add .
git commit -m "🚑 hotfix: 紧急修复问题"
git push origin main
```

---

**🎯 推荐工作流程：**
1. 本地开发 → 测试 → 提交 → 推送GitHub → 自动部署
2. 紧急修复时可以直接CLI部署，再补充Git提交
3. 使用分支开发复杂功能，合并到main分支触发生产部署 