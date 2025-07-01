-- ============================================
-- Supabase 完整重建脚本
-- ============================================

-- 1. 清理现有表（如果存在）
DROP TABLE IF EXISTS public.media_files CASCADE;
DROP TABLE IF EXISTS public.history_records CASCADE;
DROP TABLE IF EXISTS public.tags CASCADE;
DROP TABLE IF EXISTS public.app_settings CASCADE;

-- 删除现有的Storage bucket
DELETE FROM storage.buckets WHERE id = 'media';

-- 2. 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 3. 创建历史记录表
CREATE TABLE public.history_records (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  model_name TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  messages JSONB DEFAULT '[]'::JSONB,
  metadata JSONB DEFAULT '{}'::JSONB,
  content JSONB DEFAULT '{}'::JSONB
);

-- 4. 创建媒体文件表
CREATE TABLE public.media_files (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  history_id TEXT NOT NULL REFERENCES public.history_records(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size BIGINT NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  width INTEGER,
  height INTEGER
);

-- 5. 创建标签表
CREATE TABLE public.tags (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 创建应用设置表
CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. 创建索引
CREATE INDEX idx_history_records_type ON public.history_records(type);
CREATE INDEX idx_history_records_created_at ON public.history_records(created_at DESC);
CREATE INDEX idx_history_records_tags ON public.history_records USING GIN(tags);
CREATE INDEX idx_media_files_history_id ON public.media_files(history_id);
CREATE INDEX idx_media_files_created_at ON public.media_files(created_at DESC);

-- 8. 启用行级安全策略
ALTER TABLE public.history_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- 9. 创建宽松的RLS策略（先删除可能存在的策略）
DROP POLICY IF EXISTS "Allow all operations on history_records" ON public.history_records;
DROP POLICY IF EXISTS "Allow all operations on media_files" ON public.media_files;
DROP POLICY IF EXISTS "Allow all operations on tags" ON public.tags;
DROP POLICY IF EXISTS "Allow all operations on app_settings" ON public.app_settings;

CREATE POLICY "Allow all operations on history_records" ON public.history_records
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on media_files" ON public.media_files
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on tags" ON public.tags
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on app_settings" ON public.app_settings
  FOR ALL USING (true) WITH CHECK (true);

-- 10. 创建Storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- 11. 设置Storage策略（先删除可能存在的策略）
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletion" ON storage.objects;

CREATE POLICY "Allow public uploads" ON storage.objects
  FOR INSERT TO public WITH CHECK (bucket_id = 'media');

CREATE POLICY "Allow public access" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'media');

CREATE POLICY "Allow public deletion" ON storage.objects
  FOR DELETE TO public USING (bucket_id = 'media');

-- 12. 创建更新时间戳触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 13. 添加更新时间戳触发器（先删除可能存在的触发器）
DROP TRIGGER IF EXISTS update_history_records_updated_at ON public.history_records;
DROP TRIGGER IF EXISTS update_app_settings_updated_at ON public.app_settings;

CREATE TRIGGER update_history_records_updated_at
  BEFORE UPDATE ON public.history_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 14. 插入默认标签
INSERT INTO public.tags (id, name, color) VALUES
  ('tag-ai-chat', 'AI对话', '#3b82f6'),
  ('tag-media', '媒体生成', '#10b981'),
  ('tag-important', '重要', '#ef4444'),
  ('tag-draft', '草稿', '#6b7280'),
  ('tag-image', '图像', '#8b5cf6'),
  ('tag-video', '视频', '#f59e0b')
ON CONFLICT (name) DO NOTHING;

-- 15. 验证表结构
SELECT 'Supabase数据库重建完成！' as status;

-- 查看创建的表
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('history_records', 'media_files', 'tags', 'app_settings')
ORDER BY table_name, ordinal_position; 