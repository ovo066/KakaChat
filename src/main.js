import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { installIosContextMenuPolyfill } from './bootstrap/installIosContextMenuPolyfill'
import { installViewportSync } from './bootstrap/installViewportSync'
import { registerServiceWorker } from './bootstrap/registerServiceWorker'
import { createAppRuntimeBootstrap } from './bootstrap/appRuntime'
import { useAccessControl } from './composables/useAccessControl'
import { useAccessControlStore } from './stores/accessControl'
import { useStorage } from './composables/useStorage'
import { useGiftsStore } from './stores/gifts'
import { registerCustomGiftSource } from './data/gifts'
import { useCloudSync } from './composables/useCloudSync'
import { installDebugLogCapture } from './composables/useDebugLog'
import { applyEarlyAppearanceHint, installAppearanceAutoSwitch } from './composables/useAppearanceMode'
import '@phosphor-icons/web/regular'
import '@phosphor-icons/web/bold'
import '@phosphor-icons/web/fill'
import './style.css'

installIosContextMenuPolyfill()
installViewportSync()
installDebugLogCapture()
applyEarlyAppearanceHint()

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)
installAppearanceAutoSwitch()
const storageApi = useStorage()
const accessStore = useAccessControlStore()
const giftsStore = useGiftsStore()
registerCustomGiftSource(() => giftsStore.customGifts)
app.mount('#app')
registerServiceWorker()

const runtimeBootstrap = createAppRuntimeBootstrap({
  accessStore,
  storageApi,
  bootstrapCloudSync: (options = {}) => {
    const { bootstrapCloudSync } = useCloudSync(storageApi)
    return bootstrapCloudSync(options)
  },
  onStorageLoadError: (err) => {
    console.warn('Initial app data load failed:', err)
  },
  onCloudSyncError: (err) => {
    console.warn('Cloud sync bootstrap failed:', err)
  }
})

runtimeBootstrap.startAccessWatcher()

async function bootstrap() {
  try {
    const { bootstrapAccessControl } = useAccessControl()
    const canAccessApp = await bootstrapAccessControl()
    if (!canAccessApp) {
      return
    }
  } catch (err) {
    console.warn('Access control bootstrap failed:', err)
    accessStore.blockAccess('访问验证服务暂不可用', {
      enabled: true,
      configured: false,
      errorCode: 'service_unavailable'
    })
    return
  }

  await runtimeBootstrap.ensureLoaded()
}

void bootstrap()
