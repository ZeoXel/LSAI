"use client";

import { motion } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { LeftSidebar } from "./LeftSidebar";
import { MainContent } from "./MainContent";
import { HistoryLibrary } from "@/components/history/HistoryLibrary";
// import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { isLeftSidebarOpen, isRightSidebarOpen } = useAppStore();

  return (
    <div className="h-screen w-full flex overflow-hidden bg-background">
      {/* 左侧边栏 - 工具选择 */}
      <motion.div
        initial={false}
        animate={{
          width: isLeftSidebarOpen ? 280 : 60,
        }}
        transition={{
          duration: 0.4,
          ease: [0.23, 1, 0.32, 1], // easeOutQuart - 更平滑的缓动
        }}
        className="flex-shrink-0 border-r border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden shadow-sm"
      >
        <LeftSidebar />
      </motion.div>

      {/* 主内容区域 - 动态调整宽度 */}
      <motion.div
        initial={false}
        animate={{
          width: isRightSidebarOpen ? "55%" : "100%",
        }}
        transition={{
          duration: 0.4,
          ease: [0.23, 1, 0.32, 1], // easeOutQuart - 更平滑的缓动
        }}
        className="flex flex-col min-w-0 bg-background"
      >
        <MainContent>{children}</MainContent>
      </motion.div>

      {/* 右侧边栏 - 历史记录库 (并排显示) */}
      <motion.div
        initial={false}
        animate={{
          width: isRightSidebarOpen ? "45%" : 0,
          opacity: isRightSidebarOpen ? 1 : 0,
        }}
        transition={{
          width: {
            duration: 0.4,
            ease: [0.23, 1, 0.32, 1], // 与主内容区域同步
          },
          opacity: {
            duration: isRightSidebarOpen ? 0.3 : 0.15,
            delay: isRightSidebarOpen ? 0.1 : 0,
            ease: "easeOut",
          }
        }}
        className="flex-shrink-0 border-l border-border bg-card overflow-hidden"
      >
        {isRightSidebarOpen && <HistoryLibrary />}
      </motion.div>
    </div>
  );
} 