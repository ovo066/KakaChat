/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.vue',
    // 少数 JS 文件以字符串形式声明 Tailwind 类名（如加号菜单图标底色），必须列在这里才会生成
    './src/features/chat/composables/chatInputMenuItems.js'
  ],
  theme: {
    extend: {
      colors: {
        ios: {
          blue: '#007AFF',
          gray: '#E9E9EB',
          grayDark: '#262626',
          green: '#34C759',
          red: '#FF3B30'
        }
      }
    }
  },
  plugins: []
}
