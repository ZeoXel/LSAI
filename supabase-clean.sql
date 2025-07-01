-- ============================================
-- Supabase 彻底清理脚本 - 删除所有现有结构
-- ============================================

-- 1. 删除所有Storage策略（如果存在）
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletion" ON storage.objects;
DROP POLICY IF EXISTS "Allow anonymous uploads to media bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow anonymous access to media bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow anonymous deletion from media bucket" ON storage.objects;

-- 2. 删除Storage bucket中的所有文件
DELETE FROM storage.objects WHERE bucket_id = 'media';

-- 3. 删除Storage bucket
DELETE FROM storage.buckets WHERE id = 'media';

-- 4. 删除所有表的RLS策略
DROP POLICY IF EXISTS "Allow all operations on history_records" ON public.history_records;
DROP POLICY IF EXISTS "Allow all operations on media_files" ON public.media_files;
DROP POLICY IF EXISTS "Allow all operations on tags" ON public.tags;
DROP POLICY IF EXISTS "Allow all operations on app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Allow anonymous access to history_records" ON public.history_records;
DROP POLICY IF EXISTS "Allow anonymous access to media_files" ON public.media_files;
DROP POLICY IF EXISTS "Allow anonymous access to tags" ON public.tags;
DROP POLICY IF EXISTS "Allow anonymous access to app_settings" ON public.app_settings;

-- 5. 删除所有触发器
DROP TRIGGER IF EXISTS update_history_records_updated_at ON public.history_records;
DROP TRIGGER IF EXISTS update_app_settings_updated_at ON public.app_settings;

-- 6. 删除所有索引
DROP INDEX IF EXISTS idx_history_records_type;
DROP INDEX IF EXISTS idx_history_records_created_at;
DROP INDEX IF EXISTS idx_history_records_tags;
DROP INDEX IF EXISTS idx_media_files_history_id;
DROP INDEX IF EXISTS idx_media_files_created_at;

-- 7. 删除所有表（按依赖关系顺序）
DROP TABLE IF EXISTS public.media_files CASCADE;
DROP TABLE IF EXISTS public.history_records CASCADE;
DROP TABLE IF EXISTS public.tags CASCADE;
DROP TABLE IF EXISTS public.app_settings CASCADE;

-- 8. 删除函数
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS import_data(jsonb, jsonb, jsonb) CASCADE;

-- 9. 清理完成提示
SELECT 'Supabase清理完成！现在可以执行重建脚本。' as status; 