#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// 颜色映射规则
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

function fixColorsInFile(filePath, dryRun = false) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    const changes = [];

    // 应用颜色映射
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
  console.log('🎨 开始批量修复硬编码颜色...\n');

  // 查找需要处理的文件
  const patterns = [
    'src/**/*.{ts,tsx,js,jsx}',
    '!src/**/*.d.ts',
    '!node_modules/**',
  ];

  let allFiles = [];
  patterns.forEach(pattern => {
    if (pattern.startsWith('!')) {
      // 排除模式暂时跳过，glob 会自动处理
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
    const { modified, changes } = fixColorsInFile(filePath);
    
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
  console.log('   3. 提交代码变更');
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

module.exports = { fixColorsInFile, COLOR_MAPPINGS }; 