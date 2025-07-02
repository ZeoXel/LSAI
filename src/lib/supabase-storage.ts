import { StorageService, HistoryRecord, MediaFile, Tag, ChatMessage, ListOptions, ListResponse } from './types';
import { supabase } from './supabase-client';
import { generateId } from './utils';

// 字段名映射：数据库蛇形命名法 ↔ TypeScript驼峰命名法
const mapDbToTs = (dbRecord: any): any => {
  if (!dbRecord || typeof dbRecord !== 'object') return dbRecord;
  
  const { 
    created_at, 
    updated_at, 
    model_name, 
    history_id, 
    file_name, 
    mime_type, 
    thumbnail_url,
    ...rest 
  } = dbRecord;
  
  return {
    ...rest,
    ...(created_at !== undefined && { createdAt: created_at }),
    ...(updated_at !== undefined && { updatedAt: updated_at }),
    ...(model_name !== undefined && { modelName: model_name }),
    ...(history_id !== undefined && { historyId: history_id }),
    ...(file_name !== undefined && { fileName: file_name }),
    ...(mime_type !== undefined && { mimeType: mime_type }),
    ...(thumbnail_url !== undefined && { thumbnailUrl: thumbnail_url })
  };
};

const mapTsToDb = (tsRecord: any): any => {
  if (!tsRecord || typeof tsRecord !== 'object') return tsRecord;
  
  const { 
    createdAt, 
    updatedAt, 
    modelName, 
    historyId, 
    fileName, 
    mimeType, 
    thumbnailUrl,
    ...rest 
  } = tsRecord;
  
  return {
    ...rest,
    ...(createdAt !== undefined && { created_at: createdAt }),
    ...(updatedAt !== undefined && { updated_at: updatedAt }),
    ...(modelName !== undefined && { model_name: modelName }),
    ...(historyId !== undefined && { history_id: historyId }),
    ...(fileName !== undefined && { file_name: fileName }),
    ...(mimeType !== undefined && { mime_type: mimeType }),
    ...(thumbnailUrl !== undefined && { thumbnail_url: thumbnailUrl })
  };
};

export class SupabaseStorageService implements StorageService {
  // 测试连接方法
  async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 测试Supabase连接...');
      
      // 测试基本连接
      const { data, error } = await supabase
        .from('history_records')
        .select('id')
        .limit(1);
      
      if (error) {
        console.error('❌ Supabase连接失败:', error);
        return false;
      }
      
