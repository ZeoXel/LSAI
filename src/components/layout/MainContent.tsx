"use client";

import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { PanelRightOpen, Plus } from "lucide-react";
import { ChatPage } from "@/components/chat/ChatPage";
import { ImageGenerator } from "@/components/image/ImageGenerator";
// import { useConversationStore } from "@/lib/conversation-store";
// import { Card } from "@/components/ui/card";

interface MainContentProps {
  children: React.ReactNode;
}

export function MainContent({ children }: MainContentProps) {
  const { selectedTool, isRightSidebarOpen, toggleRightSidebar } = useAppStore();

  const getToolTitle = (tool: string) => {
    switch (tool) {
      case 'chat':
        return 'AI智能对话';
      case 'image':
        return 'AI图像生成';
      case 'video':
        return 'AI视频制作';
      default:
        return 'AI工具平台';
    }
  };

  // 处理新建对话
  const handleNewConversation = async () => {
    if (selectedTool === 'chat') {
      // 不直接创建对话，而是通过事件通知ChatPage组件
      window.dispatchEvent(new CustomEvent('newChatSession'));
    }
  };

  // 处理新建对话（图像生成）
  const handleNewSession = () => {
    if (selectedTool === 'image') {
      // 通过事件通知ImageGenerator组件
      window.dispatchEvent(new CustomEvent('newImageSession'));
    }
  };

  const renderToolContent = () => {
    switch (selectedTool) {
      case 'chat':
        return <ChatPage />;
      case 'image':
        return <ImageGenerator />;
      case 'video':
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">AI视频制作</h2>
              <p className="text-muted-foreground">视频制作功能即将推出...</p>
            </div>
          </div>
        );
      default:
        return children;
    }
  };

  // 对于聊天和图像生成页面，使用无标题栏的布局
  if (selectedTool === 'chat' || selectedTool === 'image') {
    return (
      <div className="h-full flex flex-col">
        {/* 页面顶部栏 */}
        <div className="p-4 border-b border-border bg-card/50">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">
              {getToolTitle(selectedTool)}
            </h1>
            <div className="flex items-center gap-4">
              {/* 新建按钮 */}
              {selectedTool === 'chat' && (
                <Button
                  onClick={handleNewConversation}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  新建对话
                </Button>
              )}
              {selectedTool === 'image' && (
                <Button
                  onClick={handleNewSession}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  新建对话
                </Button>
              )}
              {!isRightSidebarOpen && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleRightSidebar}
                  className="flex items-center gap-2"
                >
                  <PanelRightOpen className="h-4 w-4" />
                  文件库
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-hidden">
          {renderToolContent()}
        </div>
      </div>
    );
  }

  // 其他工具页面使用标准布局
  return (
    <div className="h-full flex flex-col">
      {/* 顶部标题栏 */}
      <div className="p-4 border-b border-border bg-card/50">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            {getToolTitle(selectedTool)}
          </h1>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              当前工具: {selectedTool}
            </div>
            {!isRightSidebarOpen && (
              <Button
                variant="outline"
                size="sm"
                onClick={toggleRightSidebar}
                className="flex items-center gap-2"
              >
                <PanelRightOpen className="h-4 w-4" />
                文件库
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 overflow-auto">
        {renderToolContent()}
      </div>
    </div>
  );
} 