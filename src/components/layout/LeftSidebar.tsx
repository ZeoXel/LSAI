"use client";

import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Image, Video, ChevronLeft } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

const tools = [
  {
    id: "chat",
    name: "AI对话",
    icon: MessageSquare,
    description: "智能聊天助手",
    gradient: "from-blue-500 to-cyan-500",
    bgColor: "bg-info/10 dark:bg-info/20",
  },
  {
    id: "image",
    name: "图像生成",
    icon: Image,
    description: "AI图像创作",
    gradient: "from-purple-500 to-pink-500",
    bgColor: "bg-accent/10 dark:bg-accent/20",
  },
  {
    id: "video",
    name: "视频生成",
    icon: Video,
    description: "AI视频制作",
    gradient: "from-orange-500 to-red-500",
    bgColor: "bg-warning/10 dark:bg-warning/20",
  },
];

export function LeftSidebar() {
  const { 
    isLeftSidebarOpen, 
    selectedTool, 
    toggleLeftSidebar, 
    setSelectedTool 
  } = useAppStore();



  // 控制内容显示的状态
  const [showContent, setShowContent] = useState(isLeftSidebarOpen);

  useEffect(() => {
    if (isLeftSidebarOpen) {
      // 展开时：等待侧边栏动画完成后显示内容
      const timer = setTimeout(() => {
        setShowContent(true);
      }, 200);
      return () => clearTimeout(timer);
    } else {
      // 收起时：立即隐藏内容
      setShowContent(false);
    }
  }, [isLeftSidebarOpen]);

  const containerVariants = {
    expanded: {
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      }
    },
    collapsed: {
      transition: {
        staggerChildren: 0.05,
        staggerDirection: -1,
      }
    }
  };

  const itemVariants = {
    expanded: {
      opacity: 1,
      x: 0,
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 30,
      }
    },
    collapsed: {
      opacity: 0,
      x: -20,
      transition: {
        duration: 0.2,
      }
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-background to-muted/30">
      {/* 顶部标题区域 */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <AnimatePresence mode="wait">
            {showContent && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ 
                  type: "spring",
                  stiffness: 400,
                  damping: 25,
                }}
                className="flex items-center gap-2"
              >
                <div className="w-full flex items-center justify-center">
                  <img 
                    src="/logo.svg" 
                    alt="Logo" 
                    className="w-full h-auto max-h-12 object-contain"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* 展开/收起按钮 */}
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleLeftSidebar}
              className="h-8 w-8 rounded-full hover:bg-primary/10"
            >
              <motion.div
                animate={{ rotate: isLeftSidebarOpen ? 0 : 180 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <ChevronLeft className="h-4 w-4" />
              </motion.div>
            </Button>
          </motion.div>
        </div>
      </div>

      {/* 工具列表 */}
      <div className="flex-1 p-3">
        <motion.div
          variants={containerVariants}
          animate={showContent ? "expanded" : "collapsed"}
          className="space-y-2"
        >
          {tools.map((tool, index) => {
            const Icon = tool.icon;
            const isSelected = selectedTool === tool.id;
            
            return (
              <motion.div
                key={tool.id}
                variants={itemVariants}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full p-0 h-auto overflow-hidden transition-all duration-300",
                    !isLeftSidebarOpen && "justify-center"
                  )}
                  onClick={() => setSelectedTool(tool.id)}
                >
                  <div className={cn(
                    "relative w-full flex items-center rounded-lg transition-all duration-300",
                    isLeftSidebarOpen ? "p-3" : "p-2",
                    isSelected 
                      ? `${tool.bgColor} shadow-sm` 
                      : "hover:bg-muted/50"
                  )}>
                    {/* 图标容器 */}
                    <div className={cn(
                      "relative flex-shrink-0 rounded-lg transition-all duration-300",
                      isLeftSidebarOpen ? "p-2" : "p-1.5",
                      isSelected 
                        ? `bg-gradient-to-br ${tool.gradient} shadow-lg` 
                        : "bg-muted"
                    )}>
                      <Icon className={cn(
                        "transition-all duration-300",
                        isLeftSidebarOpen ? "h-5 w-5" : "h-4 w-4",
                        isSelected ? "text-white" : "text-muted-foreground"
                      )} />
                      
                      {/* 选中状态的光效 */}
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="absolute inset-0 bg-white/20 rounded-lg"
                        />
                      )}
                    </div>

                    {/* 文字内容 */}
                    <AnimatePresence>
                      {showContent && (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ 
                            delay: index * 0.05,
                            duration: 0.3,
                            ease: "easeOut"
                          }}
                          className="ml-3 flex flex-col items-start min-w-0 flex-1"
                        >
                          <span className={cn(
                            "font-medium text-sm transition-colors duration-300",
                            isSelected ? "text-foreground" : "text-muted-foreground"
                          )}>
                            {tool.name}
                          </span>
                          <span className="text-xs text-muted-foreground/70 truncate">
                            {tool.description}
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* 选中指示器 */}
                    {isSelected && (
                      <motion.div
                        layoutId="selectedTool"
                        className="absolute right-2 w-1 h-8 bg-gradient-to-b from-transparent via-primary to-transparent rounded-full"
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 30,
                        }}
                      />
                    )}
                  </div>
                </Button>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* 底部信息 */}
      <AnimatePresence>
        {showContent && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ 
              delay: 0.3,
              duration: 0.4,
              ease: "easeOut"
            }}
            className="p-4 border-t border-border/50"
          >
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">
                AI Platform v1.0
              </div>
              <div className="text-xs text-muted-foreground/60">
                Powered by AI
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 