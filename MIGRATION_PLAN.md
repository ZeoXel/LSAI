# 腾讯云全链路迁移计划

## 🎯 目标
彻底放弃Vercel混合架构，将整个应用迁移到腾讯云，实现：
- 零超时限制
- 统一架构
- 简化调试
- 降低复杂度

## 📋 迁移阶段

### Phase 1: 基础设施准备 (1天)

#### 1.1 腾讯云资源创建
```bash
# 1. 创建CVM实例
- 配置: 2核4G，Ubuntu 22.04
- 带宽: 5Mbps
- 存储: 50GB SSD

# 2. 配置安全组
- 开放端口: 22(SSH), 80(HTTP), 443(HTTPS), 3000(Next.js)
- 限制来源: 0.0.0.0/0

# 3. 创建COS存储桶
- 用途: 静态资源存储
- 配置CDN加速
```

#### 1.2 域名和SSL配置
```bash
# 1. 域名解析到CVM公网IP
# 2. 申请SSL证书
# 3. 配置Nginx反向代理
```

#### 1.3 服务器环境搭建
```bash
# 安装必要软件
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx nodejs npm git certbot

# 安装Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装PM2进程管理
sudo npm install -g pm2
```

### Phase 2: 应用迁移 (半天)

#### 2.1 代码适配
```typescript
// 移除Vercel特定配置
// 移除异步任务系统
// 恢复同步API处理
// 简化前端逻辑
```

#### 2.2 环境变量配置
```bash
# 在CVM上配置环境变量
cat > .env.production << EOF
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
OPENAI_API_KEY=your_openai_key
DMXAPI_KEY=your_dmx_key
KLING_API_KEY=your_kling_key
EOF
```

#### 2.3 部署脚本
```bash
#!/bin/bash
# deploy.sh

# 拉取最新代码
git pull origin main

# 安装依赖
npm ci

# 构建应用
npm run build

# 重启PM2进程
pm2 restart ai-platform || pm2 start npm --name "ai-platform" -- start

echo "部署完成！"
```

### Phase 3: 数据库迁移 (半天)

#### 3.1 清理Supabase
```sql
-- 删除不需要的async_tasks表
DROP TABLE IF EXISTS async_tasks;

-- 保留用户数据和生成记录
-- 其他表保持不变
```

#### 3.2 简化数据模型
```typescript
// 移除异步任务相关字段
// 恢复简单的生成记录模式
```

### Phase 4: API重构 (半天)

#### 4.1 恢复同步API
```typescript
// src/app/api/images/generate/route.ts
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // 直接调用DMXAPI，无需异步处理
    const response = await fetch('https://api.dmx.pub/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DMXAPI_KEY}`
      },
      body: JSON.stringify({
        model: 'dmx-image-1',
        prompt: data.prompt,
        n: 1,
        size: data.size || '1024x1024',
        response_format: 'b64_json'
      })
    });

    const result = await response.json();
    
    return NextResponse.json({
      success: true,
      images: [{
        url: `data:image/png;base64,${result.data[0].b64_json}`
      }]
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: '图像生成失败', details: error.message },
      { status: 500 }
    );
  }
}
```

#### 4.2 移除状态查询API
```bash
# 删除不需要的文件
rm -rf src/app/api/images/status
rm -rf src/app/api/video/status
```

### Phase 5: 前端简化 (半天)

#### 5.1 移除异步逻辑
```typescript
// 移除轮询状态的代码
// 移除任务ID管理
// 恢复简单的loading状态
// 移除进度显示组件
```

#### 5.2 恢复简单用户体验
```typescript
const handleGenerate = async () => {
  setIsLoading(true);
  try {
    const response = await fetch('/api/images/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    
    const data = await response.json();
    if (data.success) {
      setImages(data.images);
    }
  } catch (error) {
    toast.error('生成失败');
  } finally {
    setIsLoading(false);
  }
};
```

### Phase 6: 监控和优化 (半天)

#### 6.1 监控配置
```bash
# PM2监控
pm2 monit

# Nginx日志
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# 应用日志
pm2 logs ai-platform
```

#### 6.2 性能优化
```bash
# Nginx配置优化
# 启用gzip压缩
# 配置缓存策略
# 设置连接池
```

## 🎯 迁移时间表

| 阶段 | 时间 | 任务 |
|------|------|------|
| Day 1 上午 | 4小时 | 腾讯云基础设施搭建 |
| Day 1 下午 | 4小时 | 应用代码适配和部署 |
| Day 2 上午 | 2小时 | 数据库清理和API重构 |
| Day 2 下午 | 2小时 | 前端简化和测试 |

**总计：12小时 (1.5天)**

## ✅ 成功标准

1. **功能完整性**：所有AI生成功能正常工作
2. **性能提升**：无超时限制，响应时间可控
3. **架构简化**：代码复杂度降低80%
4. **调试友好**：问题定位时间缩短90%
5. **成本优化**：运营成本降低50%

## 🚀 立即行动

1. **创建腾讯云CVM实例**
2. **配置基础环境**
3. **开始代码简化**
4. **逐步迁移测试**

---

**结论：彻底抛弃复杂的混合架构，拥抱简单可靠的统一平台方案！** 