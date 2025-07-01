"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { useState, useEffect } from "react";
import { initializeDatabase, deleteDatabase } from "@/lib/database";
import { Toaster } from "sonner";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { StorageContext } from '@/lib/store';
import { SupabaseStorageService } from '@/lib/supabase-storage';
import { localStorageService } from '@/lib/local-storage';
import type { StorageService } from '@/lib/types';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [isDbInitialized, setIsDbInitialized] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [storageService, setStorageService] = useState<StorageService | null>(null);
  const { showConfirmDialog, ConfirmDialogComponent } = useConfirmDialog();

  useEffect(() => {
    const initDb = async () => {
      try {
        // 🔧 尝试Supabase连接
        const supabaseService = new SupabaseStorageService();
        const supabaseConnected = await supabaseService.testConnection();
        
        if (supabaseConnected) {
          console.log('✅ 使用Supabase云数据库');
          setStorageService(supabaseService);
          setIsDbInitialized(true);
          return;
        }
        
        // 🔧 Supabase连接失败，回退到本地IndexedDB + localStorage服务
        console.log('⚠️ Supabase连接失败，回退到本地数据库');
        const success = await initializeDatabase();
        if (success) {
          setStorageService(localStorageService);
          setIsDbInitialized(true);
          console.log('✅ 本地数据库初始化完成');
        } else {
          console.error('❌ 本地数据库初始化失败');
          setStorageService(localStorageService); // 仍然提供服务
          setDbError('数据库初始化失败，某些功能可能无法使用');
          setIsDbInitialized(true);
        }
      } catch (error) {
        console.error('❌ 数据库初始化异常:', error);
        setStorageService(localStorageService); // fallback
        setDbError('数据库初始化异常，已回退到本地存储');
        setIsDbInitialized(true);
      }
    };

    initDb();
  }, []);

  const handleClearDatabase = async () => {
    const confirmed = await showConfirmDialog({
      title: '清理数据库',
      message: '确定要清理数据库吗？这将删除所有历史记录。',
      variant: 'destructive',
      confirmText: '清理',
      cancelText: '取消'
    });

    if (confirmed) {
      try {
        await deleteDatabase();
        alert('数据库已清理，请刷新页面重新初始化');
        window.location.reload();
      } catch (error) {
        console.error('清理数据库失败:', error);
        alert('清理失败，请手动清理浏览器数据');
      }
    }
  };

  // 🔧 等待初始化完成和服务准备
  if (!isDbInitialized || !storageService) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">正在初始化存储服务...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StorageContext.Provider value={storageService}>
        {dbError && (
          <div className="fixed top-4 right-4 z-50 max-w-sm bg-muted/10 border border-muted/20 text-muted-foreground px-4 py-3 rounded-lg">
            <div className="flex items-center justify-between">
              <p className="text-sm">{dbError}</p>
              <button
                onClick={handleClearDatabase}
                className="ml-2 text-xs bg-muted/20 hover:bg-muted/30 px-2 py-1 rounded"
              >
                清理数据库
              </button>
            </div>
          </div>
        )}
        {children}
      </StorageContext.Provider>
      <Toaster position="bottom-right" richColors />
      <ConfirmDialogComponent />
    </QueryClientProvider>
  );
} 