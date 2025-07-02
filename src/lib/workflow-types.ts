/**
 * 工作流系统类型定义
 */

// 工作流步骤输入类型
export type WorkflowInputType = 'text' | 'image' | 'multitext' | 'selection';

// 工作流步骤定义
export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  inputType: WorkflowInputType;
  required: boolean;
  prompt: string; // 机器人提示用户输入的内容
  placeholder?: string; // 输入框占位符
  options?: string[]; // 选择项（如果是selection类型）
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
}

// 工作流模板定义
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  estimatedTime: string; // 预估完成时间
  steps: WorkflowStep[];
  tags: string[];
}

// 工作流执行状态
export type WorkflowStatus = 'initializing' | 'waiting_input' | 'processing' | 'completed' | 'error' | 'cancelled';

// 工作流步骤输入数据
export interface WorkflowStepInput {
  stepId: string;
  value: any;
  timestamp: number;
  type: WorkflowInputType;
}

// 工作流执行实例
export interface WorkflowExecution {
  id: string;
  templateId: string;
  templateName: string;
  status: WorkflowStatus;
  currentStep: number;
  totalSteps: number;
  stepInputs: WorkflowStepInput[];
  startedAt: number;
  completedAt?: number;
  result?: any;
  error?: string;
  metadata?: {
    conversationId?: string;
    [key: string]: any;
  };
}

// 工作流结果
export interface WorkflowResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: any;
}

// 工作流消息扩展
export interface WorkflowMessage {
  type: 'workflow_start' | 'workflow_step' | 'workflow_result' | 'workflow_error';
  workflowId: string;
  stepId?: string;
  data?: any;
} 