-- ============================================
-- AI平台 Supabase 数据库初始化脚本
-- ============================================

-- 启用必要的扩展
create extension if not exists "uuid-ossp";

-- 创建历史记录表
create table if not exists public.history_records (
  id text primary key default gen_random_uuid()::text,
  type text not null,
  title text not null,
  model_name text not null,
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  tags text[] default array[]::text[],
  content jsonb default '{}'::jsonb
);

-- 创建媒体文件表
create table if not exists public.media_files (
  id text primary key default gen_random_uuid()::text,
  history_id text not null references public.history_records(id) on delete cascade,
  file_name text not null,
  mime_type text not null,
  size bigint not null,
  url text not null,
  thumbnail_url text,
  created_at timestamptz default now()
);

-- 创建标签表
create table if not exists public.tags (
  id text primary key default gen_random_uuid()::text,
  name text not null unique,
  color text not null,
  created_at timestamptz default now()
);

-- 创建应用设置表
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

-- 创建索引优化查询性能
create index if not exists idx_history_records_type on public.history_records(type);
create index if not exists idx_history_records_created_at on public.history_records(created_at desc);
create index if not exists idx_history_records_tags on public.history_records using gin(tags);
create index if not exists idx_media_files_history_id on public.media_files(history_id);
create index if not exists idx_media_files_created_at on public.media_files(created_at desc);

-- 设置行级安全策略 (RLS)
alter table public.history_records enable row level security;
alter table public.media_files enable row level security;
alter table public.tags enable row level security;
alter table public.app_settings enable row level security;

-- 允许匿名用户读写所有表（根据需要调整）
create policy "Allow anonymous access to history_records" on public.history_records
  for all using (true);

create policy "Allow anonymous access to media_files" on public.media_files
  for all using (true);

create policy "Allow anonymous access to tags" on public.tags
  for all using (true);

create policy "Allow anonymous access to app_settings" on public.app_settings
  for all using (true);

-- 创建Storage bucket用于媒体文件
insert into storage.buckets (id, name, public) 
values ('media', 'media', true)
on conflict (id) do nothing;

-- 设置Storage策略
create policy "Allow anonymous uploads to media bucket" on storage.objects
  for insert to anon with check (bucket_id = 'media');

create policy "Allow anonymous access to media bucket" on storage.objects
  for select to anon using (bucket_id = 'media');

create policy "Allow anonymous deletion from media bucket" on storage.objects
  for delete to anon using (bucket_id = 'media');

-- 插入默认标签
insert into public.tags (id, name, color) values
  ('tag-ai-chat', 'AI对话', '#3b82f6'),
  ('tag-media', '媒体生成', '#10b981'),
  ('tag-important', '重要', '#ef4444'),
  ('tag-draft', '草稿', '#6b7280'),
  ('tag-image', '图像', '#8b5cf6'),
  ('tag-video', '视频', '#f59e0b')
on conflict (name) do nothing;

-- 创建更新时间戳的触发器函数
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 为相关表添加更新时间戳触发器
create trigger update_history_records_updated_at
  before update on public.history_records
  for each row execute function update_updated_at_column();

create trigger update_app_settings_updated_at
  before update on public.app_settings
  for each row execute function update_updated_at_column();

-- 完成提示
select 'Supabase数据库初始化完成！' as status; 