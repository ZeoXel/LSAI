"use client";

import { motion } from "framer-motion";
import { FileText, X, Upload, PanelRightClose } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { useState, useEffect } from "react";

export function RightSidebar() {
  const { 
    currentFiles, 
    removeFile, 
    toggleRightSidebar,
    isRightSidebarOpen
  } = useAppStore();

  // 控制内容显示的状态 - 动画完成后才显示
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (isRightSidebarOpen) {
      // 展开时：等待宽度动画完成(0.4s)后再延迟0.1s显示内容
      const timer = setTimeout(() => {
        setShowContent(true);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      // 折叠时：立即隐藏内容
      setShowContent(false);
    }
  }, [isRightSidebarOpen]);

  return (
    <div className="h-full flex flex-col w-full">
      {/* 顶部标题栏 */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          {showContent && (
            <motion.h3
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="font-semibold text-lg"
            >
              文件库
            </motion.h3>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleRightSidebar}
            className="h-8 w-8"
          >
            <PanelRightClose className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 上传区域 */}
      {showContent && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          className="p-4"
        >
          <Button 
            variant="outline" 
            className="w-full h-20 border-dashed border-2 hover:bg-secondary/50"
          >
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                拖拽文件或点击上传
              </span>
            </div>
          </Button>
        </motion.div>
      )}

      {showContent && <Separator />}

      {/* 文件列表 */}
      {showContent && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          className="flex-1 p-4"
        >
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium">当前文件</h4>
            <span className="text-xs text-muted-foreground">
              {currentFiles.length} 个文件
            </span>
          </div>

          <ScrollArea className="h-full">
            {currentFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  暂无文件
                </p>
                <p className="text-xs text-muted-foreground">
                  上传文件开始使用
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {currentFiles.map((file, index) => (
                  <motion.div
                    key={file}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="p-3 hover:bg-secondary/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm truncate" title={file}>
                            {file}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 flex-shrink-0"
                          onClick={() => removeFile(file)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </ScrollArea>
        </motion.div>
      )}

      {/* 底部操作区 */}
      {showContent && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
          className="p-4 border-t border-border"
        >
          <div className="text-xs text-muted-foreground text-center">
            支持多种文件格式
          </div>
        </motion.div>
      )}
    </div>
  );
} 