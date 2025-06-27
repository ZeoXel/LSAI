/**
 * 设计系统约束 - 提供类型安全的样式选项
 * 🎯 目标：让错误的样式"无法写出来"
 */

// 🎨 核心颜色系统
export const COLORS = {
  primary: 'bg-primary text-primary-foreground',
  secondary: 'bg-secondary text-secondary-foreground',
  muted: 'bg-muted text-muted-foreground',
  accent: 'bg-accent text-accent-foreground',
  destructive: 'bg-destructive text-destructive-foreground',
  card: 'bg-card text-card-foreground',
  popover: 'bg-popover text-popover-foreground',
} as const;

// 🌈 语义化颜色系统 - 替代硬编码颜色
export const SEMANTIC_COLORS = {
  // 状态颜色
  success: {
    text: 'text-success dark:text-success',
    bg: 'bg-success/10 dark:bg-success/20',
    border: 'border-success/30 dark:border-success',
    icon: 'text-success',
  },
  warning: {
    text: 'text-warning dark:text-warning', 
    bg: 'bg-warning/10 dark:bg-warning/20',
    border: 'border-warning/30 dark:border-warning',
    icon: 'text-warning',
  },
  error: {
    text: 'text-error dark:text-error',
    bg: 'bg-error/10 dark:bg-error/20', 
    border: 'border-error/30 dark:border-error',
    icon: 'text-error',
  },
  info: {
    text: 'text-info dark:text-info',
    bg: 'bg-info/10 dark:bg-info/20',
    border: 'border-info/30 dark:border-info',
    icon: 'text-info',
  },
  
  // 功能分类颜色
  chat: {
    text: 'text-info dark:text-info',
    bg: 'bg-info/10 dark:bg-info/20',
    border: 'border-info/30 dark:border-info',
    icon: 'text-info',
    gradient: 'from-blue-500 to-cyan-500',
  },
  workflow: {
    text: 'text-success dark:text-success',
    bg: 'bg-success/10 dark:bg-success/20',
    border: 'border-success/30 dark:border-success',
    icon: 'text-success',
    gradient: 'from-green-500 to-emerald-500',
  },
  image: {
    text: 'text-accent dark:text-accent',
    bg: 'bg-accent/10 dark:bg-accent/20',
    border: 'border-accent/30 dark:border-accent',
    icon: 'text-accent',
    gradient: 'from-purple-500 to-pink-500',
  },
  video: {
    text: 'text-warning dark:text-warning',
    bg: 'bg-warning/10 dark:bg-warning/20',
    border: 'border-warning/30 dark:border-warning',
    icon: 'text-warning',
    gradient: 'from-orange-500 to-red-500',
  },
} as const;

// 📐 间距系统
export const SPACING = {
  xs: 'p-1',    // 4px
  sm: 'p-2',    // 8px
  md: 'p-4',    // 16px
  lg: 'p-6',    // 24px
  xl: 'p-8',    // 32px
  '2xl': 'p-12', // 48px
} as const;

// 🔤 字体大小系统
export const TEXT_SIZES = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
  '3xl': 'text-3xl',
  '4xl': 'text-4xl',
} as const;

// 🔘 圆角系统
export const BORDER_RADIUS = {
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  full: 'rounded-full',
} as const;

// 📏 组件尺寸系统
export const COMPONENT_SIZES = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-base',
  lg: 'h-12 px-6 text-lg',
  xl: 'h-14 px-8 text-xl',
} as const;

// 🎭 变体系统
export const VARIANTS = {
  default: 'default',
  outline: 'outline',
  ghost: 'ghost',
  link: 'link',
  destructive: 'destructive',
} as const;

// 🏗️ 类型定义
export type ColorKey = keyof typeof COLORS;
export type SemanticColorKey = keyof typeof SEMANTIC_COLORS;
export type SpacingKey = keyof typeof SPACING;
export type TextSizeKey = keyof typeof TEXT_SIZES;
export type BorderRadiusKey = keyof typeof BORDER_RADIUS;
export type ComponentSizeKey = keyof typeof COMPONENT_SIZES;
export type VariantKey = keyof typeof VARIANTS;

/**
 * 安全的样式组合器
 * 只能使用预定义的设计token
 */
export function createSafeClasses(config: {
  color?: ColorKey;
  semanticColor?: SemanticColorKey;
  semanticType?: 'text' | 'bg' | 'border' | 'icon' | 'gradient';
  spacing?: SpacingKey;
  textSize?: TextSizeKey;
  borderRadius?: BorderRadiusKey;
  componentSize?: ComponentSizeKey;
  custom?: string; // 仅用于特殊情况
}) {
  let semanticClass = '';
  if (config.semanticColor && config.semanticType) {
    const colorObj = SEMANTIC_COLORS[config.semanticColor] as any;
    semanticClass = colorObj[config.semanticType] || '';
  }

  const classes = [
    config.color && COLORS[config.color],
    semanticClass,
    config.spacing && SPACING[config.spacing],
    config.textSize && TEXT_SIZES[config.textSize],
    config.borderRadius && BORDER_RADIUS[config.borderRadius],
    config.componentSize && COMPONENT_SIZES[config.componentSize],
    config.custom,
  ].filter(Boolean);

  return classes.join(' ');
}

/**
 * 获取语义化颜色
 * 快速获取特定用途的颜色
 */
export function getSemanticColor(key: SemanticColorKey, type: 'text' | 'bg' | 'border' | 'icon' | 'gradient' = 'text') {
  const colorObj = SEMANTIC_COLORS[key] as any;
  return colorObj[type] || '';
}

/**
 * 组件变体管理器
 * 统一管理所有组件的变体
 */
export const COMPONENT_VARIANTS = {
  button: {
    base: 'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
    variants: {
      variant: {
        default: COLORS.primary,
        destructive: COLORS.destructive,
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: COLORS.secondary,
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: COMPONENT_SIZES,
    },
  },
  card: {
    base: 'rounded-lg border bg-card text-card-foreground shadow-sm',
    variants: {
      padding: SPACING,
    },
  },
  input: {
    base: 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  },
} as const;

/**
 * 开发者指南：如何正确使用
 * 
 * ✅ 正确做法：
 * const buttonClass = createSafeClasses({
 *   color: 'primary',
 *   componentSize: 'md',
 *   borderRadius: 'md'
 * });
 * 
 * // 使用语义化颜色
 * const successClass = getSemanticColor('success', 'bg');
 * const errorIcon = getSemanticColor('error', 'icon');
 * 
 * ❌ 错误做法：
 * const buttonClass = 'bg-info p-4 rounded-lg'; // 绕过设计系统
 * 
 * 🎯 核心原则：
 * 1. 始终使用组件库的预定义组件
 * 2. 使用语义化颜色替代硬编码颜色
 * 3. 如需自定义，使用 createSafeClasses 或 getSemanticColor
 * 4. 特殊情况使用 custom 参数，但需要 code review
 * 5. 禁止直接写 className 中的颜色
 */ 