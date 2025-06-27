import { NextRequest, NextResponse } from 'next/server';

// 图像生成请求接口
interface ImageGenerationRequest {
  prompt: string;
  model?: string;
  size?: string;
}

// 图像生成成功响应接口
interface ImageGenerationResponse {
  data: Array<{
    url: string;
    revised_prompt?: string;
  }>;
}

// 错误响应接口
interface ErrorResponse {
  error: string;
  [key: string]: unknown;
}

export async function POST(request: NextRequest) {
  try {
    const body: ImageGenerationRequest = await request.json();
    const { prompt, model = 'seedream-3.0', size = '1024x1024' } = body;

    // 验证输入
    if (!prompt || !prompt.trim()) {
      return NextResponse.json(
        { error: '提示词不能为空' },
        { status: 400 }
      );
    }

    // 构建请求数据
    const payload = {
      prompt: prompt.trim(),
      n: 1,
      model: model,
      size: size,
    };

    // 调用DMXAPI图像生成接口
    const response = await fetch('https://www.dmxapi.cn/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer sk-G3oRkZnME9LinvDBWQpgyr8eLWmi1cinSWDm5iowGr7IWxXp',
        'Accept': 'application/json',
        'User-Agent': 'DMXAPI/1.0.0 (https://www.dmxapi.cn)',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let errorMessage = '图像生成失败';
      try {
        const errorData: ErrorResponse = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (parseError) {
        // 如果响应不是JSON格式，使用状态码和状态文本
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    let data: ImageGenerationResponse;
    try {
      data = await response.json();
    } catch (parseError) {
      throw new Error('服务器响应格式错误');
    }

    // 返回成功响应
    return NextResponse.json({
      success: true,
      images: data.data,
      model: model,
      size: size,
      prompt: prompt,
    });

  } catch (error: unknown) {
    console.error('Image generation API error:', error);
    
    const errorObj = error as { message?: string };
    
    return NextResponse.json(
      { 
        error: '图像生成失败',
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
    service: 'AI Image Generation API',
    models: ['dall-e-3', 'seedream-3.0', 'flux-schnell', 'flux-dev', 'flux.1.1-pro'],
    sizes: ['1792x1024', '1024x1792', '1024x1024'],
    timestamp: new Date().toISOString(),
  });
} 