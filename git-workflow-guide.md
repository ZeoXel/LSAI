# Git工作流快速指南

## 🚀 日常开发流程

### 基础操作
```bash
# 拉取最新代码
git pull origin main

# 查看状态
git status

# 添加所有变更
git add .

# 提交变更
git commit -m "feat: 功能描述"

# 推送代码
git push origin main
```

### 分支开发
```bash
# 创建并切换到新分支
git checkout -b feature/功能名

# 开发完成后推送分支
git push origin feature/功能名

# 在GitHub创建Pull Request
# 合并后删除分支
git branch -d feature/功能名
```

## 📋 Commit Message 规范

| 类型 | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat(chat): 添加消息发送功能` |
| `fix` | 修复bug | `fix(image): 修复图片上传问题` |
| `style` | 样式调整 | `style: 更新按钮颜色` |
| `refactor` | 重构代码 | `refactor: 优化API调用逻辑` |
| `docs` | 文档更新 | `docs: 更新README` |
| `chore` | 构建工具 | `chore: 更新依赖版本` |

## 🛠️ 常用命令

| 操作 | 命令 | 说明 |
|-----|------|-----|
| 查看状态 | `git status` | 查看文件变更状态 |
| 查看历史 | `git log --oneline` | 查看提交历史 |
| 撤销修改 | `git restore .` | 撤销工作区修改 |
| 撤销暂存 | `git restore --staged .` | 撤销暂存区文件 |
| 修改提交 | `git commit --amend` | 修改最后一次提交 |

## 🚨 紧急情况

### 撤销最后一次提交
```bash
# 保留修改
git reset --soft HEAD~1

# 丢弃修改（危险！）
git reset --hard HEAD~1
```

### 强制推送（谨慎使用）
```bash
git push --force-with-lease origin branch-name
```

## ✅ 提交前检查

项目已配置自动检查：
- ✅ 样式规范检查
- ✅ TypeScript类型检查
- ✅ 代码格式化

确保提交前运行：
```bash
bun run style-enforce
```

---
💡 **记住**: 频繁提交，清晰消息，定期同步！ 