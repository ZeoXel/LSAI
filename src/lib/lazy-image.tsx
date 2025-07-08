"use client";

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { mediaCache } from '@/lib/media-cache-manager';
import { MediaFile } from '@/lib/types';

interface LazyImageProps {
  file: MediaFile;
  className?: string;
  alt?: string;
  priority?: 'high' | 'normal' | 'low';
  onLoad?: () => void;
  onError?: () => void;
  onClick?: () => void;
  children?: React.ReactNode; // 支持覆盖层内容
}

export function LazyImage({ 
  file, 
  className, 
  alt, 
  priority = 'normal',
  onLoad, 
  onError, 
  onClick,
  children 
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 🔍 Intersection Observer 懒加载
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !isLoaded && !isLoading) {
          loadImage();
        }
      },
      {
        rootMargin: '50px', // 提前50px开始加载
        threshold: 0.1
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, [isLoaded, isLoading]);

  // 🚀 加载图片
  const loadImage = async () => {
    if (isLoading || isLoaded) return;
    
    setIsLoading(true);
    try {
      // 检查 mediaCache 是否可用（服务器端兼容性）
      if (!mediaCache) {
        // 在服务器端直接使用原始 URL
        setImageUrl(file.url);
        setIsLoaded(true);
        onLoad?.();
        return;
      }

      // 1. 优先加载缩略图（如果是 Supabase Storage）
      let thumbnailObjectUrl = '';
      if (file.url.includes('supabase.co/storage')) {
        const thumbUrl = mediaCache.getThumbnailUrl(file.url, 200);
        try {
          const thumbBlob = await mediaCache.getMediaBlob(thumbUrl, 'high');
          if (thumbBlob) {
            thumbnailObjectUrl = URL.createObjectURL(thumbBlob);
            setThumbnailUrl(thumbnailObjectUrl);
          }
        } catch (thumbError) {
          console.warn('缩略图加载失败，将加载原始图片:', thumbError);
        }
      }

      // 2. 加载原始图片
      const blob = await mediaCache.getMediaBlob(file.url, priority);
      if (blob) {
        const objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
        setIsLoaded(true);
        onLoad?.();
      } else {
        throw new Error('图片加载失败');
      }
    } catch (error) {
      console.error('图片加载失败:', error);
      setError(true);
      onError?.();
    } finally {
      setIsLoading(false);
    }
  };

  // 🧹 清理 Object URLs
  useEffect(() => {
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
      if (thumbnailUrl) {
        URL.revokeObjectURL(thumbnailUrl);
      }
    };
  }, [imageUrl, thumbnailUrl]);

  // 错误状态
  if (error) {
    return (
      <div 
        ref={containerRef}
        className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground",
          className
        )}
        onClick={onClick}
      >
        <div className="text-center p-4">
          <div className="w-8 h-8 bg-muted-foreground/20 rounded mx-auto mb-2"></div>
          <p className="text-xs">加载失败</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={cn("relative overflow-hidden", className)}
      onClick={onClick}
    >
      {/* 加载中占位符 */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center">
          {isLoading ? (
            <div className="text-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs text-muted-foreground">加载中...</p>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-8 h-8 bg-muted-foreground/20 rounded mx-auto mb-2"></div>
              <p className="text-xs text-muted-foreground">
                {file.mimeType?.split('/')[1]?.toUpperCase() || 'IMG'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* 缩略图（如果有） */}
      {thumbnailUrl && !imageUrl && (
        <img
          src={thumbnailUrl}
          alt={alt || file.fileName}
          className="w-full h-full object-cover filter blur-sm scale-110 transition-all duration-300"
          style={{ opacity: isLoading ? 0.7 : 1 }}
        />
      )}

      {/* 主图片 */}
      {imageUrl && (
        <img
          ref={imgRef}
          src={imageUrl}
          alt={alt || file.fileName}
          className={cn(
            "w-full h-full object-cover transition-all duration-300",
            isLoaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={() => {
            setIsLoaded(true);
            onLoad?.();
          }}
          onError={() => {
            setError(true);
            onError?.();
          }}
        />
      )}

      {/* 覆盖层内容 */}
      {children && (
        <div className="absolute inset-0">
          {children}
        </div>
      )}
    </div>
  );
}

// 🎯 专门用于视频的懒加载组件
interface LazyVideoProps {
  file: MediaFile;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
  onClick?: () => void;
  children?: React.ReactNode;
}

export function LazyVideo({
  file,
  className,
  onLoad,
  onError,
  onClick,
  children
}: LazyVideoProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);

  // 🔍 Intersection Observer 懒加载
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !isLoaded && !isLoading) {
          loadVideo();
        }
      },
      {
        rootMargin: '100px', // 视频提前更多距离加载
        threshold: 0.1
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, [isLoaded, isLoading]);

  // 🚀 加载视频
  const loadVideo = async () => {
    if (isLoading || isLoaded) return;
    
    setIsLoading(true);
    try {
      // 检查 mediaCache 是否可用（服务器端兼容性）
      if (!mediaCache) {
        // 在服务器端直接使用原始 URL
        setVideoUrl(file.url);
        setIsLoaded(true);
        onLoad?.();
        return;
      }

      // 1. 优先加载缩略图
      if (file.thumbnailBlob) {
        const thumbUrl = URL.createObjectURL(file.thumbnailBlob);
        setThumbnailUrl(thumbUrl);
      }

      // 2. 预加载视频（不自动播放）
      const blob = await mediaCache.getMediaBlob(file.url, 'low');
      if (blob) {
        const objectUrl = URL.createObjectURL(blob);
        setVideoUrl(objectUrl);
        setIsLoaded(true);
        onLoad?.();
      } else {
        throw new Error('视频加载失败');
      }
    } catch (error) {
      console.error('视频加载失败:', error);
      setError(true);
      onError?.();
    } finally {
      setIsLoading(false);
    }
  };

  // 🧹 清理 Object URLs
  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
      if (thumbnailUrl) {
        URL.revokeObjectURL(thumbnailUrl);
      }
    };
  }, [videoUrl, thumbnailUrl]);

  // 错误状态
  if (error) {
    return (
      <div 
        ref={containerRef}
        className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground",
          className
        )}
        onClick={onClick}
      >
        <div className="text-center p-4">
          <div className="w-12 h-12 bg-muted-foreground/20 rounded-lg mx-auto mb-2 flex items-center justify-center">
            <span className="text-2xl">🎥</span>
          </div>
          <p className="text-xs">视频加载失败</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={cn("relative overflow-hidden bg-black/10", className)}
      onClick={onClick}
    >
      {/* 缩略图或占位符 */}
      {!videoUrl && (
        <div className="absolute inset-0">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={file.fileName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-muted animate-pulse flex items-center justify-center">
              {isLoading ? (
                <div className="text-center text-white">
                  <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-xs">加载视频...</p>
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  <div className="w-12 h-12 bg-muted-foreground/20 rounded-lg mx-auto mb-2 flex items-center justify-center">
                    <span className="text-2xl">🎥</span>
                  </div>
                  <p className="text-xs">点击加载视频</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 视频元素（仅显示第一帧，不自动播放） */}
      {videoUrl && (
        <video
          src={videoUrl}
          className="w-full h-full object-cover"
          preload="metadata"
          muted
          playsInline
          onLoadedMetadata={(e) => {
            const video = e.currentTarget;
            video.currentTime = 0;
            video.pause();
            setIsLoaded(true);
            onLoad?.();
          }}
          onError={() => {
            setError(true);
            onError?.();
          }}
        />
      )}

      {/* 覆盖层内容 */}
      {children && (
        <div className="absolute inset-0">
          {children}
        </div>
      )}
    </div>
  );
} 