import { NextRequest, NextResponse } from 'next/server';

// Vercel限制常量
const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB per file
const MAX_TOTAL_SIZE = 4 * 1024 * 1024; // 4MB total
const REQUEST_TIMEOUT = 300000; // 300秒超时（为图像处理预留足够时间）

export async function POST(request: NextRequest) {
  try {
    // 检查Content-Length头部
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_TOTAL_SIZE) {
      return NextResponse.json(
        { error: '请求体过大，请减少图片数量或降低图片质量' },
        { status: 413 }
      );
    }

    const formData = await request.formData();
    const prompt = formData.get('prompt') as string;
    
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
    if (imageFiles.length > 3) { // 降低限制以适应Vercel
      return NextResponse.json(
        { error: '最多只能上传3张图片（Vercel限制）' },
        { status: 400 }
      );
    }

    // 验证每个文件类型和大小
    let totalSize = 0;
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      if (!file.type.startsWith('image/')) {
        return NextResponse.json(
          { error: `第${i + 1}张图片不是有效的图片文件` },
          { status: 400 }
        );
      }
      
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `第${i + 1}张图片大小超过4MB限制` },
          { status: 400 }
        );
      }
      
      totalSize += file.size;
    }

    // 检查总大小
    if (totalSize > MAX_TOTAL_SIZE) {
      return NextResponse.json(
        { error: '图片总大小超过4MB限制，请压缩图片或减少数量' },
        { status: 400 }
      );
    }

    // 准备发送给DMXAPI的FormData
    const apiFormData = new FormData();
    apiFormData.append('prompt', prompt.trim());
    
    // 添加所有图片文件
    imageFiles.forEach((file) => {
      apiFormData.append('image', file);
    });

    console.log('发送图像编辑请求:', {
      prompt: prompt.trim(),
      imageCount: imageFiles.length,
      totalSize: Math.round(totalSize / 1024) + 'KB',
      files: imageFiles.map((file, index) => ({
        index,
        fileName: file.name,
        fileSize: Math.round(file.size / 1024) + 'KB',
        fileType: file.type
      }))
    });

    // 创建带超时的fetch请求
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      // 调用DMXAPI图像编辑接口
      const response = await fetch('https://www.dmxapi.cn/v1/images/edits', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer sk-G3oRkZnME9LinvDBWQpgyr8eLWmi1cinSWDm5iowGr7IWxXp',
          'User-Agent': 'DMXAPI/1.0.0 (https://www.dmxapi.cn)',
        },
        body: apiFormData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
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
        
        // 详细调试信息
        console.log('详细数据检查:', {
          hasData: !!data.data,
          dataIsArray: Array.isArray(data.data),
          dataLength: data.data?.length || 0,
          firstItem: result,
          b64_json_exists: !!result.b64_json,
          b64_json_type: typeof result.b64_json,
          b64_json_length: result.b64_json?.length || 0,
          url_exists: !!result.url,
          allKeys: Object.keys(result)
        });
        
        // 检查是否有base64数据
        if (result.b64_json && typeof result.b64_json === 'string' && result.b64_json.length > 0) {
          console.log('成功：使用b64_json数据');
          // 将base64转换为data URL
          const imageUrl = `data:image/png;base64,${result.b64_json}`;
          
          return NextResponse.json({
            success: true,
            images: [{ url: imageUrl }],
            prompt: prompt,
            model: 'gpt-image-1',
            editType: 'image_edit'
          });
        } else if (result.url && typeof result.url === 'string' && result.url.length > 0) {
          console.log('成功：使用URL数据');
          // 如果返回的是URL
          return NextResponse.json({
            success: true,
            images: [{ url: result.url }],
            prompt: prompt,
            model: 'gpt-image-1',
            editType: 'image_edit'
          });
        }
        
        console.log('错误：无有效的图像数据');
      }

      console.log('错误：数据结构不符合预期');
      throw new Error('API返回数据格式异常');

    } catch (fetchError: unknown) {
      clearTimeout(timeoutId);
      
      // 处理中断错误
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return NextResponse.json(
          { error: '请求超时，请尝试压缩图片或减少图片数量' },
          { status: 408 }
        );
      }
      
      throw fetchError;
    }

  } catch (error: unknown) {
    console.error('图像编辑API错误:', error);
    
    const errorObj = error as { message?: string };
    
    // 针对不同错误类型返回不同的错误信息
    if (errorObj.message?.includes('fetch')) {
      return NextResponse.json(
        { 
          error: '网络连接失败，请检查网络或稍后重试',
          details: errorObj.message || 'Network error'
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { 
        error: '图像编辑失败',
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
    service: 'AI Image Edit API',
    endpoint: '/api/images/edit',
    timestamp: new Date().toISOString(),
    limits: {
      maxFileSize: '4MB',
      maxTotalSize: '4MB',
      maxFiles: 3,
      timeout: '45s'
    }
  });
} 