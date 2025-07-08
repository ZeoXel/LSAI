import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from "@sentry/nextjs";

export async function POST(request: NextRequest) {
  return await Sentry.withServerActionInstrumentation(
    "images-edit",
    { recordResponse: true },
    async () => {
  try {
    const formData = await request.formData();
    const prompt = formData.get('prompt') as string;
        const model = formData.get('model') as string || 'flux-kontext-pro'; // 🔧 获取模型参数，默认使用快速模型
    
    // 获取所有图片文件（支持多图）
    const imageFiles = formData.getAll('image') as File[];

    // 验证输入
    if (!prompt || !prompt.trim()) {
      return NextResponse.json(
        { error: '编辑提示词不能为空' },
        { status: 400 }
      );
    }

    if (!imageFiles || imageFiles.length === 0) {
      return NextResponse.json(
        { error: '请上传要编辑的图片' },
        { status: 400 }
      );
    }

    // 验证图片数量
    if (imageFiles.length > 5) {
      return NextResponse.json(
        { error: '最多只能上传5张图片' },
        { status: 400 }
      );
    }

    // 验证每个文件类型
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      if (!file.type.startsWith('image/')) {
        return NextResponse.json(
          { error: `第${i + 1}张图片不是有效的图片文件` },
          { status: 400 }
        );
      }
    }

    // 准备发送给DMXAPI的FormData
    const apiFormData = new FormData();
    apiFormData.append('prompt', prompt.trim());
    apiFormData.append('model', model); // 🔧 传递模型参数给DMXAPI
    
    // 添加所有图片文件
    imageFiles.forEach((file) => {
      apiFormData.append('image', file);
    });

    console.log('发送图像编辑请求:', {
      prompt: prompt.trim(),
      model: model, // 🔧 记录使用的模型
      imageCount: imageFiles.length,
      files: imageFiles.map((file, index) => ({
        index,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      }))
    });

    // 调用DMXAPI图像编辑接口
    const apiKey = process.env.DMXAPI_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('DMXAPI密钥未配置，请在.env.local文件中设置DMXAPI_KEY');
    }

    const response = await fetch('https://www.dmxapi.cn/v1/images/edits', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'User-Agent': 'DMXAPI/1.0.0 (https://www.dmxapi.cn)',
      },
      body: apiFormData,
    });

    console.log('DMXAPI响应状态:', response.status);

    if (!response.ok) {
      let errorMessage = '图像编辑失败';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    let data;
    try {
      data = await response.json();
      console.log('DMXAPI返回数据结构:', {
        hasData: !!data.data,
        dataLength: data.data?.length || 0,
        firstItemKeys: data.data?.[0] ? Object.keys(data.data[0]) : []
      });
    } catch {
      throw new Error('服务器响应格式错误');
    }

    // 处理返回数据 - 图像编辑通常返回base64格式
    if (data.data && Array.isArray(data.data) && data.data.length > 0) {
      const result = data.data[0];
      
      // 检查是否有base64数据
      if (result.b64_json) {
        // 将base64转换为data URL
        const imageUrl = `data:image/png;base64,${result.b64_json}`;
        
        return NextResponse.json({
          success: true,
          images: [{ url: imageUrl }],
          prompt: prompt,
          model: model, // 🔧 返回实际使用的模型
          editType: 'image_edit'
        });
      } else if (result.url) {
        // 如果返回的是URL
        return NextResponse.json({
          success: true,
          images: [{ url: result.url }],
          prompt: prompt,
          model: model, // 🔧 返回实际使用的模型
          editType: 'image_edit'
        });
      }
    }

    throw new Error('API返回数据格式异常');

  } catch (error: unknown) {
    console.error('图像编辑API错误:', error);
    
    const errorObj = error as { message?: string };
        
        // 记录错误到Sentry
        Sentry.setContext("error_details", {
          message: errorObj.message,
          endpoint: "images/edit"
        });
        Sentry.setTag("api_endpoint", "image_edit");
        Sentry.captureException(error);
    
    return NextResponse.json(
      { 
        error: '图像编辑失败',
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
    service: 'AI Image Edit API',
    endpoint: '/api/images/edit',
    timestamp: new Date().toISOString(),
  });
} 