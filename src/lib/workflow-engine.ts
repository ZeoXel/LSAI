/**
 * 工作流执行引擎
 */

import { 
  WorkflowTemplate, 
  WorkflowExecution, 
  WorkflowStep, 
  WorkflowStepInput, 
  WorkflowStatus, 
  WorkflowResult 
} from './workflow-types';
import { getWorkflowTemplate } from './workflow-templates';
import { ChatMessage } from './types';

// 工作流执行引擎类
export class WorkflowEngine {
  private executions: Map<string, WorkflowExecution> = new Map();

  // 创建新的工作流执行实例
  createExecution(templateId: string, conversationId?: string): WorkflowExecution | null {
    const template = getWorkflowTemplate(templateId);
    if (!template) {
      console.error('工作流模板不存在:', templateId);
      return null;
    }

    const execution: WorkflowExecution = {
      id: this.generateId(),
      templateId: template.id,
      templateName: template.name,
      status: 'initializing',
      currentStep: 0,
      totalSteps: template.steps.length,
      stepInputs: [],
      startedAt: Date.now(),
      metadata: {
        conversationId
      }
    };

    this.executions.set(execution.id, execution);
    return execution;
  }

  // 开始工作流执行
  startExecution(executionId: string): WorkflowExecution | null {
    const execution = this.executions.get(executionId);
    if (!execution) return null;

    execution.status = 'waiting_input';
    return execution;
  }

  // 获取当前步骤
  getCurrentStep(executionId: string): WorkflowStep | null {
    const execution = this.executions.get(executionId);
    if (!execution) return null;

    const template = getWorkflowTemplate(execution.templateId);
    if (!template) return null;

    if (execution.currentStep >= template.steps.length) return null;

    return template.steps[execution.currentStep];
  }

  // 提交步骤输入
  submitStepInput(executionId: string, value: any): WorkflowExecution | null {
    const execution = this.executions.get(executionId);
    if (!execution) return null;

    const currentStep = this.getCurrentStep(executionId);
    if (!currentStep) return null;

    // 验证输入
    const validationResult = this.validateInput(currentStep, value);
    if (!validationResult.valid) {
      throw new Error(validationResult.error || '输入验证失败');
    }

    // 保存步骤输入
    const stepInput: WorkflowStepInput = {
      stepId: currentStep.id,
      value,
      timestamp: Date.now(),
      type: currentStep.inputType
    };

    execution.stepInputs.push(stepInput);

    // 移动到下一步
    execution.currentStep++;

    // 检查是否完成所有步骤
    if (execution.currentStep >= execution.totalSteps) {
      execution.status = 'processing';
      // 异步执行工作流
      setTimeout(() => this.executeWorkflow(executionId), 1000);
    } else {
      execution.status = 'waiting_input';
    }

    return execution;
  }

  // 验证步骤输入
  private validateInput(step: WorkflowStep, value: any): { valid: boolean; error?: string } {
    if (step.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      return { valid: false, error: '此字段为必填项' };
    }

    if (step.validation && typeof value === 'string') {
      const { minLength, maxLength, pattern } = step.validation;
      
      if (minLength && value.length < minLength) {
        return { valid: false, error: `最少需要${minLength}个字符` };
      }
      
      if (maxLength && value.length > maxLength) {
        return { valid: false, error: `最多只能输入${maxLength}个字符` };
      }
      
      if (pattern && !new RegExp(pattern).test(value)) {
        return { valid: false, error: '输入格式不符合要求' };
      }
    }

    return { valid: true };
  }

  // 执行工作流（模拟后端处理）
  private async executeWorkflow(executionId: string): Promise<void> {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    try {
      execution.status = 'processing';
      
      // 模拟执行时间
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));

      // 根据工作流类型生成模拟结果
      const result = this.generateMockResult(execution);
      
      execution.result = result;
      execution.status = 'completed';
      execution.completedAt = Date.now();

