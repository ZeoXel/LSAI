"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Image, Video, Sparkles } from "lucide-react";
import { useAppStore } from "@/lib/store";

export default function HomePage() {
  const { setSelectedTool } = useAppStore();

  const features = [
    {
      id: "chat",
      title: "AI智能对话",
      description: "与强大的AI助手进行自然对话，获得智能回答和建议",
      icon: MessageSquare,
      color: "text-info",
    },
    {
      id: "image",
      title: "AI图像生成",
      description: "通过文字描述生成精美的AI图像和艺术作品",
      icon: Image,
      color: "text-success",
    },
    {
      id: "video",
      title: "AI视频制作",
      description: "创建动态视频内容，让创意变为现实",
      icon: Video,
      color: "text-accent",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* 欢迎横幅 */}
              <Card className="bg-gradient-to-r from-info/10 to-accent/10 border-info/20">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Sparkles className="h-8 w-8 text-info mr-2" />
            <CardTitle className="text-3xl">欢迎使用 AI Platform</CardTitle>
          </div>
          <CardDescription className="text-lg">
            集成多种AI工具的智能平台，让AI为你的创作赋能
          </CardDescription>
        </CardHeader>
      </Card>

      {/* 功能特性 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Card 
              key={feature.id} 
              className="hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer group"
              onClick={() => setSelectedTool(feature.id)}
            >
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Icon className={`h-6 w-6 ${feature.color} group-hover:scale-110 transition-transform`} />
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4">
                  {feature.description}
                </CardDescription>
                <Button 
                  variant="outline" 
                  className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                >
                  立即使用
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 快速开始 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">快速开始</CardTitle>
          <CardDescription>
            按照以下步骤开始使用AI Platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start space-x-3">
              <div className="bg-info text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                1
              </div>
              <div>
                <h4 className="font-semibold">选择AI工具</h4>
                <p className="text-sm text-muted-foreground">
                  从左侧工具栏选择你需要的AI功能
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="bg-info text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                2
              </div>
              <div>
                <h4 className="font-semibold">上传文件（可选）</h4>
                <p className="text-sm text-muted-foreground">
                  在右侧文件库上传相关文档或媒体文件
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="bg-info text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                3
              </div>
              <div>
                <h4 className="font-semibold">开始创作</h4>
                <p className="text-sm text-muted-foreground">
                  输入你的需求，让AI为你生成内容
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="bg-info text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                4
              </div>
              <div>
                <h4 className="font-semibold">查看结果</h4>
                <p className="text-sm text-muted-foreground">
                  获得AI生成的高质量内容结果
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
