"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Wand2, 
  Copy, 
  Check, 
  RefreshCw,
  Sparkles,
  X,
  ArrowRight
} from "lucide-react";
import { toast } from "sonner";

interface PromptOptimizationResult {
  original: string;
  optimized: string;
  components: {
    subject: string;      // 主体
    action: string;       // 动作/状态
    environment: string;  // 环境/背景
    style: string;        // 风格/质量
    technical: string;    // 技术参数
  };
  improvements: string[];
}

interface PromptOptimizerProps {
  originalPrompt: string;
  type: 'image' | 'video';
  onApplyOptimized: (optimizedPrompt: string) => void;
  onClose: () => void;
  autoRun?: boolean; // 新增：是否自动运行模式
}

export function PromptOptimizer({ originalPrompt, type, onApplyOptimized, onClose, autoRun = false }: PromptOptimizerProps) {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [result, setResult] = useState<PromptOptimizationResult | null>(null);
  const [copied, setCopied] = useState(false);

  // 调用AI大模型进行提示词分析和优化
  const optimizePromptWithAI = async (prompt: string, contentType: 'image' | 'video'): Promise<PromptOptimizationResult> => {
    const systemPrompt = `你是一个专业的${contentType === 'image' ? '图像' : '视频'}生成提示词优化专家。

核心原则：
1. 绝对保持用户原始输入的核心内容和意图不变
2. 在用户原意基础上进行扩展和细化
3. 按照 [主体] + [动作/状态] + [环境/背景] + [风格/质量] + [技术参数] 格式组织
4. 不要替换或改变用户明确表达的关键词

任务：分析用户输入的提示词，提取核心组件，然后在保持原意的基础上进行专业扩展优化。

请返回JSON格式：
{
  "analysis": {
    "subject": "提取的主体（保持用户原词）",
    "action": "提取的动作/状态（保持用户原词）", 
    "environment": "提取的环境/背景（如无则补充合理环境）",
    "style": "提取的风格（如无则补充适合的风格）",
    "technical": "技术参数（根据${contentType}类型补充）"
  },
  "optimized": "优化后的完整提示词",
  "improvements": ["改进说明1", "改进说明2", "改进说明3"]
}

用户输入：${prompt}`;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user', 
              content: `请优化这个${contentType}生成提示词：${prompt}`
            }
          ],
          model: 'gpt-4o-mini',
          temperature: 0.7
        }),
      });

      if (!response.ok) {
        throw new Error('AI分析请求失败');
      }

      const data = await response.json();
      const aiResponse = data.message?.content;
      
      if (!aiResponse) {
        throw new Error('AI返回内容为空');
      }

      // 尝试解析AI返回的JSON
      let parsedResult;
      try {
        // 提取JSON部分（可能包含在代码块中）
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResult = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('无法找到JSON格式的返回');
        }
      } catch (parseError) {
        console.error('解析AI返回JSON失败:', parseError);
        // 降级处理：使用简单的文本分析
        return fallbackAnalysis(prompt, contentType);
      }

      // 验证返回格式
      if (!parsedResult.analysis || !parsedResult.optimized) {
        throw new Error('AI返回格式不正确');
      }

      return {
        original: prompt,
        optimized: parsedResult.optimized,
        components: {
          subject: parsedResult.analysis.subject || "未明确主体",
          action: parsedResult.analysis.action || "未明确动作",
          environment: parsedResult.analysis.environment || "未明确环境",
          style: parsedResult.analysis.style || "未明确风格",
          technical: parsedResult.analysis.technical || "基础参数"
        },
        improvements: parsedResult.improvements || ["AI智能优化"]
      };

    } catch (error) {
      console.error('AI优化失败:', error);
      // 降级处理
      return fallbackAnalysis(prompt, contentType);
    }
  };

  // 降级分析方法（当AI调用失败时使用）
  const fallbackAnalysis = (prompt: string, contentType: 'image' | 'video'): PromptOptimizationResult => {
    // 保持用户原始输入，只添加基础的技术参数
    const technical = contentType === 'image' 
      ? "高清画质, 细节丰富, 专业摄影" 
      : "流畅动画, 电影级质量, 专业运镜";
    
    const optimized = `${prompt}, ${technical}`;
    
    return {
      original: prompt,
      optimized: optimized,
      components: {
        subject: "基于用户输入",
        action: "保持原始描述", 
        environment: "用户指定环境",
        style: "自然风格",
        technical: technical
      },
      improvements: [
        "保持了用户原始表达",
        "添加了基础技术参数",
        "确保输出质量"
      ]
    };
  };

  // 模拟AI提示词优化逻辑
  const optimizePrompt = async () => {
    setIsOptimizing(true);
    
    try {
      // 调用AI大模型进行优化
      const optimized = await optimizePromptWithAI(originalPrompt, type);
      setResult(optimized);
      
      // 自动运行模式下直接应用优化结果
      if (autoRun) {
        onApplyOptimized(optimized.optimized);
        toast.success("提示词已自动优化并应用");
        onClose();
        return;
      }
      
    } catch (error) {
      console.error('优化失败:', error);
      toast.error("优化失败，请重试");
    } finally {
      setIsOptimizing(false);
    }
  };

  // 自动运行模式下立即开始优化
  useEffect(() => {
    if (autoRun) {
      optimizePrompt();
    }
  }, [autoRun]);

  const handleCopy = async () => {
    if (!result) return;
    
    try {
      await navigator.clipboard.writeText(result.optimized);
      setCopied(true);
      toast.success("已复制到剪贴板");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("复制失败");
    }
  };

  const handleApply = () => {
    if (!result) return;
    
    onApplyOptimized(result.optimized);
    toast.success("已应用优化后的提示词");
    onClose();
  };

  // 自动运行模式下的简化界面
  if (autoRun) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-md bg-background p-6">
          <div className="flex items-center justify-center gap-3">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <Wand2 className="h-4 w-4 text-primary animate-pulse" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground">
                AI正在智能优化提示词
              </h3>
              <p className="text-sm text-muted-foreground">
                保持原意，专业扩展中...
              </p>
            </div>
          </div>
          <div className="mt-4 flex justify-center">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">AI分析中</span>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden bg-background">
        {/* 标题栏 */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Wand2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  AI智能提示词优化
                </h2>
                <p className="text-sm text-muted-foreground">
                  保持原意不变，智能扩展您的{type === 'image' ? '图像' : '视频'}生成提示词
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)]">
          {!result ? (
            <div className="space-y-6">
              {/* 原始提示词 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  原始提示词
                </label>
                <div className="p-4 bg-muted/50 rounded-lg border border-border">
                  <p className="text-sm text-foreground">
                    {originalPrompt || "暂无提示词内容"}
                  </p>
                </div>
              </div>

              {/* 优化说明 */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-foreground">
                  AI优化原则
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-card rounded-lg border border-border">
                    <div className="text-sm font-medium text-primary mb-2">🎯 保持原意</div>
                    <div className="text-xs text-muted-foreground">绝不改变您输入的核心内容和关键词</div>
                  </div>
                  <div className="p-4 bg-card rounded-lg border border-border">
                    <div className="text-sm font-medium text-primary mb-2">🚀 智能扩展</div>
                    <div className="text-xs text-muted-foreground">在原意基础上添加专业细节和技术参数</div>
                  </div>
                  <div className="p-4 bg-card rounded-lg border border-border">
                    <div className="text-sm font-medium text-primary mb-2">📐 结构化</div>
                    <div className="text-xs text-muted-foreground">按专业格式组织，提升生成效果</div>
                  </div>
                  <div className="p-4 bg-card rounded-lg border border-border">
                    <div className="text-sm font-medium text-primary mb-2">🎨 质量提升</div>
                    <div className="text-xs text-muted-foreground">添加适合的风格和技术要求</div>
                  </div>
                </div>
              </div>

              {/* 开始优化按钮 */}
              <div className="flex justify-center pt-4">
                <Button
                  onClick={optimizePrompt}
                  disabled={isOptimizing || !originalPrompt.trim()}
                  className="gap-2"
                >
                  {isOptimizing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      AI智能分析中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      开始AI智能优化
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 对比显示 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 原始提示词 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    原始提示词
                  </label>
                  <div className="p-4 bg-muted/30 rounded-lg border border-border">
                    <p className="text-sm text-foreground">
                      {result.original}
                    </p>
                  </div>
                </div>

                {/* 优化后提示词 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-primary flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    AI优化后提示词
                  </label>
                  <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <p className="text-sm text-foreground">
                      {result.optimized}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* 组件分析 */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <ArrowRight className="h-4 w-4" />
                  AI分析结果
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <div className="p-3 bg-card rounded-lg border border-border">
                    <div className="text-xs font-medium text-primary mb-2">主体</div>
                    <div className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                      {result.components.subject}
                    </div>
                  </div>
                  <div className="p-3 bg-card rounded-lg border border-border">
                    <div className="text-xs font-medium text-primary mb-2">动作/状态</div>
                    <div className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                      {result.components.action}
                    </div>
                  </div>
                  <div className="p-3 bg-card rounded-lg border border-border">
                    <div className="text-xs font-medium text-primary mb-2">环境/背景</div>
                    <div className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                      {result.components.environment}
                    </div>
                  </div>
                  <div className="p-3 bg-card rounded-lg border border-border">
                    <div className="text-xs font-medium text-primary mb-2">风格/质量</div>
                    <div className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                      {result.components.style}
                    </div>
                  </div>
                  <div className="p-3 bg-card rounded-lg border border-border">
                    <div className="text-xs font-medium text-primary mb-2">技术参数</div>
                    <div className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                      {result.components.technical}
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* 改进说明 */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-foreground">
                  AI优化改进点
                </h3>
                <div className="space-y-2">
                  {result.improvements.map((improvement, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                      <span className="text-muted-foreground">{improvement}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        {result && (
          <div className="p-6 border-t border-border">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={optimizePrompt}
                disabled={isOptimizing}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                重新AI优化
              </Button>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleCopy}
                  className="gap-2"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  复制
                </Button>
                <Button
                  onClick={handleApply}
                  className="gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  应用优化
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
} 