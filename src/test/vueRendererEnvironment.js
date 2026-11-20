import { builtinEnvironments } from 'vitest/environments'

// Compile Vue components for client updates while using an in-memory renderer in Node.
export default {
  ...builtinEnvironments.node,
  name: 'vue-renderer',
  viteEnvironment: 'client'
}
