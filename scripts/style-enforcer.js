#!/usr/bin/env node

/**
 * 🔒 样式强制执行器
 * 自动检测和修正违规的硬编码样式
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// 🚫 违规模式检测
const VIOLATION_PATTERNS = [
  // 硬编码颜色
  {
    pattern: /\b(text-|bg-|border-)(red|blue|green|yellow|purple|pink|indigo|gray|slate|zinc|neutral|stone|orange|amber|lime|emerald|teal|cyan|sky|violet|fuchsia|rose)-\d+/g,
    message: '❌ 硬编码颜色',
    fix: (match) => {
      // 智能映射到语义化颜色
      const colorMap = {
        'red': 'destructive',
        'blue': 'primary', 
        'green': 'success',
        'yellow': 'warning',
        'gray': 'muted',
        'slate': 'muted'
      }
      const [prefix, color] = match.split('-')
      return `${prefix}-${colorMap[color] || 'primary'}`
    }
  },
  
  // 任意值间距
  {
    pattern: /\b(p|m|gap|space-[xy]?)-\[[^\]]+\]/g,
    message: '❌ 任意间距值',
    fix: () => 'p-4' // 默认修正为标准间距
  },
  
  // 任意字体大小
  {
    pattern: /\btext-\[[^\]]+\]/g,
    message: '❌ 任意字体大小',
    fix: () => 'text-base'
  },
  
  // 任意颜色值
  {
    pattern: /\b(text-|bg-|border-)\[#[a-fA-F0-9]{3,6}\]/g,
    message: '❌ 任意颜色值',
    fix: () => 'text-foreground'
  }
]

// 📁 扫描目录
const SCAN_DIRECTORIES = [
  'src/components',
  'src/app',
  'src/pages'
]

// 🔍 扫描文件
function scanFiles() {
  const violations = []
  
  SCAN_DIRECTORIES.forEach(dir => {
    if (!fs.existsSync(dir)) return
    
    const files = execSync(`find ${dir} -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js"`)
      .toString()
      .split('\n')
      .filter(Boolean)
    
    files.forEach(file => {
      try {
        const content = fs.readFileSync(file, 'utf8')
        checkFileViolations(file, content, violations)
      } catch (err) {
        console.warn(`⚠️ 无法读取文件: ${file}`)
      }
    })
  })
  
  return violations
}

// 🔍 检查文件违规
function checkFileViolations(filePath, content, violations) {
  const lines = content.split('\n')
  
  lines.forEach((line, index) => {
    VIOLATION_PATTERNS.forEach(({ pattern, message, fix }) => {
      const matches = line.match(pattern)
      if (matches) {
        violations.push({
          file: filePath,
          line: index + 1,
          content: line.trim(),
          matches,
          message,
          fix
        })
      }
    })
  })
}

// 🔧 自动修复
function autoFix(violations) {
  const fileChanges = new Map()
  
  violations.forEach(violation => {
    if (!fileChanges.has(violation.file)) {
      fileChanges.set(violation.file, fs.readFileSync(violation.file, 'utf8'))
    }
    
    let content = fileChanges.get(violation.file)
    violation.matches.forEach(match => {
      const fixed = violation.fix(match)
      content = content.replace(match, fixed)
    })
    fileChanges.set(violation.file, content)
  })
  
  // 写回文件
  fileChanges.forEach((content, file) => {
    fs.writeFileSync(file, content, 'utf8')
    console.log(`✅ 修复文件: ${file}`)
  })
}

// 📊 生成报告
function generateReport(violations) {
  if (violations.length === 0) {
    console.log('🎉 恭喜！没有发现样式违规问题！')
    return
  }
  
  const groupedViolations = violations.reduce((acc, v) => {
    if (!acc[v.file]) acc[v.file] = []
    acc[v.file].push(v)
    return acc
  }, {})
  
  console.log(`\n🚨 发现 ${violations.length} 个样式违规问题：\n`)
  
  Object.entries(groupedViolations).forEach(([file, fileViolations]) => {
    console.log(`📁 ${file}`)
    fileViolations.forEach(v => {
      console.log(`   ${v.message} (第${v.line}行)`)
      console.log(`   ${v.content}`)
      console.log(`   违规: ${v.matches.join(', ')}\n`)
    })
  })
}

// 🎯 主函数
function main() {
  const args = process.argv.slice(2)
  const shouldFix = args.includes('--fix')
  
  console.log('🔍 开始扫描样式违规...')
  
  const violations = scanFiles()
  generateReport(violations)
  
  if (shouldFix && violations.length > 0) {
    console.log('\n🔧 开始自动修复...')
    autoFix(violations)
    console.log('\n✅ 修复完成！请检查修改内容。')
  } else if (violations.length > 0) {
    console.log('\n💡 运行 `node scripts/style-enforcer.js --fix` 自动修复违规问题')
  }
}

// 🚀 启动
if (require.main === module) {
  main()
}

module.exports = { scanFiles, autoFix, generateReport } 