import { StorageService, HistoryRecord, MediaFile, Tag, ChatMessage, ListOptions, ListResponse } from './types';
import { supabase } from './supabase-client';
import { generateId } from './utils';

export class SupabaseStorageService implements StorageService {
  // 历史记录管理
  async createRecord(record: Omit<HistoryRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<HistoryRecord> {
    const now = new Date().toISOString();
    const newRecord = {
      ...record,
      id: generateId(),
      createdAt: now,
      updatedAt: now
    };
    
    const { data, error } = await supabase
      .from('history_records')
      .insert(newRecord)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  }

  async updateRecord(id: string, updates: Partial<HistoryRecord>): Promise<void> {
    const { error } = await supabase
      .from('history_records')
      .update({
        ...updates,
        updatedAt: new Date().toISOString()
      })
      .eq('id', id);
      
    if (error) throw error;
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
      
    if (error) return null;
    return data;
  }

  async listRecords(options: ListOptions): Promise<ListResponse<HistoryRecord>> {
    let query = supabase
      .from('history_records')
      .select('*', { count: 'exact' });
    
    if (options.type) {
      query = query.eq('type', options.type);
    }
    
    if (options.tags?.length) {
      query = query.contains('tags', options.tags);
    }
    
    if (options.search) {
      query = query.ilike('title', `%${options.search}%`);
    }
    
    const { data, error, count } = await query
      .order('createdAt', { ascending: false })
      .range(options.offset, options.offset + options.limit - 1);
      
    if (error) throw error;
    
    return {
      items: data || [],
      total: count || 0
    };
  }

  // 对话管理
  async createConversation(title: string, modelName: string): Promise<HistoryRecord> {
    return this.createRecord({
      type: 'chat',
      title,
      modelName,
      status: 'active',
      tags: [],
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
    
    // 创建文件记录
    const newFile: Omit<MediaFile, 'id'> = {
      historyId,
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
      url: publicUrl,
      createdAt: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('media_files')
      .insert(newFile)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  }

  async getFile(id: string): Promise<MediaFile | null> {
    const { data, error } = await supabase
      .from('media_files')
      .select()
      .eq('id', id)
      .single();
      
    if (error) return null;
    return data;
  }

  async deleteFile(id: string): Promise<void> {
    const file = await this.getFile(id);
    if (!file) return;
    
    // 从 Storage 删除文件
    const fileName = file.url.split('/').pop();
    if (fileName) {
      await supabase.storage
        .from('media')
        .remove([`uploads/${fileName}`]);
    }
    
    // 删除文件记录
    const { error } = await supabase
      .from('media_files')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  }

  // 标签管理
  async createTag(tag: Omit<Tag, 'id' | 'createdAt'>): Promise<Tag> {
    const newTag = {
      ...tag,
      id: generateId(),
      createdAt: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('tags')
      .insert(newTag)
      .select()
      .single();
      
    if (error) throw error;
    return data;
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
      
    if (error) throw error;
    return data || [];
  }

  // 应用设置
  async getActiveConversation(): Promise<HistoryRecord | null> {
    const { data, error } = await supabase
      .from('app_settings')
      .select()
      .eq('key', 'activeConversationId')
      .single();
      
    if (error || !data) return null;
    
    return this.getRecord(data.value as string);
  }

  async setActiveConversation(id: string | null): Promise<void> {
    if (id) {
      await supabase
        .from('app_settings')
        .upsert({
          key: 'activeConversationId',
          value: id,
          updatedAt: new Date().toISOString()
        });
    } else {
      await supabase
        .from('app_settings')
        .delete()
        .eq('key', 'activeConversationId');
    }
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