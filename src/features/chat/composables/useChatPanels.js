import { ref } from 'vue'
import { makeId } from '../../../utils/id'
import { readUserFile } from '../files/fileMessages'

export function useChatPanels({
  closePlusMenu = () => {},
  compressImage,
  musicStore,
  store,
  showToast = () => {},
  scheduleSave = () => {}
}) {
  const photoInput = ref(null)
  const fileInput = ref(null)
  const showMemoryPanel = ref(false)
  const showMemorySettings = ref(false)

  function openPhotoPicker() {
    closePlusMenu()
    photoInput.value?.click()
  }

  async function handlePhotoInput(e) {
    const files = Array.from(e.target.files || [])
    if (!store.activeChat || files.length === 0) {
      e.target.value = ''
      return
    }
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const dataUrl = await compressImage(file, 400, 0.85)
      store.pendingImages.push(dataUrl)
    }
    e.target.value = ''
  }

  function openFilePicker() {
    closePlusMenu()
    fileInput.value?.click()
  }

  async function handleFileInput(e) {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (!store.activeChat || files.length === 0) return
    let added = 0
    for (const file of files) {
      try {
        const fields = await readUserFile(file)
        store.activeChat.msgs.push({
          id: makeId('msg'),
          role: 'user',
          time: Date.now(),
          readStatus: 'unread',
          ...fields
        })
        added++
        if (fields.fileTruncated) showToast(`${file.name} 过长，只保留了前面部分`)
      } catch (err) {
        showToast(err?.message || '文件读取失败')
      }
    }
    if (added > 0) scheduleSave()
  }

  function removePendingImage(index) {
    store.pendingImages.splice(index, 1)
  }

  function openMemoryPanel() {
    closePlusMenu()
    store.showStickerPanel = false
    store.showStickerManager = false
    showMemorySettings.value = false
    showMemoryPanel.value = true
  }

  function closeMemoryPanel() {
    showMemoryPanel.value = false
    showMemorySettings.value = false
  }

  function openMemorySettings() {
    showMemoryPanel.value = false
    showMemorySettings.value = true
  }

  function backFromMemorySettings() {
    showMemorySettings.value = false
    showMemoryPanel.value = true
  }

  function openMusicLibrary() {
    closePlusMenu()
    musicStore.libraryOpen = true
  }

  return {
    backFromMemorySettings,
    closeMemoryPanel,
    fileInput,
    handleFileInput,
    handlePhotoInput,
    openFilePicker,
    openMemoryPanel,
    openMemorySettings,
    openMusicLibrary,
    openPhotoPicker,
    photoInput,
    removePendingImage,
    showMemoryPanel,
    showMemorySettings
  }
}