      // 触发完成事件
      this.onWorkflowCompleted(execution);

    } catch (error) {
      execution.status = 'error';
      execution.error = error instanceof Error ? error.message : '执行失败';
      console.error('工作流执行失败:', error);
    }
  }

  // 生成模拟结果
  private generateMockResult(execution: WorkflowExecution): any {
    const template = getWorkflowTemplate(execution.templateId);
    if (!template) return null;

    switch (execution.templateId) {
      case 'article-writer':
        return this.generateArticleResult(execution);
      case 'image-analyzer':
        return this.generateImageAnalysisResult(execution);
      case 'code-reviewer':
        return this.generateCodeReviewResult(execution);
      case 'business-plan':
        return this.generateBusinessPlanResult(execution);
      default:
        return { type: 'text', content: '工作流执行完成，但暂无具体结果实现。' };
    }
  }

  // 生成文章写作结果
  private generateArticleResult(execution: WorkflowExecution): any {
    const inputs = this.getInputsByStepId(execution);
    const topic = inputs.topic || '未指定主题';
    const audience = inputs.audience || '通用读者';
    const length = inputs.length || '中文 (1500字)';
    const requirements = inputs.requirements || '';

    return {
      type: 'article',
      title: `关于"${topic}"的文章`,
      content: `# ${topic}

## 概述

本文针对${audience}群体，以${length}的篇幅深入探讨"${topic}"这一重要话题。

## 主要内容

### 1. 背景分析
${topic}作为当前热门话题，具有重要的现实意义和深远影响。从多个维度来看，我们需要深入理解其本质和发展趋势。

### 2. 深入分析
通过详细的分析和研究，我们发现${topic}不仅仅是一个简单的概念，而是一个复杂的系统性问题，涉及多个层面的考量。

### 3. 实践应用
在实际应用中，${topic}展现出了巨大的潜力。无论是在理论研究还是实践应用方面，都有着广阔的发展空间。

${requirements ? `### 4. 特别关注\n${requirements}` : ''}

## 结论

综合以上分析，${topic}是一个值得深入研究和持续关注的重要领域。随着技术的发展和社会需求的变化，相信${topic}将在未来发挥更加重要的作用。

---

*本文由AI工作流自动生成，针对${audience}定制化写作*`,
      metadata: {
        wordCount: length.includes('800') ? 800 : length.includes('1500') ? 1500 : 3000,
        audience,
        topic,
        requirements
      }
    };
  }

  // 生成图片分析结果
  private generateImageAnalysisResult(execution: WorkflowExecution): any {
    const inputs = this.getInputsByStepId(execution);
    const analysisType = inputs['analysis-type'] || '内容描述';
    const specificNeeds = inputs['specific-needs'] || '';

    return {
      type: 'analysis',
      title: `图片${analysisType}分析报告`,
      content: `# 图片分析报告

## 分析类型：${analysisType}

### 基础信息
- 分析时间：${new Date().toLocaleString()}
- 分析重点：${analysisType}
- 图片格式：已检测
- 图片质量：良好

### 详细分析

#### 主要发现
根据${analysisType}的分析要求，我们对上传的图片进行了深度解析。

#### 核心内容
1. **视觉元素**：图片包含丰富的视觉信息，具有良好的构图和色彩搭配。
2. **技术指标**：图片质量符合标准，分辨率适中，色彩饱和度良好。
3. **内容特征**：基于${analysisType}的角度，图片展现出独特的特征和价值。

${specificNeeds ? `#### 专项分析\n基于您的特殊需求"${specificNeeds}"，我们进行了定向分析：\n\n这个需求体现了您对图片深层含义的关注，经过仔细分析，我们发现图片在这方面确实具有值得关注的特点。` : ''}

### 结论与建议
综合分析结果显示，这张图片在${analysisType}方面表现出色，建议可以进一步优化和应用。

---

*本报告由AI图片分析工作流生成*`,
      metadata: {
        analysisType,
        specificNeeds,
        hasImage: true
      }
    };
  }

  // 生成代码审查结果
  private generateCodeReviewResult(execution: WorkflowExecution): any {
    const inputs = this.getInputsByStepId(execution);
    const language = inputs.language || 'JavaScript';
    const focus = inputs.focus || '全面审查';
    const code = inputs.code || '';

    return {
      type: 'code-review',
      title: `${language}代码审查报告`,
      content: `# ${language} 代码审查报告

## 审查概述
- **编程语言**：${language}
- **审查重点**：${focus}
- **代码行数**：${code.split('\n').length} 行
- **审查时间**：${new Date().toLocaleString()}

## 审查结果

### ✅ 优点
1. **代码结构**：整体代码结构清晰，逻辑合理
2. **可读性**：变量命名规范，代码格式良好
3. **功能实现**：核心功能实现正确，逻辑流程顺畅

### ⚠️ 建议改进
1. **${focus}方面**：
   - 建议优化核心算法的执行效率
   - 可以考虑添加更多的错误处理机制
   - 建议增加代码注释，提高可维护性

2. **通用建议**：
   - 考虑使用更现代的${language}特性
   - 建议添加单元测试覆盖
   - 可以优化内存使用和性能表现

### 🔧 具体修改建议
\`\`\`${language.toLowerCase()}
// 示例：优化后的代码结构
// 建议采用更清晰的函数分离和错误处理
\`\`\`

## 质量评分
- **代码质量**：85/100
- **可维护性**：80/100
- **性能效率**：78/100
- **安全性**：82/100

## 总结
您的${language}代码整体质量良好，在${focus}方面表现出色。建议按照上述建议进行优化，可以进一步提升代码质量。

---

*本报告由AI代码审查工作流生成*`,
      metadata: {
        language,
        focus,
        codeLength: code.length,
        score: {
          quality: 85,
          maintainability: 80,
          performance: 78,
          security: 82
        }
      }
    };
  }

  // 生成商业计划结果
  private generateBusinessPlanResult(execution: WorkflowExecution): any {
    const inputs = this.getInputsByStepId(execution);
    const businessIdea = inputs['business-idea'] || '';
    const targetMarket = inputs['target-market'] || '';
    const competition = inputs.competition || '';
    const fundingStage = inputs['funding-stage'] || '';

    return {
      type: 'business-plan',
      title: '商业计划书',
      content: `# 商业计划书

## 执行摘要
**商业概念**：${businessIdea}

我们致力于创建一个创新的解决方案，服务于${targetMarket}这一重要市场。

## 1. 商业模式

### 核心价值主张
我们的产品/服务通过创新的方式解决客户的核心需求，为${targetMarket}提供独特的价值。

### 目标市场分析
- **主要客户群体**：${targetMarket}
- **市场规模**：具有显著的增长潜力
- **客户需求**：存在明确的市场需求和痛点

## 2. 竞争分析
${competition ? `
**主要竞争对手**：${competition}

我们通过差异化策略和独特的价值主张在竞争中保持优势。
` : '目前市场竞争相对较少，存在良好的机会窗口。'}

## 3. 营销策略
- **市场定位**：明确的品牌定位和差异化优势
- **推广渠道**：多元化的市场推广策略
- **客户获取**：有效的客户获取和留存机制

## 4. 财务规划
### 收入模式
- 多元化的收入来源
- 可持续的盈利模式
- 清晰的成本结构

### 融资需求
**当前阶段**：${fundingStage}

根据当前发展阶段，我们制定了相应的融资策略和资金使用计划。

## 5. 实施计划
### 短期目标（6个月）
- 产品/服务的完善和优化
- 核心团队的建设
- 初期市场验证

### 中期目标（1-2年）
- 市场份额的扩大
- 用户基础的建立
- 商业模式的验证

### 长期愿景（3-5年）
- 行业领导地位的确立
- 多元化发展
- 可持续增长

## 6. 风险分析与对策
我们识别了潜在的市场风险、技术风险和财务风险，并制定了相应的应对策略。

## 总结
这个商业计划具有良好的市场前景和可行性，通过系统的执行和持续的优化，相信能够取得成功。

---

*本商业计划书由AI工作流生成，建议结合具体情况进行调整和完善*`,
      metadata: {
        businessIdea,
        targetMarket,
        competition,
        fundingStage,
        generatedAt: new Date().toISOString()
      }
    };
  }

  // 获取执行状态
  getExecution(executionId: string): WorkflowExecution | null {
    return this.executions.get(executionId) || null;
  }

  // 取消工作流执行
  cancelExecution(executionId: string): boolean {
    const execution = this.executions.get(executionId);
    if (!execution) return false;

    execution.status = 'cancelled';
    return true;
  }

  // 获取所有输入数据（按步骤ID索引）
  private getInputsByStepId(execution: WorkflowExecution): Record<string, any> {
    const result: Record<string, any> = {};
    execution.stepInputs.forEach(input => {
      result[input.stepId] = input.value;
    });
    return result;
  }

  // 生成ID
  private generateId(): string {
    return `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 工作流完成回调
  private onWorkflowCompleted(execution: WorkflowExecution): void {
    console.log('工作流执行完成:', execution.templateName);
    
    // 触发自定义事件
    const event = new CustomEvent('workflowCompleted', {
      detail: {
        executionId: execution.id,
        templateId: execution.templateId,
        result: execution.result
      }
    });
    window.dispatchEvent(event);
  }
}

// 全局工作流引擎实例
export const workflowEngine = new WorkflowEngine(); 