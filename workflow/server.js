// Express 服务器 - 核心鉴权与API请求逻辑
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { getJWTToken, CozeAPI } from '@coze/api';
import config from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== 认证功能 ====================
// 允许通过环境变量或参数传入私钥路径，默认值为 './OAuth 应用 私钥.pem'
const PRIVATE_KEY_PATH = process.env.COZE_PRIVATE_KEY_PATH || './OAuth 应用 私钥.pem';

// 'en' for https://api.coze.com, 'cn' for https://api.coze.cn
const key = (process.env.COZE_ENV || 'cn');

// Retrieve configuration values from the config file
const baseURL = config[key].COZE_BASE_URL;
const appId = config[key].auth.oauth_jwt.COZE_APP_ID;
const keyid = config[key].auth.oauth_jwt.COZE_KEY_ID;
const aud = config[key].auth.oauth_jwt.COZE_AUD;

// 读取私钥内容
const privateKey = fs.readFileSync(path.join(__dirname, PRIVATE_KEY_PATH)).toString();

// 获取 access_token 的函数
async function getAccessToken() {
  try {
    const jwtToken = await getJWTToken({
      baseURL,
      appId,
      aud,
      keyid,
      privateKey,
      sessionName: 'coze-api-server',
    });
    return jwtToken.access_token;
  } catch (error) {
    console.error('获取 access_token 失败:', error);
    throw error;
  }
}

// ==================== API请求功能 ====================
const BASE_URL = 'https://api.coze.cn';

// 创建工作流执行函数
async function runWorkflow(workflowId, parameters = {}) {
  try {
    // 自动获取 access_token
    const token = await getAccessToken();
    console.log('✅ 成功获取 access_token');

    // 初始化 Coze API 客户端
    const apiClient = new CozeAPI({
      token: token,
      baseURL: BASE_URL
    });

    // 执行工作流（流式响应）
    console.log(`🚀 开始执行工作流 ${workflowId}...`);
    console.log('📋 参数:', JSON.stringify(parameters, null, 2));
    
    const res = await apiClient.workflows.runs.stream({
      workflow_id: workflowId,
      parameters: parameters,
    });

    return res;
  } catch (error) {
    console.error('❌ 工作流执行失败:', error);
    throw error;
  }
}

// 恢复中断的工作流
async function resumeWorkflow(workflowId, eventId, interruptType, userInput) {
  try {
    // 自动获取 access_token
    const token = await getAccessToken();
    console.log('✅ 成功获取 access_token');

    // 初始化 Coze API 客户端
    const apiClient = new CozeAPI({
      token: token,
      baseURL: BASE_URL
    });

    // 恢复工作流执行
    console.log(`🔄 恢复工作流 ${workflowId}...`);
    console.log('📋 中断事件ID:', eventId);
    console.log('📋 用户输入:', userInput);
    
    const res = await apiClient.workflows.runs.resume({
      workflow_id: workflowId,
      event_id: eventId,
      interrupt_type: interruptType,
      resume_data: userInput
    });

    return res;
  } catch (error) {
    console.error('❌ 恢复工作流失败:', error);
    throw error;
  }
}

// 处理流式响应的辅助函数
async function processWorkflowStream(stream, onMessage, onError, onDone, onInterrupt) {
  try {
    for await (const event of stream) {
      console.log('📨 收到事件:', event);
      
      switch (event.event) {
        case 'Message':
          if (onMessage) {
            onMessage(event.data);
          }
          break;
        case 'Error':
          if (onError) {
            onError(event.data);
          }
          break;
        case 'Done':
          if (onDone) {
            onDone(event.data);
          }
          break;
        case 'Interrupt':
          console.log('⚠️ 工作流中断:', event.data);
          if (onInterrupt) {
            onInterrupt(event.data);
          }
          break;
        case 'PING':
          console.log('💓 心跳信号');
          break;
        default:
          console.log('🔍 未知事件类型:', event.event);
      }
    }
  } catch (error) {
    console.error('❌ 处理流式响应失败:', error);
    if (onError) {
      onError({ error_message: error.message });
    }
  }
}

