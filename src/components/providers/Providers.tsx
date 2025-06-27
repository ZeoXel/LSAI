"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { useState, useEffect } from "react";
import { initializeDatabase, deleteDatabase } from "@/lib/database";
import { Toaster } from "sonner";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [isDbInitialized, setIsDbInitialized] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const { showConfirmDialog, ConfirmDialogComponent } = useConfirmDialog();

  useEffect(() => {
    const initDb = async () => {
      try {
        const success = await initializeDatabase();
        if (success) {
          setIsDbInitialized(true);
          console.log('历史记录数据库初始化完成');
        } else {
          console.error('历史记录数据库初始化失败');
          setDbError('数据库初始化失败，某些功能可能无法使用');
          setIsDbInitialized(true); // 继续加载应用
        }
      } catch (error) {
        console.error('数据库初始化异常:', error);
        setDbError('数据库初始化异常，请刷新页面重试');
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

  if (!isDbInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">正在初始化历史记录数据库...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      {dbError && (
        <div className="fixed top-4 right-4 z-50 max-w-sm bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
          <div className="flex items-center justify-between">
            <p className="text-sm">{dbError}</p>
            <button
              onClick={handleClearDatabase}
              className="ml-2 text-xs bg-destructive/20 hover:bg-destructive/30 px-2 py-1 rounded"
            >
              清理数据库
            </button>
          </div>
        </div>
      )}
      {children}
      <Toaster position="bottom-right" richColors />
      <ConfirmDialogComponent />
    </QueryClientProvider>
  );
} 