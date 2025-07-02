/**
 * 工作流模板配置
 */

import { WorkflowTemplate } from './workflow-types';

// 工作流模板配置
export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'article-writer',
    name: '文章写作助手',
    description: '智能辅助文章创作，从主题到成稿一站式服务',
    icon: '📝',
    category: '内容创作',
    estimatedTime: '5-10分钟',
    tags: ['写作', '内容创作', '文章'],
    steps: [
      {
        id: 'topic',
        name: '文章主题',
        description: '请输入您要写作的文章主题',
        inputType: 'text',
        required: true,
        prompt: '请输入您要写作的文章主题，我将为您创作一篇高质量的文章。',
        placeholder: '例如：人工智能的发展趋势',
        validation: {
          minLength: 3,
          maxLength: 100
        }
      },
      {
        id: 'audience',
        name: '目标受众',
        description: '选择文章的目标受众',
        inputType: 'selection',
        required: true,
        prompt: '请选择这篇文章的目标受众，这将帮助我调整写作风格和深度。',
        options: ['通用读者', '专业人士', '学生群体', '企业决策者']
      },
      {
        id: 'length',
        name: '文章长度',
        description: '选择期望的文章长度',
        inputType: 'selection',
        required: true,
        prompt: '请选择您期望的文章长度：',
        options: ['短文 (800字)', '中文 (1500字)', '长文 (3000字)']
      },
      {
        id: 'requirements',
        name: '特殊要求',
        description: '补充任何特殊要求或重点内容',
        inputType: 'multitext',
        required: false,
        prompt: '是否有特殊要求或希望重点阐述的内容？（可选）',
        placeholder: '例如：请重点分析技术发展的挑战和机遇...'
      }
    ]
  },
  {
    id: 'image-analyzer',
    name: '图片分析助手',
    description: '深度分析图片内容，提供专业的解读报告',
    icon: '🔍',
    category: '图像处理',
    estimatedTime: '3-5分钟',
    tags: ['图片分析', '内容识别', '报告生成'],
    steps: [
      {
        id: 'image',
        name: '上传图片',
        description: '上传需要分析的图片文件',
        inputType: 'image',
        required: true,
        prompt: '请上传您需要分析的图片。支持 JPG、PNG、GIF 格式，最大 10MB。',
        placeholder: '拖拽图片到此处或点击上传'
      },
      {
        id: 'analysis-type',
        name: '分析类型',
        description: '选择分析的重点方向',
        inputType: 'selection',
        required: true,
        prompt: '请选择您希望重点分析的方向：',
        options: ['内容描述', '技术参数', '情感分析', '商业价值', '艺术赏析']
      },
      {
        id: 'specific-needs',
        name: '具体需求',
        description: '描述具体的分析需求',
        inputType: 'text',
        required: false,
        prompt: '请描述您的具体分析需求，我将为您提供更精准的分析。（可选）',
        placeholder: '例如：请重点分析图片中的人物表情和场景氛围...'
      }
    ]
  },
  {
    id: 'code-reviewer',
    name: '代码审查助手',
    description: '专业的代码质量审查和优化建议',
    icon: '💻',
    category: '开发工具',
    estimatedTime: '3-8分钟',
    tags: ['代码审查', '质量提升', '最佳实践'],
    steps: [
      {
        id: 'code',
        name: '代码输入',
        description: '粘贴需要审查的代码',
        inputType: 'multitext',
        required: true,
        prompt: '请粘贴您需要审查的代码。我将从多个维度为您提供专业的审查意见。',
        placeholder: '在此粘贴您的代码...',
        validation: {
          minLength: 10,
          maxLength: 10000
        }
      },
      {
        id: 'language',
        name: '编程语言',
        description: '选择代码使用的编程语言',
        inputType: 'selection',
        required: true,
        prompt: '请选择代码使用的编程语言：',
        options: ['JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'Go', 'Rust', '其他']
      },
      {
        id: 'focus',
        name: '审查重点',
        description: '选择审查的重点方向',
        inputType: 'selection',
        required: true,
        prompt: '请选择您希望重点关注的审查方向：',
        options: ['性能优化', '安全性检查', '可维护性', '最佳实践', '全面审查']
      }
    ]
  },
  {
    id: 'business-plan',
    name: '商业计划助手',
    description: '协助制定完整的商业计划书',
    icon: '📊',
    category: '商业策划',
    estimatedTime: '10-15分钟',
    tags: ['商业计划', '创业', '策划'],
    steps: [
      {
        id: 'business-idea',
        name: '商业想法',
        description: '描述您的核心商业想法',
        inputType: 'text',
        required: true,
        prompt: '请简要描述您的核心商业想法或产品概念。',
        placeholder: '例如：基于AI的个性化学习平台...',
        validation: {
          minLength: 10,
          maxLength: 300
        }
      },
      {
        id: 'target-market',
        name: '目标市场',
        description: '定义您的目标市场和客户群体',
        inputType: 'text',
        required: true,
        prompt: '请描述您的目标市场和主要客户群体。',
        placeholder: '例如：18-35岁的职场人士，特别是IT从业者...'
      },
      {
        id: 'competition',
        name: '竞争分析',
        description: '分析主要竞争对手',
        inputType: 'text',
        required: false,
        prompt: '请列举您了解的主要竞争对手或类似产品。（可选）',
        placeholder: '例如：竞争对手包括XX公司的XX产品...'
      },
      {
        id: 'funding-stage',
        name: '融资阶段',
        description: '选择当前的融资需求阶段',
        inputType: 'selection',
        required: true,
        prompt: '请选择您当前的融资需求阶段：',
        options: ['种子轮', '天使轮', 'A轮', 'B轮及以后', '暂不需要融资']
      }
    ]
  }
];

// 根据ID获取工作流模板
export function getWorkflowTemplate(id: string): WorkflowTemplate | undefined {
  return WORKFLOW_TEMPLATES.find(template => template.id === id);
}

// 根据分类获取工作流模板
export function getWorkflowTemplatesByCategory(category: string): WorkflowTemplate[] {
  return WORKFLOW_TEMPLATES.filter(template => template.category === category);
}

// 获取所有工作流分类
export function getWorkflowCategories(): string[] {
  const categories = new Set(WORKFLOW_TEMPLATES.map(template => template.category));
  return Array.from(categories);
}

// 搜索工作流模板
export function searchWorkflowTemplates(query: string): WorkflowTemplate[] {
  const lowerQuery = query.toLowerCase();
  return WORKFLOW_TEMPLATES.filter(template => 
    template.name.toLowerCase().includes(lowerQuery) ||
    template.description.toLowerCase().includes(lowerQuery) ||
    template.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
} 