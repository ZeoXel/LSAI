import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

// 🚀 媒体文件骨架屏组件
function MediaItemSkeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div className={cn("relative aspect-square bg-muted rounded-lg overflow-hidden", className)} style={style}>
      {/* 主要内容骨架 */}
      <div className="w-full h-full bg-gradient-to-br from-muted via-muted-foreground/5 to-muted animate-pulse" />
      
      {/* 类型图标骨架 */}
      <div className="absolute top-3 left-3">
        <Skeleton className="h-4 w-4 rounded" />
      </div>
      
      {/* 底部信息骨架 */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
        <Skeleton className="h-3 w-3/4 mb-1 bg-white/20" />
        <Skeleton className="h-2 w-1/2 bg-white/10" />
      </div>
      
      {/* 加载动画光效 */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}

// 🚀 媒体网格骨架屏组件
function MediaGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
      
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: count }).map((_, index) => (
          <MediaItemSkeleton 
            key={index} 
            className="opacity-75" 
            style={{ 
              animationDelay: `${index * 100}ms`,
              animationDuration: '1.5s'
            }}
          />
        ))}
      </div>
    </div>
  );
}

// 🚀 历史记录卡片骨架屏
function HistoryCardSkeleton() {
  return (
    <div className="p-3 bg-card rounded-lg border border-border">
      <div className="flex items-start gap-3">
        {/* 图标骨架 */}
        <Skeleton className="mt-1 h-5 w-5 rounded" />
        
        <div className="flex-1 min-w-0 space-y-2">
          {/* 标题骨架 */}
          <Skeleton className="h-4 w-3/4" />
          
          {/* 内容骨架 */}
          <div className="space-y-1">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          
          {/* 标签骨架 */}
          <div className="flex gap-1">
            <Skeleton className="h-5 w-12 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          
          {/* 元信息骨架 */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-6 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

// 🚀 历史记录列表骨架屏
function HistoryListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <HistoryCardSkeleton key={index} />
      ))}
    </div>
  );
}

export { 
  Skeleton, 
  MediaItemSkeleton, 
  MediaGridSkeleton, 
  HistoryCardSkeleton, 
  HistoryListSkeleton 
}
