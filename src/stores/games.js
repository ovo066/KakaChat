import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { idbGet, idbSet } from '../composables/storage/idbKv'
import { makeId } from '../utils/id'

const STORAGE_KEY = 'gamesData'
const MAX_SESSIONS = 60

/**
 * 小游戏数据：海龟汤对局、自定义题目。
 * 独立 IndexedDB key，不进 appData 快照，避免撑大主存档。
 */
export const useGamesStore = defineStore('games', () => {
  /** @type {import('vue').Ref<Array<any>>} */
  const soupSessions = ref([])
  /** @type {import('vue').Ref<Array<any>>} */
  const customSoups = ref([])
  /** 在线题库（运行时下载，不随仓库分发） */
  const librarySoups = ref([])
  const librarySource = ref(null)
  const loaded = ref(false)
  let saveTimer = null

  async function load() {
    if (loaded.value) return
    try {
      const data = await idbGet(STORAGE_KEY)
      if (data && typeof data === 'object') {
        if (Array.isArray(data.soupSessions)) soupSessions.value = data.soupSessions
        if (Array.isArray(data.customSoups)) customSoups.value = data.customSoups
        if (Array.isArray(data.librarySoups)) librarySoups.value = data.librarySoups
        if (data.librarySource) librarySource.value = data.librarySource
      }
    } catch (e) {
      console.warn('[games] load failed', e)
    }
    loaded.value = true
  }

  function exportData() {
    return JSON.parse(JSON.stringify({ soupSessions: soupSessions.value, customSoups: customSoups.value, librarySoups: librarySoups.value, librarySource: librarySource.value }))
  }

  function scheduleSave() {
    if (!loaded.value) return
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      idbSet(STORAGE_KEY, exportData()).catch(e => console.warn('[games] save failed', e))
    }, 300)
  }

  watch([soupSessions, customSoups, librarySoups], scheduleSave, { deep: true })

  function startSoupSession(puzzle, companionId = null) {
    const session = {
      id: makeId('soup'),
      puzzle: JSON.parse(JSON.stringify(puzzle)),
      companionId,
      hostId: null,
      log: [],
      hintsUsed: 0,
      status: 'playing',
      startedAt: Date.now(),
      endedAt: null
    }
    soupSessions.value.unshift(session)
    if (soupSessions.value.length > MAX_SESSIONS) soupSessions.value.length = MAX_SESSIONS
    return session
  }

  function getSoupSession(id) {
    return soupSessions.value.find(s => s.id === id) || null
  }

  function removeSoupSession(id) {
    soupSessions.value = soupSessions.value.filter(s => s.id !== id)
  }

  function isSoupSolved(puzzleId) {
    return soupSessions.value.some(s => s.puzzle?.id === puzzleId && s.status === 'solved')
  }

  function addCustomSoup(puzzle) {
    const item = { ...puzzle, id: puzzle.id || makeId('soupq'), custom: true, createdAt: Date.now() }
    customSoups.value.unshift(item)
    return item
  }

  function setLibrary(list, source) {
    librarySoups.value = list
    librarySource.value = source
  }

  function removeCustomSoup(id) {
    customSoups.value = customSoups.value.filter(p => p.id !== id)
  }

  return {
    soupSessions,
    customSoups,
    librarySoups,
    librarySource,
    setLibrary,
    loaded,
    load,
    exportData,
    startSoupSession,
    getSoupSession,
    removeSoupSession,
    isSoupSolved,
    addCustomSoup,
    removeCustomSoup
  }
})
