# Git工作流快速指南

## 🚀 日常开发流程

### 1. 开始工作前
```bash
git pull origin main          # 拉取最新代码
git status                    # 检查当前状态
```

### 2. 开发新功能
```bash
git checkout -b feature/功能名  # 创建功能分支
# 进行代码开发...
git add .                     # 添加变更
git commit -m "feat: 功能描述"  # 提交变更
```

### 3. 提交前自动检查
项目已配置pre-commit hooks，提交时自动执行：
- ✅ 样式规范检查 (`bun run check-styles`)
- ✅ TypeScript类型检查 (`bun run lint`)
- ✅ 代码格式化

### 4. 推送和合并
```bash
git push origin feature/功能名  # 推送到远程
# 在GitHub/GitLab创建Pull Request
# 代码审查通过后合并到main分支
```

## 📋 Commit Message 规范

### 类型说明
- `feat`: 新功能
- `fix`: 修复bug
- `docs`: 文档更新
- `style`: 样式调整（不影响功能）
- `refactor`: 重构代码
- `test`: 测试相关
- `chore`: 构建工具、依赖更新

### 格式示例
```
feat(chat): 添加消息发送功能

- 支持文本消息发送
- 支持图片上传
- 添加消息状态显示
```

## 🛠️ 常用命令速查

| 操作 | 命令 | 说明 |
|-----|------|-----|
| 查看状态 | `git status` | 查看文件变更状态 |
| 添加文件 | `git add .` | 添加所有变更 |
| 提交变更 | `git commit -m "消息"` | 提交到本地仓库 |
| 推送代码 | `git push` | 推送到远程仓库 |
| 拉取更新 | `git pull` | 获取最新代码 |
| 查看历史 | `git log --oneline` | 查看提交历史 |
| 创建分支 | `git checkout -b 分支名` | 创建并切换分支 |
| 切换分支 | `git checkout 分支名` | 切换到指定分支 |

## 🚨 紧急情况处理

### 撤销工作区修改
```bash
git restore 文件名            # 撤销单个文件
git restore .                # 撤销所有修改
```

### 撤销暂存区文件
```bash
git restore --staged 文件名   # 撤销单个文件暂存
git restore --staged .       # 撤销所有暂存
```

### 修改最后一次提交
```bash
git commit --amend -m "新的提交消息"
```

### 撤销最后一次提交
```bash
git reset --soft HEAD~1      # 撤销提交，保留修改
git reset --hard HEAD~1      # 撤销提交，丢弃修改（危险！）
```

## 🔄 分支管理策略

### 主分支保护
- `main`: 生产环境代码，只接受合并
- `develop`: 开发分支，日常开发基础

### 功能分支命名
- `feature/功能名`: 新功能开发
- `fix/问题描述`: bug修复
- `hotfix/紧急修复`: 生产环境紧急修复

### 工作流程
1. 从`main`创建功能分支
2. 在功能分支开发
3. 提交Pull Request到`main`
4. 代码审查通过后合并
5. 删除功能分支

## 📊 Background Agents集成

项目已配置自动化检查：
- 🎨 **文件保存时**: 自动样式检查
- 🔍 **提交前**: TypeScript类型检查
- 🛡️ **每日**: 依赖安全审计
- ⚙️ **配置变更**: 构建验证
- 🌐 **每小时**: API健康检查

## 🎯 最佳实践

1. **频繁提交**: 小步快跑，每个功能点都提交
2. **清晰消息**: commit message要描述清楚做了什么
3. **分支管理**: 一个功能一个分支，避免混合开发
4. **代码审查**: 重要变更要经过team review
5. **定期同步**: 每天开始工作前先`git pull`

## 🆘 求助方式

遇到Git问题时：
1. 先执行`git status`查看状态
2. 使用`git log --oneline`查看历史
3. 参考本指南的常见问题解决方案
4. 向团队成员求助

---
💡 **提示**: 将此文档加入书签，随时查阅！ 