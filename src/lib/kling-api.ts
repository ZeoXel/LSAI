/**
 * 可灵API服务类 - 视频生成核心逻辑
 * 基于video-generation-archive.js转换为TypeScript
 */

import axios from 'axios';
import jwt from 'jsonwebtoken';

// 可灵API配置接口
interface KlingConfig {
  accessKey: string;
  secretKey: string;
  baseUrl?: string;
}

// 文生视频参数接口
interface TextToVideoParams {
  model: string;
  prompt: string;
  aspect_ratio?: string;
  duration?: number;
  mode?: string;
  cfg_scale?: number;
  negative_prompt?: string;
  callback_url?: string;
  external_task_id?: string;
}

// 图生视频参数接口
interface ImageToVideoParams {
  model: string;
  image?: string;
  image_tail?: string;
  prompt?: string;
  duration?: number;
  mode?: string;
  cfg_scale?: number;
  negative_prompt?: string;
  static_mask?: string;
  dynamic_masks?: any[];
  callback_url?: string;
  external_task_id?: string;
}

// 多图参考生视频参数接口
interface MultiImageToVideoParams {
  model: string;
  image_list: Array<{ image: string }>;
  prompt?: string;
  duration?: number;
  mode?: string;
  cfg_scale?: number;
  negative_prompt?: string;
  callback_url?: string;
  external_task_id?: string;
}

// API响应接口
interface KlingTaskResponse {
  success: boolean;
  task_id: string;
  estimated_time: string;
  task_status?: string;
}

interface KlingTaskStatus {
  task_id: string;
  task_status: string;
  task_status_msg: string;
  created_at: number;
  updated_at: number;
  task_result?: {
    videos?: Array<{
      id: string;
      url: string;
      duration: number;
    }>;
  };
}

export class KlingAPI {
  private accessKey: string;
  private secretKey: string;
  private baseUrl: string;

  constructor(config: KlingConfig) {
    this.accessKey = config.accessKey;
    this.secretKey = config.secretKey;
    this.baseUrl = config.baseUrl || 'https://api-beijing.klingai.com';
    
    console.log('🔧 KlingAPI初始化 (使用北京端点):', {
      baseUrl: this.baseUrl,
      accessKey: this.accessKey ? `${this.accessKey.substring(0, 8)}...` : '未配置',
      secretKey: this.secretKey ? `${this.secretKey.substring(0, 8)}...` : '未配置'
    });
  }

  /**
   * 生成JWT Token
   */
  private generateToken(): string {
    const payload = {
      iss: this.accessKey,
      exp: Math.floor(Date.now() / 1000) + 1800, // 30分钟过期
      nbf: Math.floor(Date.now() / 1000) - 5     // 5秒前生效
    };

    return jwt.sign(payload, this.secretKey, { algorithm: 'HS256' });
  }

  /**
   * 处理Base64图片数据（移除前缀）
   */
  private processBase64Image(imageData: string): string {
    if (imageData.startsWith('data:image/')) {
      return imageData.split(',')[1];
    }
    return imageData;
  }

  /**
   * 处理图片数据 - 支持URL和Base64格式
   */
  private processImageData(imageData: string): string {
    // 如果是HTTP/HTTPS URL，直接返回
    if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
      console.log('🔗 使用图片URL:', imageData.substring(0, 50) + '...');
      return imageData;
    }
    
    // 如果是data:image格式，提取Base64部分
    if (imageData.startsWith('data:image/')) {
      const base64Data = imageData.split(',')[1];
      console.log('📄 使用Base64数据，长度:', base64Data.length);
      return base64Data;
    }
    
    // 验证Base64格式
    if (imageData.length < 100) {
      throw new Error(`图片数据过短 (${imageData.length}字符)，请提供有效的图片URL或Base64数据`);
    }
    
