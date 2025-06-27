#!/usr/bin/env node

/**
 * 样式一致性检查脚本 v2.0
 * 🎯 专注检测真正的样式问题，避免误判
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// 配置
const CONFIG = {
  srcDir: 'src',
  excludeFiles: ['node_modules', '.next', 'dist'],
  fileExtensions: ['.tsx', '.jsx', '.ts', '.js'],
};

// 问题类型
const ISSUE_TYPES = {
  INLINE_STYLE: 'inline-style',
  HARDCODED_COLOR: 'hardcoded-color',
  ARBITRARY_COLOR: 'arbitrary-color-values',
  NON_STANDARD_SPACING: 'non-standard-spacing',
  MISSING_COMPONENT: 'missing-component',
  DIRECT_CSS_CLASSES: 'direct-css-classes',
  ARBITRARY_VALUES: 'arbitrary-values',
  OUT_OF_RANGE: 'out-of-range',
};

// 检查规则
const RULES = {
  // 🚫 检查内联样式
  checkInlineStyles: (content, filePath) => {
    // 过滤掉 CSS 变量的合法使用
    const regex = /style\s*=\s*\{\{?[^}]*(?:color\s*:\s*['"`][^'"`]*['"`]|background\s*:\s*['"`][^'"`]*['"`]|width\s*:\s*\d+px|height\s*:\s*\d+px)[^}]*\}?\}/g;
    const matches = content.match(regex);
    if (matches) {
      return matches.map(match => ({
        type: ISSUE_TYPES.INLINE_STYLE,
        message: `发现内联样式: ${match.slice(0, 50)}...`,
        file: filePath,
        suggestion: '请使用Tailwind类名或组件库',
        severity: 'high'
      }));
    }
    return [];
  },

  // 🚫 检查硬编码颜色
  checkHardcodedColors: (content, filePath) => {
    // 检查非设计token的颜色
    const colorRegex = /(bg-|text-|border-)(red|blue|green|yellow|purple|pink|indigo|orange|cyan|lime|emerald|teal|sky|violet|fuchsia|rose)-(\d{2,3})/g;
    const matches = [...content.matchAll(colorRegex)];
    if (matches.length > 0) {
      return matches.map(match => ({
        type: ISSUE_TYPES.HARDCODED_COLOR,
        message: `发现硬编码颜色: ${match[0]}`,
        file: filePath,
        suggestion: '请使用设计token: bg-primary, text-muted, border-accent 等',
        severity: 'high'
      }));
    }
    return [];
  },

  // 🚫 检查任意颜色值
  checkArbitraryColors: (content, filePath) => {
    // 只检查颜色相关的任意值
    const arbitraryColorRegex = /(bg-|text-|border-)\[#[0-9a-fA-F]{3,6}\]/g;
    const matches = content.match(arbitraryColorRegex);
    if (matches) {
      return matches.map(match => ({
        type: ISSUE_TYPES.ARBITRARY_COLOR,
        message: `发现任意颜色值: ${match}`,
        file: filePath,
        suggestion: '请使用设计token或将颜色添加到配置中',
        severity: 'medium'
      }));
    }
    return [];
  },

  // 🚫 检查任意值语法（禁用所有[]语法）
  checkArbitraryValues: (content, filePath) => {
    const issues = [];
    
    // 检查任意字体大小
    const fontSizeRegex = /text-\[[\d.]+(?:px|rem|em)\]/g;
    const fontMatches = content.match(fontSizeRegex);
    if (fontMatches) {
      issues.push(...fontMatches.map(match => ({
        type: ISSUE_TYPES.ARBITRARY_VALUES,
        message: `发现任意字体大小: ${match}`,
        file: filePath,
        suggestion: '请使用预设字体大小: text-xs, text-sm, text-base, text-lg, text-xl, text-2xl等',
        severity: 'high'
      })));
    }

    // 检查任意间距/尺寸
    const spacingRegex = /(p|m|w|h|gap|space)-\[[\d.]+(?:px|rem|em|%)\]/g;
    const spacingMatches = content.match(spacingRegex);
    if (spacingMatches) {
      issues.push(...spacingMatches.map(match => ({
        type: ISSUE_TYPES.ARBITRARY_VALUES,
        message: `发现任意尺寸/间距: ${match}`,
        file: filePath,
        suggestion: '请使用预设间距: 0,1,2,3,4,5,6,8,10,12,16,20,24,32等',
        severity: 'high'
      })));
    }

    // 检查任意圆角
    const radiusRegex = /rounded-\[[\d.]+(?:px|rem|em)\]/g;
    const radiusMatches = content.match(radiusRegex);
    if (radiusMatches) {
      issues.push(...radiusMatches.map(match => ({
        type: ISSUE_TYPES.ARBITRARY_VALUES,
        message: `发现任意圆角: ${match}`,
        file: filePath,
        suggestion: '请使用预设圆角: rounded-none, rounded-sm, rounded, rounded-md, rounded-lg, rounded-xl, rounded-full',
        severity: 'high'
      })));
    }

    return issues;
  },

  // 🚫 检查超出范围的预设值
  checkOutOfRangeValues: (content, filePath) => {
    const issues = [];
    
    // 检查超出范围的字体大小
    const largeFontRegex = /text-(5xl|6xl|7xl|8xl|9xl)/g;
    const largeFontMatches = content.match(largeFontRegex);
    if (largeFontMatches) {
      issues.push(...largeFontMatches.map(match => ({
        type: ISSUE_TYPES.OUT_OF_RANGE,
        message: `发现超出范围的字体大小: ${match}`,
        file: filePath,
        suggestion: '最大字体大小为text-4xl，请检查设计规范',
        severity: 'medium'
      })));
    }

    // 检查超出范围的间距
    const largeSpacingRegex = /(p|m|gap|space)-(40|44|48|52|56|60|64|72|80|96)/g;
    const largeSpacingMatches = content.match(largeSpacingRegex);
    if (largeSpacingMatches) {
      issues.push(...largeSpacingMatches.map(match => ({
        type: ISSUE_TYPES.OUT_OF_RANGE,
        message: `发现超出范围的间距: ${match}`,
        file: filePath,
        suggestion: '最大间距为32，请检查设计规范或使用布局组件',
        severity: 'medium'
      })));
    }

    return issues;
  },

  // 🚫 检查非标准间距
  checkNonStandardSpacing: (content, filePath) => {
    // 检查超出标准范围的间距
    const spacingRegex = /(p|m|gap)-([1-9]\d{2,})/g; // 100以上的数值
    const matches = content.match(spacingRegex);
    if (matches) {
      return matches.map(match => ({
        type: ISSUE_TYPES.NON_STANDARD_SPACING,
        message: `发现非标准间距: ${match}`,
        file: filePath,
        suggestion: '请使用标准间距: 1,2,3,4,5,6,8,10,12,16,20,24,32等',
        severity: 'medium'
      }));
    }
    return [];
  },

  // 🔍 检查是否应该使用组件
  checkMissingComponents: (content, filePath) => {
    const issues = [];
    
    // 检查按钮模式 - 排除UI组件文件自身
    if (content.includes('<button') && !filePath.includes('components/ui/') && !content.includes('import { Button }')) {
      const buttonWithClassRegex = /<button[^>]*className\s*=\s*["'][^"']*["'][^>]*>/g;
      const matches = content.match(buttonWithClassRegex);
      if (matches) {
        issues.push({
          type: ISSUE_TYPES.MISSING_COMPONENT,
          message: '发现原生button使用className，应该使用Button组件',
          file: filePath,
          suggestion: 'import { Button } from "@/components/ui/button"',
          severity: 'low'
        });
      }
    }

    // 检查输入框模式
    if (content.includes('<input') && !filePath.includes('components/ui/') && !content.includes('import { Input }')) {
      const inputWithClassRegex = /<input[^>]*className\s*=\s*["'][^"']*["'][^>]*>/g;
      const matches = content.match(inputWithClassRegex);
      if (matches) {
        issues.push({
          type: ISSUE_TYPES.MISSING_COMPONENT,
          message: '发现原生input使用className，应该使用Input组件',
          file: filePath,
          suggestion: 'import { Input } from "@/components/ui/input"',
          severity: 'low'
        });
      }
    }

    return issues;
  },

  // 🚫 检查直接使用CSS类名的情况
  checkDirectCSSClasses: (content, filePath) => {
    // 排除UI组件文件
    if (filePath.includes('components/ui/')) return [];
    
    const issues = [];
    
    // 检查复杂的直接className使用
    const complexClassRegex = /className\s*=\s*["']([^"']*(?:flex|grid|absolute|fixed|relative)[^"']{20,})["']/g;
    const matches = [...content.matchAll(complexClassRegex)];
    
    if (matches.length > 2) { // 超过2个复杂className的使用
      issues.push({
        type: ISSUE_TYPES.DIRECT_CSS_CLASSES,
        message: `发现过多复杂className使用 (${matches.length}处)`,
        file: filePath,
        suggestion: '考虑抽取为可复用组件或使用设计系统',
        severity: 'low'
      });
    }
    
    return issues;
  },
};

// 主检查函数
function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const issues = [];

  // 运行所有规则
  Object.values(RULES).forEach(rule => {
    issues.push(...rule(content, filePath));
  });

  return issues;
}

// 获取所有需要检查的文件
function getFilesToCheck() {
  const patterns = [
    'src/**/*.{ts,tsx,js,jsx}',
    '*.{ts,tsx,js,jsx}', // 🔧 添加根目录扫描
  ];
  
  let files = [];
  patterns.forEach(pattern => {
    files.push(...glob.sync(pattern));
  });

  // 过滤排除的文件
  files = files.filter(file => 
    !CONFIG.excludeFiles.some(exclude => file.includes(exclude))
  );

  return files;
}

