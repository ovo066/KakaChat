import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

const clientComponentTests = [
  'src/features/chat/components/message-blocks/ChatMediaBlock.test.js',
  'src/features/chat/components/message-blocks/ChatBubbleBlock.test.js'
]

export default defineConfig({
  plugins: [vue()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.test.js', 'src/**/*.spec.js'],
          exclude: clientComponentTests
        }
      },
      {
        extends: true,
        test: {
          name: 'components',
          environment: './src/test/vueRendererEnvironment.js',
          include: clientComponentTests
        }
      }
    ]
  }
})