    console.log('📄 使用纯Base64数据，长度:', imageData.length);
    return imageData;
  }

  /**
   * 处理可灵API错误
   */
  private handleKlingError(error: any): never {
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          throw new Error(`请求参数错误: ${data.message || '参数验证失败'}`);
        case 401:
          throw new Error('API密钥无效或已过期，请检查accessKey和secretKey');
        case 403:
          throw new Error('访问被拒绝，请检查API权限');
        case 429:
          throw new Error('API调用频率过高，请稍后重试');
        case 500:
          throw new Error('可灵服务器内部错误，请稍后重试');
        default:
          throw new Error(`API调用失败 (${status}): ${data.message || '未知错误'}`);
      }
    } else if (error.request) {
      throw new Error('网络请求失败，请检查网络连接');
    } else {
      throw new Error(`请求配置错误: ${error.message}`);
    }
  }

  /**
   * 文生视频任务
   */
  async createVideoTask(params: TextToVideoParams): Promise<KlingTaskResponse> {
    try {
      const token = this.generateToken();
      
      const requestData: any = {
        model_name: params.model,
        prompt: params.prompt,
        aspect_ratio: params.aspect_ratio || '16:9',
        duration: String(params.duration || 5),
        mode: params.mode || 'std',
        cfg_scale: params.cfg_scale || 0.5
      };

      // 添加可选参数
      if (params.negative_prompt) requestData.negative_prompt = params.negative_prompt;

      if (params.callback_url) requestData.callback_url = params.callback_url;
      if (params.external_task_id) requestData.external_task_id = params.external_task_id;

      console.log('🔍 可灵文生视频API请求:', JSON.stringify(requestData, null, 2));

      console.log('🔍 请求详情:', {
        url: `${this.baseUrl}/v1/videos/text2video`,
        headers: {
          'Authorization': `Bearer ${token.substring(0, 20)}...`,
          'Content-Type': 'application/json',
          'User-Agent': 'KlingAI-Client/1.0'
        },
        payload: requestData
      });

      const response = await axios.post(
        `${this.baseUrl}/v1/videos/text2video`,
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'User-Agent': 'KlingAI-Client/1.0',
            'Accept': 'application/json'
          },
          timeout: 30000 // 30秒超时
        }
      );

      return {
        success: true,
        task_id: response.data.data.task_id,
        estimated_time: '60-180秒'
      };
    } catch (error: any) {
      console.error('可灵文生视频API错误:', error.response?.data || error.message);
      this.handleKlingError(error);
    }
  }

  /**
   * 图生视频任务
   */
  async createImageToVideoTask(params: ImageToVideoParams): Promise<KlingTaskResponse> {
    try {
      const token = this.generateToken();
      
      // 验证模型
      const validModels = ['kling-v1', 'kling-v1-6', 'kling-v2-master', 'kling-v2-1-master'];
      if (!validModels.includes(params.model)) {
        throw new Error(`不支持的模型: ${params.model}。支持的模型: ${validModels.join(', ')}`);
      }

      const requestData: any = {
        model_name: params.model,
        mode: params.mode || 'std',
        duration: String(params.duration || 5)
      };

      // 验证必需参数：图片或尾帧图片至少一个
      if (!params.image && !params.image_tail) {
        throw new Error('必须提供 image 或 image_tail 参数中的至少一个');
      }

      // 处理图片数据 - 支持URL和Base64两种格式
      if (params.image) {
        requestData.image = this.processImageData(params.image);
      }
      if (params.image_tail) {
        requestData.image_tail = this.processImageData(params.image_tail);
      }

      // 添加可选参数
      if (params.prompt) {
        if (params.prompt.length > 2500) throw new Error('正向提示词不能超过2500个字符');
        requestData.prompt = params.prompt;
      }

      if (params.negative_prompt) {
        if (params.negative_prompt.length > 2500) throw new Error('负向提示词不能超过2500个字符');
        requestData.negative_prompt = params.negative_prompt;
      }

      if (params.cfg_scale !== undefined) {
        const cfgScale = parseFloat(String(params.cfg_scale));
        if (cfgScale < 0 || cfgScale > 1) throw new Error('cfg_scale取值范围必须在[0, 1]之间');
        if (!params.model.startsWith('kling-v2')) {
          requestData.cfg_scale = cfgScale;
        }
      }

      // 其他参数
      if (params.static_mask) requestData.static_mask = params.static_mask;
      if (params.dynamic_masks) requestData.dynamic_masks = params.dynamic_masks;

      if (params.callback_url) requestData.callback_url = params.callback_url;
      if (params.external_task_id) requestData.external_task_id = params.external_task_id;

      console.log('🔍 可灵图生视频API请求:', JSON.stringify({
        ...requestData,
        image: requestData.image ? (
          requestData.image.startsWith('http') ? 
          `[图片URL: ${requestData.image.substring(0, 50)}...]` : 
          `[Base64数据,长度:${requestData.image.length}]`
        ) : undefined,
        image_tail: requestData.image_tail ? (
          requestData.image_tail.startsWith('http') ? 
          `[图片URL: ${requestData.image_tail.substring(0, 50)}...]` : 
          `[Base64数据,长度:${requestData.image_tail.length}]`
        ) : undefined
      }, null, 2));

      console.log('🔍 请求详情:', {
        url: `${this.baseUrl}/v1/videos/image2video`,
        headers: {
          'Authorization': `Bearer ${token.substring(0, 20)}...`,
          'Content-Type': 'application/json',
          'User-Agent': 'KlingAI-Client/1.0'
        },
        payload: {
          ...requestData,
          image: requestData.image ? (requestData.image.startsWith('http') ? requestData.image : '[Base64数据]') : undefined
        }
      });

      const response = await axios.post(
        `${this.baseUrl}/v1/videos/image2video`,
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'User-Agent': 'KlingAI-Client/1.0',
            'Accept': 'application/json'
          },
          timeout: 30000 // 30秒超时
        }
      );

      return {
        success: true,
        task_id: response.data.data.task_id,
        estimated_time: '60-180秒',
        task_status: response.data.data.task_status
      };
    } catch (error: any) {
      console.error('可灵图生视频API错误:', error.response?.data || error.message);
      this.handleKlingError(error);
    }
  }

  /**
   * 多图参考生视频任务
   */
  async createMultiImageToVideoTask(params: MultiImageToVideoParams): Promise<KlingTaskResponse> {
    try {
      const token = this.generateToken();
      
      // 验证模型 - 仅kling-v1-6支持多图参考
      if (params.model !== 'kling-v1-6') {
        throw new Error(`多图参考功能仅支持kling-v1-6模型，当前模型: ${params.model}`);
      }

      // 验证图片列表
      if (!params.image_list || params.image_list.length === 0) {
        throw new Error('必须提供至少一张参考图片');
      }
      
      if (params.image_list.length > 4) {
        throw new Error('最多支持4张参考图片');
      }

      const requestData: any = {
        model_name: params.model,
        mode: params.mode || 'std',
        duration: String(params.duration || 5),
        image_list: params.image_list.map(item => ({
          image: this.processImageData(item.image)
        }))
      };

      // 添加可选参数
      if (params.prompt) {
        if (params.prompt.length > 2500) throw new Error('正向提示词不能超过2500个字符');
        requestData.prompt = params.prompt;
      }

      if (params.negative_prompt) {
        if (params.negative_prompt.length > 2500) throw new Error('负向提示词不能超过2500个字符');
        requestData.negative_prompt = params.negative_prompt;
      }

      if (params.cfg_scale !== undefined) {
        const cfgScale = parseFloat(String(params.cfg_scale));
        if (cfgScale < 0 || cfgScale > 1) throw new Error('cfg_scale取值范围必须在[0, 1]之间');
        requestData.cfg_scale = cfgScale;
      }

      if (params.callback_url) requestData.callback_url = params.callback_url;
      if (params.external_task_id) requestData.external_task_id = params.external_task_id;

      console.log('🔍 可灵多图生视频API请求:', JSON.stringify({
        ...requestData,
        image_list: requestData.image_list.map((item: any, index: number) => ({
          image: item.image.startsWith('http') ? 
            `[图片URL ${index + 1}: ${item.image.substring(0, 50)}...]` : 
            `[Base64数据 ${index + 1},长度:${item.image.length}]`
        }))
      }, null, 2));

      const response = await axios.post(
        `${this.baseUrl}/v1/videos/multi-image2video`,
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'User-Agent': 'KlingAI-Client/1.0',
            'Accept': 'application/json'
          },
          timeout: 30000 // 30秒超时
        }
      );

      return {
        success: true,
        task_id: response.data.data.task_id,
        estimated_time: '60-180秒',
        task_status: response.data.data.task_status
      };
    } catch (error: any) {
      console.error('可灵多图生视频API错误:', error.response?.data || error.message);
      this.handleKlingError(error);
    }
  }

  /**
   * 查询任务状态
   */
  async getTaskStatus(taskId: string, taskType: 'text2video' | 'image2video' | 'multi-image2video' = 'text2video'): Promise<KlingTaskStatus> {
    try {
      const token = this.generateToken();
      
      const response = await axios.get(
        `${this.baseUrl}/v1/videos/${taskType}/${taskId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      return response.data.data;
    } catch (error: any) {
      console.error('查询任务状态失败:', error.response?.data || error.message);
      this.handleKlingError(error);
    }
  }
}

/**
 * 视频生成客户端 - 统一接口
 */
export class VideoGenerationClient {
  private klingAPI: KlingAPI;

  constructor(config: { kling: KlingConfig }) {
    this.klingAPI = new KlingAPI(config.kling);
  }

  /**
   * 创建文生视频任务
   */
  async createTextToVideoTask(params: TextToVideoParams): Promise<KlingTaskResponse> {
    return this.klingAPI.createVideoTask(params);
  }

  /**
   * 创建图生视频任务
   */
  async createImageToVideoTask(params: ImageToVideoParams): Promise<KlingTaskResponse> {
    return this.klingAPI.createImageToVideoTask(params);
  }

  /**
   * 创建多图参考生视频任务
   */
  async createMultiImageToVideoTask(params: MultiImageToVideoParams): Promise<KlingTaskResponse> {
    return this.klingAPI.createMultiImageToVideoTask(params);
  }

  /**
   * 查询任务状态
   */
  async getTaskStatus(taskId: string, taskType: 'text2video' | 'image2video' | 'multi-image2video' = 'text2video'): Promise<KlingTaskStatus> {
    return this.klingAPI.getTaskStatus(taskId, taskType);
  }

  /**
   * 获取支持的模型列表
   */
  getSupportedModels() {
    return [
      { 
        id: 'kling-v1', 
        platform: 'kling', 
        available: true, 
        type: 'both', 
        name: '可灵 v1',
        description: '可灵v1模型，支持文本生成视频和图生视频'
      },
      { 
        id: 'kling-v1-6', 
        platform: 'kling', 
        available: true, 
        type: 'image2video',
        name: '可灵 v1.6',
        description: '可灵v1.6图生视频模型'
      },
      { 
        id: 'kling-v2-master', 
        platform: 'kling', 
        available: true, 
        type: 'both',
        name: '可灵 v2 Master',
        description: '可灵v2主模型，最高质量'
      },
      { 
        id: 'kling-v2-1-master', 
        platform: 'kling', 
        available: true, 
        type: 'both',
        name: '可灵 v2.1 Master',
        description: '可灵v2.1主模型，最新版本'
      }
    ];
  }
} 