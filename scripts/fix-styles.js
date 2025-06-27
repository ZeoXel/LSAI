#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// 任意值修复映射
const ARBITRARY_FIXES = {
  // 字体大小修复
  'text-[8px]': 'text-xs',
  'text-[10px]': 'text-xs', 
  'text-[12px]': 'text-sm',
  'text-[14px]': 'text-sm',
  'text-[16px]': 'text-base',
  'text-[18px]': 'text-lg',
  'text-[20px]': 'text-xl',
  'text-[24px]': 'text-2xl',
  'text-[30px]': 'text-3xl',
  'text-[36px]': 'text-4xl',

  // 圆角修复
  'rounded-[2px]': 'rounded-sm',
  'rounded-[4px]': 'rounded',
  'rounded-[6px]': 'rounded-md',
  'rounded-[8px]': 'rounded-lg',
  'rounded-[12px]': 'rounded-xl',

  // 宽度修复 - 百分比转flex
  'w-[70%]': 'w-3/4', // 近似70%
  'w-[60%]': 'w-3/5',
  'w-[50%]': 'w-1/2',
  'w-[80%]': 'w-4/5',
  'w-[90%]': 'w-[90%]', // 暂时保留，需要评估

  // 高度修复
  'h-[60px]': 'h-16', // 64px，接近60px
  'h-[120px]': 'h-32', // 128px，接近120px
  'h-[100px]': 'h-24', // 96px，接近100px
  'h-[80px]': 'h-20', // 80px，完全匹配

  // 间距修复
  'w-[2px]': 'w-0.5', // 2px = 0.125rem
  'p-[1px]': 'p-px', // 1px
  'm-[2px]': 'm-0.5',
  'px-[4px]': 'px-1',
  'py-[8px]': 'py-2',
  'px-[16px]': 'px-4',
  'py-[12px]': 'py-3',

  // 特殊百分比间距需要转换为flex或其他方案
  'p-[60%]': 'p-24', // 临时方案，需要具体查看使用场景
};

// 颜色映射（从fix-colors.js复制）
const COLOR_MAPPINGS = {
  // 蓝色系 → info
  'text-blue-500': 'text-info',
  'text-blue-600': 'text-info',
  'text-blue-400': 'text-info',
  'text-blue-700': 'text-info',
  'text-blue-300': 'text-info',
  'bg-blue-50': 'bg-info/10',
  'bg-blue-100': 'bg-info/20',
  'bg-blue-500': 'bg-info',
  'bg-blue-950': 'bg-info',
  'border-blue-200': 'border-info/30',
  'border-blue-300': 'border-info/40',
  'border-blue-800': 'border-info',

  // 绿色系 → success
  'text-green-500': 'text-success',
  'text-green-600': 'text-success',
  'text-green-400': 'text-success',
  'bg-green-50': 'bg-success/10',
  'bg-green-950': 'bg-success',
  'border-green-200': 'border-success/30',
  'border-green-800': 'border-success',

  // 红色系 → error
  'text-red-500': 'text-error',
  'text-red-600': 'text-error',
  'text-red-400': 'text-error',
  'bg-red-50': 'bg-error/10',
  'bg-red-950': 'bg-error',
  'border-red-200': 'border-error/30',
  'border-red-800': 'border-error',

  // 橙色系 → warning
  'text-orange-500': 'text-warning',
  'text-orange-600': 'text-warning',
  'text-orange-400': 'text-warning',
  'bg-orange-50': 'bg-warning/10',
  'bg-orange-950': 'bg-warning',
  'border-orange-200': 'border-warning/30',
  'border-orange-800': 'border-warning',

  // 紫色系 → accent
  'text-purple-500': 'text-accent',
  'text-purple-600': 'text-accent',
  'text-purple-400': 'text-accent',
  'bg-purple-50': 'bg-accent/10',
  'bg-purple-950': 'bg-accent',
  'border-purple-200': 'border-accent/30',
  'border-purple-800': 'border-accent',
};

function fixStylesInFile(filePath, dryRun = false) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    const changes = [];

    // 1. 修复任意值语法
    for (const [oldValue, newValue] of Object.entries(ARBITRARY_FIXES)) {
      const regex = new RegExp(`\\b${oldValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
      if (regex.test(content)) {
        if (!dryRun) {
          content = content.replace(regex, newValue);
        }
        changes.push(`${oldValue} → ${newValue}`);
        modified = true;
      }
    }

    // 2. 修复颜色映射
    for (const [oldColor, newColor] of Object.entries(COLOR_MAPPINGS)) {
      const regex = new RegExp(`\\b${oldColor}\\b`, 'g');
      if (regex.test(content)) {
        if (!dryRun) {
          content = content.replace(regex, newColor);
        }
        changes.push(`${oldColor} → ${newColor}`);
        modified = true;
      }
    }

    if (modified && !dryRun) {
      fs.writeFileSync(filePath, content, 'utf8');
    }

    return { modified, changes };
  } catch (error) {
    console.error(`❌ 处理文件 ${filePath} 时出错:`, error.message);
    return { modified: false, changes: [] };
  }
}

function main() {
  console.log('🎨 开始全面样式修复...\n');

  // 查找需要处理的文件
  const patterns = [
    'src/**/*.{ts,tsx,js,jsx}',
    '!src/**/*.d.ts',
    '!node_modules/**',
  ];

  let allFiles = [];
  patterns.forEach(pattern => {
    if (pattern.startsWith('!')) {
      return;
    }
    const files = glob.sync(pattern, { 
      cwd: process.cwd(),
      absolute: true,
      ignore: ['node_modules/**', '**/*.d.ts']
    });
    allFiles = allFiles.concat(files);
  });

  // 去重
  allFiles = [...new Set(allFiles)];

  console.log(`📁 找到 ${allFiles.length} 个文件需要检查\n`);

  let totalModified = 0;
  let totalChanges = 0;

  allFiles.forEach(filePath => {
    const { modified, changes } = fixStylesInFile(filePath);
    
    if (modified) {
      totalModified++;
      totalChanges += changes.length;
      
      const relativePath = path.relative(process.cwd(), filePath);
      console.log(`✅ ${relativePath}`);
      changes.forEach(change => {
        console.log(`   ${change}`);
      });
      console.log('');
    }
  });

  console.log('='.repeat(50));
  console.log(`🎯 修复完成！`);
  console.log(`📊 统计信息:`);
  console.log(`   - 修改文件: ${totalModified} 个`);
  console.log(`   - 总计替换: ${totalChanges} 处`);
  console.log('');
  console.log('💡 建议下一步:');
  console.log('   1. 运行 npm run check-styles 验证修复效果');
  console.log('   2. 测试应用功能是否正常');
  console.log('   3. 手动调整无法自动修复的复杂样式');
}

// 检查是否安装了 glob
try {
  require.resolve('glob');
} catch (e) {
  console.error('❌ 缺少依赖 glob，请先安装: npm install glob');
  process.exit(1);
}

if (require.main === module) {
  main();
}

module.exports = { fixStylesInFile, ARBITRARY_FIXES, COLOR_MAPPINGS }; 