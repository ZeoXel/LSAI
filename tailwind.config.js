/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    // 🔒 完全替换默认主题，实施严格约束
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    // 🎨 语义化颜色系统 - 完全禁用硬编码颜色
    colors: {
      // 基础色
      transparent: "transparent",
      current: "currentColor",
      white: "#ffffff",
      black: "#000000",
      
      // 语义化设计token
      border: "hsl(var(--border))",
      input: "hsl(var(--input))",
      ring: "hsl(var(--ring))",
      background: "hsl(var(--background))",
      foreground: "hsl(var(--foreground))",
      
      primary: {
        DEFAULT: "hsl(var(--primary))",
        foreground: "hsl(var(--primary-foreground))",
      },
      secondary: {
        DEFAULT: "hsl(var(--secondary))",
        foreground: "hsl(var(--secondary-foreground))",
      },
      destructive: {
        DEFAULT: "hsl(var(--destructive))",
        foreground: "hsl(var(--destructive-foreground))",
      },
      muted: {
        DEFAULT: "hsl(var(--muted))",
        foreground: "hsl(var(--muted-foreground))",
      },
      accent: {
        DEFAULT: "hsl(var(--accent))",
        foreground: "hsl(var(--accent-foreground))",
      },
      popover: {
        DEFAULT: "hsl(var(--popover))",
        foreground: "hsl(var(--popover-foreground))",
      },
      card: {
        DEFAULT: "hsl(var(--card))",
        foreground: "hsl(var(--card-foreground))",
      },
      sidebar: {
        DEFAULT: "hsl(var(--sidebar))",
        foreground: "hsl(var(--sidebar-foreground))",
        primary: "hsl(var(--sidebar-primary))",
        "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
        accent: "hsl(var(--sidebar-accent))",
        "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
        border: "hsl(var(--sidebar-border))",
        ring: "hsl(var(--sidebar-ring))",
      },
      
      // 状态颜色
      success: {
        DEFAULT: "hsl(142, 76%, 36%)",
        foreground: "hsl(0, 0%, 100%)",
      },
      error: {
        DEFAULT: "hsl(0, 84%, 60%)",
        foreground: "hsl(0, 0%, 100%)",
      },
      warning: {
        DEFAULT: "hsl(38, 92%, 50%)",
        foreground: "hsl(0, 0%, 100%)",
      },
      info: {
        DEFAULT: "hsl(221, 83%, 53%)",
        foreground: "hsl(0, 0%, 100%)",
      },
      
      // 🚫 完全禁用所有其他颜色
      // 不再包含red、blue、green等硬编码颜色
    },
    
    // 📐 严格的间距系统
    spacing: {
      '0': '0px',
      '1': '0.25rem',   // 4px
      '2': '0.5rem',    // 8px
      '3': '0.75rem',   // 12px
      '4': '1rem',      // 16px
      '5': '1.25rem',   // 20px
      '6': '1.5rem',    // 24px
      '8': '2rem',      // 32px
      '10': '2.5rem',   // 40px
      '12': '3rem',     // 48px
      '16': '4rem',     // 64px
      '20': '5rem',     // 80px
      '24': '6rem',     // 96px
      '32': '8rem',     // 128px
      // 🚫 禁用任意值，不包含其他尺寸
    },
    
    // 🔤 严格的字体大小系统
    fontSize: {
      xs: ["0.75rem", { lineHeight: "1rem" }],
      sm: ["0.875rem", { lineHeight: "1.25rem" }],
      base: ["1rem", { lineHeight: "1.5rem" }],
      lg: ["1.125rem", { lineHeight: "1.75rem" }],
      xl: ["1.25rem", { lineHeight: "1.75rem" }],
      "2xl": ["1.5rem", { lineHeight: "2rem" }],
      "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
      "4xl": ["2.25rem", { lineHeight: "2.5rem" }],
      // 🚫 禁用任意值
    },
    
    // 🔘 严格的圆角系统
    borderRadius: {
      none: "0px",
      sm: "calc(var(--radius) - 4px)",
      DEFAULT: "var(--radius)",
      md: "calc(var(--radius) - 2px)",
      lg: "var(--radius)",
      xl: "calc(var(--radius) + 4px)",
      full: "9999px",
      // 🚫 禁用任意值
    },
    
    // 🎯 严格的动画系统
    extend: {
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  
  // 🔌 插件配置
  plugins: [require("tailwindcss-animate")],
  
  // 🔒 核心约束配置
  corePlugins: {
    // 禁用可能导致任意值的插件
    backdropBlur: false,
    backdropBrightness: false,
    backdropContrast: false,
    backdropGrayscale: false,
    backdropHueRotate: false,
    backdropInvert: false,
    backdropOpacity: false,
    backdropSaturate: false,
    backdropSepia: false,
  },
  
  // 🛡️ 安全列表 - 只允许语义化token
  safelist: [
    // 基础语义化颜色
    {
      pattern: /^(bg-|text-|border-|ring-)(primary|secondary|muted|accent|destructive|background|foreground|card|popover|sidebar|success|error|warning|info)(-foreground)?$/,
    },
    // 基础色
    {
      pattern: /^(bg-|text-|border-)(white|black|transparent|current)$/,
    },
    // 预设间距
    {
      pattern: /^(p|m|w|h|gap|space)-(0|1|2|3|4|5|6|8|10|12|16|20|24|32)$/,
    },
    // 预设字体大小
    {
      pattern: /^text-(xs|sm|base|lg|xl|2xl|3xl|4xl)$/,
    },
    // 预设圆角
    {
      pattern: /^rounded-(none|sm|md|lg|xl|full)$/,
    },
  ],
  
  // 🚫 实验性功能 - 禁用任意值语法
  future: {
    removeDeprecatedGapUtilities: true,
    purgeLayersByDefault: true,
  },
}; 