import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import * as Sentry from "@sentry/nextjs";

// 初始化OpenAI客户端，使用DMXAPI
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // 从环境变量获取DMXAPI密钥
  baseURL: process.env.OPENAI_BASE_URL || "https://www.dmxapi.cn/v1/" // DMXAPI的base URL
});

// 消息内容类型 (暂时未使用)
// interface TextContent {
//   type: 'text';
//   text: string;
// }

// interface ImageContent {
//   type: 'image_url';
//   image_url: {
//     url: string; // base64 data URL
//   };
// }

// 聊天消息接口 - 支持OpenAI格式 (暂时未使用)
// interface ChatMessage {
//   role: 'user' | 'assistant' | 'system';
//   content: string | (TextContent | ImageContent)[];
// }

// 请求体接口
interface ChatRequest {
  messages: ChatCompletionMessageParam[];
  model: string;
}

export async function POST(request: NextRequest) {
  return await Sentry.withServerActionInstrumentation(
    "chat-api",
    { recordResponse: true },
    async () => {
      try {
        // 验证API密钥配置
        if (!process.env.OPENAI_API_KEY) {
          Sentry.captureMessage("OPENAI_API_KEY未配置", "error");
          return NextResponse.json(
            { error: 'OPENAI_API_KEY未配置，请在.env.local文件中设置' },
            { status: 500 }
          );
        }

        const body: ChatRequest = await request.json();
        const { messages, model } = body;

        // 添加Sentry上下文信息
        Sentry.setContext("chat_request", {
          model: model || 'gpt-4o',
          messagesCount: messages.length,
          hasImages: messages.some(msg => 
            Array.isArray(msg.content) && 
            msg.content.some(content => content.type === 'image_url')
          )
        });

    // 验证输入
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: '消息不能为空' },
        { status: 400 }
      );
    }

    // 记录请求数据用于调试
    console.log('Chat API 请求数据:', {
      model: model || 'gpt-4o',
      messages: JSON.stringify(messages, null, 2),
      messagesCount: messages.length
    });

    // 调用OpenAI API - 使用gpt-4o处理图片
    const completion = await client.chat.completions.create({
      model: model || 'gpt-4o',
      messages: messages,
      temperature: 0.1,
      max_tokens: 2000,
      stream: false,
    });

    // 提取AI回复
    const aiMessage = completion.choices[0]?.message;
    
    if (!aiMessage) {
      return NextResponse.json(
        { error: 'AI回复为空' },
        { status: 500 }
      );
    }

    // 返回格式化响应
    return NextResponse.json({
      success: true,
      message: {
        role: aiMessage.role,
        content: aiMessage.content,
      },
      usage: completion.usage,
      model: completion.model,
    });

      } catch (error: unknown) {
        console.error('Chat API error:', error);
        
        // 处理不同类型的错误
        const errorObj = error as { code?: string; message?: string; response?: any };
        
        // 记录详细错误信息到Sentry
        Sentry.setContext("error_details", {
          code: errorObj.code,
          message: errorObj.message,
          response: errorObj.response?.data || errorObj.response,
          endpoint: "chat"
        });
        
        // 根据错误类型设置不同的标签
        if (errorObj.code === 'insufficient_quota') {
          Sentry.setTag("error_type", "quota_exceeded");
          Sentry.captureException(error);
          return NextResponse.json(
            { error: 'API配额不足，请检查账户余额' },
            { status: 402 }
          );
        }
        
        if (errorObj.code === 'invalid_api_key') {
          Sentry.setTag("error_type", "invalid_api_key");
          Sentry.captureException(error);
          return NextResponse.json(
            { error: 'API密钥无效' },
            { status: 401 }
          );
        }

        // 捕获其他未知错误
        Sentry.setTag("error_type", "unknown");
        Sentry.captureException(error);

        return NextResponse.json(
          { 
            error: '服务器内部错误',
            details: errorObj.message || 'Unknown error'
          },
          { status: 500 }
        );
      }
    }
  );
}

// 健康检查端点
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'AI Chat API',
    timestamp: new Date().toISOString(),
  });
} 