      console.log('✅ Supabase连接成功');
      return true;
    } catch (error) {
      console.error('❌ Supabase连接异常:', error);
      return false;
    }
  }
  
  // 历史记录管理
  async createRecord(record: Omit<HistoryRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<HistoryRecord> {
    const now = new Date().toISOString();
    
    // 先应用字段名映射，然后添加时间戳和ID
    const dbRecord = mapTsToDb({
      ...record,
      id: generateId(),
      createdAt: now,
      updatedAt: now
    });
    
    console.log('🔍 准备插入的数据:', dbRecord);
    
    const { data, error } = await supabase
      .from('history_records')
      .insert(dbRecord)
      .select()
      .single();
      
    if (error) {
      console.error('❌ 插入历史记录失败:', error);
      throw error;
    }
    
    console.log('✅ 历史记录插入成功:', data);
    return mapDbToTs(data);
  }

  async updateRecord(id: string, updates: Partial<HistoryRecord>): Promise<void> {
    // 转换为数据库字段名
    const dbUpdates = mapTsToDb({
      ...updates,
      updatedAt: new Date().toISOString()
    });
    
    const { error } = await supabase
      .from('history_records')
      .update(dbUpdates)
      .eq('id', id);
      
    if (error) {
      console.error('记录更新失败:', error);
      throw error;
    }
  }

  async deleteRecord(id: string): Promise<void> {
    const { error } = await supabase
      .from('history_records')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  }

  async getRecord(id: string): Promise<HistoryRecord | null> {
    const { data, error } = await supabase
      .from('history_records')
      .select()
      .eq('id', id)
      .single();
      
    if (error) {
      console.error('获取记录失败:', error);
      return null;
    }
    return mapDbToTs(data);
  }

  async listRecords(options: ListOptions = {}): Promise<ListResponse<HistoryRecord>> {
    const {
      type,
      tags = [],
      search,
      page = 1,
      limit = 20,
      offset = (page - 1) * limit
    } = options;
    
    console.log('🔍 查询历史记录:', { type, tags, search, page, limit, offset });
    
    let query = supabase
      .from('history_records')
      .select('*', { count: 'exact' });
    
    if (type) {
      query = query.eq('type', type);
    }
    
    if (tags.length > 0) {
      query = query.contains('tags', tags);
    }
    
    if (search) {
      query = query.ilike('title', `%${search}%`);
    }
    
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
      
    if (error) {
      console.error('❌ 查询历史记录失败:', error);
      throw error;
    }
    
    console.log('✅ 查询历史记录成功:', { count: count, items: data?.length });
    
    return {
      items: (data || []).map(mapDbToTs),
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit)
    };
  }

  // 对话管理
  async createConversation(title: string, modelName: string): Promise<HistoryRecord> {
    return this.createRecord({
      type: 'text',  // 修复：chat类型改为text，匹配历史记录过滤器
      title,
      modelName,
      status: 'active',
      tags: [],
      messages: [],
      metadata: {},
      content: { messages: [] }
    });
  }

  async addMessageToConversation(conversationId: string, message: ChatMessage): Promise<void> {
    const record = await this.getRecord(conversationId);
    if (!record) throw new Error('Conversation not found');
    
    const content = record.content as { messages: ChatMessage[] };
    content.messages.push(message);
    
    await this.updateRecord(conversationId, { content });
  }

  // 媒体文件管理
  async uploadFile(file: File, historyId: string): Promise<MediaFile> {
    const fileName = `${generateId()}-${file.name}`;
    const filePath = `uploads/${fileName}`;
    
    // 上传文件到 Storage
    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(filePath, file);
      
    if (uploadError) throw uploadError;
    
    // 获取文件 URL
    const { data: { publicUrl } } = supabase.storage
      .from('media')
      .getPublicUrl(filePath);
    
    // 创建文件记录 - 使用数据库字段名
    const dbFile = {
      history_id: historyId,        // 数据库字段名
      file_name: file.name,         // 数据库字段名  
      mime_type: file.type,         // 数据库字段名
      size: file.size,
      url: publicUrl,
      created_at: new Date().toISOString()  // 数据库字段名
    };
    
    const { data, error } = await supabase
      .from('media_files')
      .insert(dbFile)
      .select()
      .single();
      
    if (error) {
      console.error('媒体文件插入失败:', error);
      throw error;
    }
    return mapDbToTs(data);
  }

  async getFile(id: string): Promise<MediaFile | null> {
    const { data, error } = await supabase
      .from('media_files')
      .select()
      .eq('id', id)
      .single();
      
    if (error) {
      console.error('获取文件失败:', error);
      return null;
    }
    return mapDbToTs(data);
  }

  async deleteFile(id: string): Promise<void> {
    try {
      // 先尝试获取文件信息以删除Storage中的文件
      const { data: file, error: getError } = await supabase
        .from('media_files')
        .select('url')
        .eq('id', id)
        .single();
    
      // 如果文件存在，从Storage删除
      if (!getError && file?.url) {
    const fileName = file.url.split('/').pop();
    if (fileName) {
      await supabase.storage
        .from('media')
        .remove([`uploads/${fileName}`]);
        }
      }
    } catch (storageError) {
      // Storage删除失败不阻断流程，只记录警告
      console.warn('删除Storage文件失败:', storageError);
    }
    
    // 删除数据库记录（无论Storage删除是否成功）
    const { error } = await supabase
      .from('media_files')
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error('删除文件记录失败:', error);
      throw error;
    }
  }

  // 查询特定历史记录的所有媒体文件
  async getFilesByHistoryId(historyId: string): Promise<MediaFile[]> {
    const { data, error } = await supabase
      .from('media_files')
      .select('*')
      .eq('history_id', historyId)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('查询媒体文件失败:', error);
      throw error;
    }
    
    return (data || []).map(mapDbToTs);
  }

  // 标签管理
  async createTag(tag: Omit<Tag, 'id' | 'createdAt'>): Promise<Tag> {
    const dbTag = {
      ...tag,
      id: generateId(),
      created_at: new Date().toISOString()  // 数据库字段名
    };
    
    const { data, error } = await supabase
      .from('tags')
      .insert(dbTag)
      .select()
      .single();
      
    if (error) {
      console.error('标签创建失败:', error);
      throw error;
    }
    return mapDbToTs(data);
  }

  async updateTag(id: string, updates: Partial<Tag>): Promise<void> {
    const { error } = await supabase
      .from('tags')
      .update(updates)
      .eq('id', id);
      
    if (error) throw error;
  }

  async deleteTag(id: string): Promise<void> {
    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  }

  async listTags(): Promise<Tag[]> {
    const { data, error } = await supabase
      .from('tags')
      .select()
      .order('name');
      
    if (error) {
      console.error('标签列表获取失败:', error);
      throw error;
    }
    return (data || []).map(mapDbToTs);
  }

  // 应用设置 - 简化版本，不依赖app_settings表
  async getActiveConversation(): Promise<HistoryRecord | null> {
    // 完全跳过app_settings，总是返回null让应用创建新对话
    return null;
  }

  async setActiveConversation(id: string | null): Promise<void> {
    // 完全跳过app_settings，不执行任何操作
    return;
  }

  // 数据导出导入
  async exportData(): Promise<string> {
    const [records, files, tags] = await Promise.all([
      supabase.from('history_records').select(),
      supabase.from('media_files').select(),
      supabase.from('tags').select()
    ]);
    
    return JSON.stringify({
      version: 1,
      data: {
        records: records.data || [],
        files: files.data || [],
        tags: tags.data || []
      }
    });
  }

  async importData(data: string): Promise<void> {
    const importData = JSON.parse(data);
    const { records, files, tags } = importData.data;
    
    // 使用事务确保数据一致性
    const { error } = await supabase.rpc('import_data', {
      records_data: records,
      files_data: files,
      tags_data: tags
    });
    
    if (error) throw error;
  }
} 