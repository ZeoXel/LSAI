import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

// 初始化OpenAI客户端，使用DMXAPI
const client = new OpenAI({
  apiKey: "sk-G3oRkZnME9LinvDBWQpgyr8eLWmi1cinSWDm5iowGr7IWxXp", // 你的DMXAPI key
  baseURL: "https://www.dmxapi.cn/v1/" // DMXAPI的base URL
});

// 消息内容类型
interface TextContent {
  type: 'text';
  text: string;
}

interface ImageContent {
  type: 'image_url';
  image_url: {
    url: string; // base64 data URL
  };
}

// 聊天消息接口 - 支持OpenAI格式
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | (TextContent | ImageContent)[];
}

// 请求体接口
interface ChatRequest {
  messages: ChatCompletionMessageParam[];
  model: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { messages, model } = body;

    // 验证输入
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: '消息不能为空' },
        { status: 400 }
      );
    }

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
    const errorObj = error as { code?: string; message?: string };
    
    if (errorObj.code === 'insufficient_quota') {
      return NextResponse.json(
        { error: 'API配额不足，请检查账户余额' },
        { status: 402 }
      );
    }
    
    if (errorObj.code === 'invalid_api_key') {
      return NextResponse.json(
        { error: 'API密钥无效' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { 
        error: '服务器内部错误',
        details: errorObj.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// 健康检查端点
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'AI Chat API',
    timestamp: new Date().toISOString(),
  });
} 