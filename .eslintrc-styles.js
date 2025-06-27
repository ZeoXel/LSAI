module.exports = {
  plugins: ["react", "react-hooks"],
  rules: {
    // 🚫 禁止内联样式
    "react/forbid-dom-props": [
      "error",
      {
        forbid: [
          {
            propName: "style",
            message: "请使用Tailwind类名或组件库，禁止内联样式"
          }
        ]
      }
    ],
    
    // 🚫 禁止使用非标准类名
    "react/forbid-component-props": [
      "error",
      {
        forbid: [
          {
            propName: "className",
            allowedFor: ["div", "span", "button", "input", "form"],
            message: "请使用UI组件库而不是直接添加className"
          }
        ]
      }
    ],
  },
  
  // 自定义规则：检查Tailwind类名合规性
  overrides: [
    {
      files: ["**/*.tsx", "**/*.jsx"],
      rules: {
        // 这里可以添加自定义的Tailwind类名检查规则
      }
    }
  ]
}; 