// 生成报告
function generateReport(allIssues) {
  console.log('\n🎨 样式一致性检查报告 v2.0');
  console.log('='.repeat(50));

  if (allIssues.length === 0) {
    console.log('✅ 没有发现重要的样式问题！');
    console.log('💡 你的项目样式管理相当不错！');
    return;
  }

  // 按严重程度和类型分组
  const issuesByType = {};
  const issuesBySeverity = { high: [], medium: [], low: [] };
  
  allIssues.forEach(issue => {
    if (!issuesByType[issue.type]) {
      issuesByType[issue.type] = [];
    }
    issuesByType[issue.type].push(issue);
    issuesBySeverity[issue.severity].push(issue);
  });

  // 输出统计
  console.log(`❌ 总共发现 ${allIssues.length} 个样式问题:\n`);

  // 按严重程度展示
  console.log('📊 按严重程度分布:');
  console.log(`🔴 高优先级: ${issuesBySeverity.high.length} 个`);
  console.log(`🟡 中优先级: ${issuesBySeverity.medium.length} 个`);
  console.log(`🟢 低优先级: ${issuesBySeverity.low.length} 个\n`);

  // 展示高优先级问题
  if (issuesBySeverity.high.length > 0) {
    console.log('🔴 高优先级问题（需要立即修复）:');
    issuesBySeverity.high.forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue.file}`);
      console.log(`      问题: ${issue.message}`);
      console.log(`      建议: ${issue.suggestion}\n`);
    });
  }

  // 展示中优先级问题摘要
  if (issuesBySeverity.medium.length > 0) {
    console.log('🟡 中优先级问题摘要:');
    Object.entries(issuesByType).forEach(([type, issues]) => {
      const mediumIssues = issues.filter(i => i.severity === 'medium');
      if (mediumIssues.length > 0) {
        console.log(`   ${type}: ${mediumIssues.length} 个问题`);
      }
    });
    console.log('');
  }

  // 修复建议
  console.log('🎯 修复优先级建议:');
  if (issuesBySeverity.high.length > 0) {
    console.log('1. 🔴 立即修复: 内联样式和硬编码颜色');
  }
  if (issuesBySeverity.medium.length > 0) {
    console.log('2. 🟡 计划修复: 任意颜色值和非标准间距');
  }
  if (issuesBySeverity.low.length > 0) {
    console.log('3. 🟢 逐步优化: 组件抽取和重构');
  }
  console.log('4. 📋 建立: code review检查清单');
  console.log('5. 🤖 设置: pre-commit hook自动检查\n');

  // 给出具体的下一步建议
  console.log('🚀 建议立即执行:');
  console.log('npm run check-styles # 定期检查');
  console.log('npm run precommit   # 提交前检查');
  console.log('');
}

// 主执行函数
function main() {
  console.log('🔍 开始样式一致性检查...');
  
  const files = getFilesToCheck();
  console.log(`📁 扫描 ${files.length} 个文件`);

  const allIssues = [];
  let checkedCount = 0;

  files.forEach(file => {
    const issues = checkFile(file);
    allIssues.push(...issues);
    checkedCount++;
    
    // 显示进度
    if (checkedCount % 20 === 0) {
      console.log(`⏳ 已检查 ${checkedCount}/${files.length} 个文件...`);
    }
  });

  generateReport(allIssues);
  
  // 只有高优先级问题才返回错误码
  const highPriorityIssues = allIssues.filter(issue => issue.severity === 'high');
  if (highPriorityIssues.length > 0) {
    console.log(`💥 发现 ${highPriorityIssues.length} 个高优先级问题，请修复后再提交`);
    process.exit(1);
  } else {
    console.log('✨ 没有发现高优先级样式问题，可以提交！');
    process.exit(0);
  }
}

// 确保在项目根目录运行
if (!fs.existsSync('package.json')) {
  console.error('❌ 请在项目根目录运行此脚本');
  process.exit(1);
}

main(); 