// 解析输出内容（支持文本和图片）
function parseOutputContent(content, contentType = 'text') {
  try {
    // 如果是JSON格式，尝试解析
    if (content.startsWith('{') && content.endsWith('}')) {
      const parsed = JSON.parse(content);
      
      // 检查是否包含图片URL
      if (parsed.output && typeof parsed.output === 'string') {
        return {
          type: 'text',
          content: parsed.output
        };
      }
      
      // 检查是否有图片字段
      if (parsed.image_url || parsed.imageUrl || parsed.image) {
        return {
          type: 'image',
          content: parsed.image_url || parsed.imageUrl || parsed.image,
          text: parsed.text || parsed.description || ''
        };
      }
      
      // 其他JSON内容
      return {
        type: 'json',
        content: parsed
      };
    }
    
    // 检查是否是图片URL
    if (content.match(/\.(jpg|jpeg|png|gif|webp)$/i) || content.startsWith('http')) {
      return {
        type: 'image',
        content: content
      };
    }
    
    // 默认文本内容
    return {
      type: 'text',
      content: content
    };
  } catch (error) {
    console.error('解析内容失败:', error);
    return {
      type: 'text',
      content: content
    };
  }
}

// ==================== Express 服务器配置 ====================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS 中间件
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// ==================== API 路由 ====================
// 测试鉴权接口
app.get('/api/auth/test', async (req, res) => {
  try {
    const token = await getAccessToken();
    res.json({ 
      success: true, 
      message: '鉴权成功',
      tokenLength: token.length,
      tokenPreview: token.substring(0, 20) + '...'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// 执行工作流接口
app.post('/api/workflow/run', async (req, res) => {
  const { workflowId, parameters = {} } = req.body;
  
  if (!workflowId) {
    return res.status(400).json({ 
      success: false, 
      error: '工作流ID是必填项' 
    });
  }

  try {
    const stream = await runWorkflow(workflowId, parameters);
    
    // 设置SSE响应头
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    const sendSSE = (event, data) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    await processWorkflowStream(
      stream,
      (data) => sendSSE('message', parseOutputContent(data.content)),
      (data) => sendSSE('error', data),
      (data) => {
        sendSSE('done', data);
        res.end();
      },
      (data) => sendSSE('interrupt', data)
    );

  } catch (error) {
    console.error('工作流执行错误:', error);
    res.write(`event: error\n`);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

// 恢复工作流接口
app.post('/api/workflow/resume', async (req, res) => {
  const { workflowId, eventId, interruptType, userInput } = req.body;
  
  if (!workflowId || !eventId || !interruptType) {
    return res.status(400).json({ 
      success: false, 
      error: '工作流ID、事件ID和中断类型都是必填项' 
    });
  }

  try {
    const result = await resumeWorkflow(workflowId, eventId, interruptType, userInput);
    res.json({ 
      success: true, 
      data: result 
    });
  } catch (error) {
    console.error('恢复工作流错误:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// 健康检查接口
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    features: ['JWT鉴权', 'Coze API调用']
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 服务器启动成功！`);
  console.log(`📡 端口: ${PORT}`);
  console.log(`🔑 支持功能: JWT鉴权生成 + Coze API请求`);
  console.log(`📋 可用接口:`);
  console.log(`   GET  /health                - 健康检查`);
  console.log(`   GET  /api/auth/test         - 测试鉴权`);
  console.log(`   POST /api/workflow/run      - 执行工作流`);
  console.log(`   POST /api/workflow/resume   - 恢复工作流`);
});

// 导出核心函数供其他模块使用
export { getAccessToken, runWorkflow, resumeWorkflow, processWorkflowStream, parseOutputContent }; 