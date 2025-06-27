#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🤖 启动 Cursor Background Agents...\n');

// 检查Cursor配置
const cursorDir = path.join(process.cwd(), '.cursor');
const agentsConfig = path.join(cursorDir, 'agents.json');

if (!fs.existsSync(cursorDir)) {
  fs.mkdirSync(cursorDir, { recursive: true });
  console.log('✅ 创建 .cursor 目录');
}

if (fs.existsSync(agentsConfig)) {
  console.log('✅ Background Agents 配置已存在');
  
  try {
    const config = JSON.parse(fs.readFileSync(agentsConfig, 'utf8'));
    console.log(`📊 已配置 ${config.agents.length} 个代理:`);
    
    config.agents.forEach((agent, index) => {
      console.log(`   ${index + 1}. ${agent.name} - ${agent.description}`);
    });
    
    console.log('\n🎯 代理功能说明:');
    console.log('   • style-enforcer: 自动检查和修复样式规范问题');
    console.log('   • typescript-monitor: 实时监控TypeScript类型错误');
    console.log('   • dependency-guardian: 定期检查依赖安全性');
    console.log('   • build-validator: 验证构建配置和性能');
    console.log('   • api-monitor: 监控API端点健康状况');
    
    console.log('\n🚀 使用方法:');
    console.log('   1. 在 Cursor 中按 Ctrl/Cmd + Shift + P');
    console.log('   2. 搜索 "Background Agents"');
    console.log('   3. 选择 "Enable Background Agents"');
    console.log('   4. 代理将自动开始工作');
    
    console.log('\n📋 手动触发命令:');
    console.log('   • bun run check-styles  # 检查样式规范');
    console.log('   • bun run fix-styles    # 自动修复样式');
    console.log('   • bun run lint          # TypeScript检查');
    console.log('   • bun run build         # 构建验证');
    
  } catch (error) {
    console.error('❌ 配置文件格式错误:', error.message);
  }
} else {
  console.log('❌ Background Agents 配置文件不存在');
  console.log('请先运行项目初始化来创建配置文件');
}

console.log('\n💡 提示: 代理将在以下情况自动运行:');
console.log('   • 文件保存时 (样式检查、类型检查)');
console.log('   • Git提交前 (完整质量检查)');
console.log('   • 配置文件变更时 (构建验证)');
console.log('   • 定期调度 (依赖检查、API监控)');

console.log('\n🎉 Background Agents 设置完成！'); 