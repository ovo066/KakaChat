<template>
  <div class="sp-root sp-menu" :data-theme="settingsStore.isDark ? 'night' : 'day'">
    <header class="sp-top">
      <button class="sp-icon" type="button" aria-label="返回" @click="router.push('/games')"><i class="ph-bold ph-caret-left"></i></button>
      <span class="sp-top-fill"></span>
      <button class="sp-icon" type="button" aria-label="导入题库" @click="fileInput?.click()"><i class="ph-bold ph-download-simple"></i></button>
      <input ref="fileInput" type="file" accept="application/json,.json" hidden @change="onImport">
    </header>

    <section class="sp-hero">
      <span class="sp-hero-eyebrow">TURTLE SOUP · 今日供应</span>
      <h1>海龟汤</h1>
      <p>汤面给你，真相要自己问出来。</p>
    </section>

    <!-- 抽汤：3D 牌堆 -->
    <section class="sp-draw">
      <div class="sp-deck" :class="{ shuffling, drawn: !!drawn }" @click="!drawn && drawSoup()">
        <span v-for="n in 3" :key="n" class="sp-deck-card sp-card-back" :style="{ '--i': n }"></span>
        <div class="sp-flip" :class="{ flipped: !!drawn }">
          <div class="sp-face sp-card-back">
            <span class="sp-back-mark"><i class="ph-fill ph-bowl-steam"></i></span>
            <span class="sp-back-txt">点我抽一碗</span>
          </div>
          <div class="sp-face sp-face-front" :class="drawn ? `d-${drawn.difficulty}` : ''">
            <template v-if="drawn">
              <span class="sp-front-rank">{{ SOUP_DIFFICULTY_LABELS[drawn.difficulty] }}</span>
              <b class="sp-front-title">{{ drawn.title }}</b>
              <p class="sp-front-story">{{ drawn.story }}</p>
              <span class="sp-front-cat">{{ drawn.category }}</span>
            </template>
          </div>
        </div>
      </div>
      <div class="sp-draw-actions">
        <template v-if="drawn">
          <button class="sp-btn sp-btn--ghost" type="button" @click="redraw"><i class="ph-bold ph-arrows-clockwise"></i>换一碗</button>
          <button class="sp-btn sp-btn--main" type="button" @click="startPuzzle(drawn)"><i class="ph-fill ph-bowl-steam"></i>就喝这碗</button>
        </template>
        <button v-else class="sp-btn sp-btn--main" type="button" :disabled="shuffling" @click="drawSoup"><i class="ph-fill ph-shuffle"></i>随机抽汤</button>
      </div>
    </section>

    <section v-if="!gamesStore.librarySoups?.length" class="sp-lib">
      <div class="sp-lib-stack" aria-hidden="true"><span></span><span></span><span></span></div>
      <div class="sp-lib-txt">
        <b>{{ SOUP_LIBRARIES[0].name }}</b>
        <small>{{ SOUP_LIBRARIES[0].count }} 道真人出的好汤 · 一键装进汤谱</small>
      </div>
      <button class="sp-btn sp-btn--main sp-lib-btn" type="button" :disabled="libLoading" @click="loadLibrary">
        <i :class="libLoading ? 'ph-bold ph-spinner sp-spin' : 'ph-bold ph-download-simple'"></i>{{ libLoading ? '' : '获取' }}
      </button>
    </section>

    <section class="sp-brew" :class="{ open: brewOpen }">
      <button class="sp-brew-head" type="button" @click="brewOpen = !brewOpen">
        <span class="sp-brew-ic"><i class="ph-fill ph-fire"></i></span>
        <span class="sp-brew-txt"><b>请主厨现熬一碗</b><small>AI 原创出题，每碗都不一样</small></span>
        <i class="ph-bold ph-caret-down sp-brew-caret"></i>
      </button>
      <div v-if="brewOpen" class="sp-brew-body">
        <div class="sp-opt">
          <span>口味</span>
          <button v-for="c in ['本格', '变格']" :key="c" type="button" :class="{ on: brew.category === c }" @click="brew.category = c">{{ c }}</button>
        </div>
        <div class="sp-opt">
          <span>辣度</span>
          <button v-for="(label, d) in SOUP_DIFFICULTY_LABELS" :key="d" type="button" :class="{ on: brew.difficulty === d }" @click="brew.difficulty = d">{{ label }}</button>
        </div>
        <input v-model="brew.theme" class="sp-theme" placeholder="加点料（可选）：雨夜、外卖、旧照片…" maxlength="30">
        <button class="sp-btn sp-btn--main" type="button" :disabled="brewing" @click="onBrew">
          <i :class="brewing ? 'ph-bold ph-spinner sp-spin' : 'ph-fill ph-fire'"></i>
          {{ brewing ? '熬汤中…' : '开火' }}
        </button>
      </div>
    </section>
    <p v-if="error" class="sp-error">{{ error }}</p>

    <section v-if="ongoing.length" class="sp-group">
      <h2 class="sp-h2">还没喝完</h2>
      <div class="sp-tickets">
        <button v-for="s in ongoing" :key="s.id" class="sp-ticket" type="button" @click="openSession(s.id)">
          <span class="sp-ticket-no">已问 {{ s.log.filter(e => e.kind === 'ask' || e.kind === 'guess').length }}</span>
          <b>{{ s.puzzle.title }}</b>
          <small>继续 →</small>
        </button>
      </div>
    </section>

    <section class="sp-group">
      <div class="sp-group-head">
        <h2 class="sp-h2">汤谱 <small>{{ visiblePuzzles.length }}</small></h2>
        <div class="sp-filter">
          <button v-for="f in filters" :key="f" type="button" :class="{ on: filter === f }" @click="filter = f">{{ f }}</button>
        </div>
      </div>
      <div class="sp-grid">
        <div
          v-for="(p, i) in visiblePuzzles"
          :key="p.id"
          class="sp-card"
          :class="`d-${p.difficulty}`"
          role="button"
          tabindex="0"
          :style="{ '--delay': Math.min(i, 10) * 45 + 'ms' }"
          @pointermove="tilt"
          @pointerleave="untilt"
          @click="startPuzzle(p)"
          @keydown.enter="startPuzzle(p)"
        >
          <div class="sp-card-in">
            <span class="sp-card-shine" aria-hidden="true"></span>
            <span class="sp-card-rank">{{ SOUP_DIFFICULTY_LABELS[p.difficulty] }}</span>
            <span v-if="gamesStore.isSoupSolved(p.id)" class="sp-card-done"><i class="ph-fill ph-seal-check"></i></span>
            <b class="sp-card-title">{{ p.title }}</b>
            <p class="sp-card-story">{{ p.story }}</p>
            <span class="sp-card-foot">{{ p.category }}<template v-if="p.custom"> · 我的</template></span>
            <button v-if="p.custom" class="sp-del" type="button" aria-label="删除" @click.stop="gamesStore.removeCustomSoup(p.id)"><i class="ph-bold ph-x"></i></button>
          </div>
        </div>
      </div>
      <p v-if="!visiblePuzzles.length" class="sp-foot">这里还空着，让主厨熬一碗或导入题库吧。</p>
      <p v-if="gamesStore.librarySource" class="sp-foot">
        精选题库来自 <a :href="gamesStore.librarySource.home" target="_blank" rel="noopener">{{ gamesStore.librarySource.name }}</a>（GPL-3.0）。{{ gamesStore.librarySource.credit }}。
        <button type="button" class="sp-link" @click="gamesStore.setLibrary([], null)">移除</button>
      </p>
      <p class="sp-foot">导入题库：JSON 数组，每项含 title / story / answer / hints</p>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '../../../stores/settings'
import { useGamesStore } from '../../../stores/games'
import { BUILTIN_SOUPS, SOUP_DIFFICULTY_LABELS } from '../data/soups'
import { SOUP_LIBRARIES, downloadSoupLibrary, generateSoupPuzzle, parseSoupLibrary } from '../composables/useTurtleSoup'

const router = useRouter()
const settingsStore = useSettingsStore()
const gamesStore = useGamesStore()

const fileInput = ref(null)
const brewing = ref(false)
const brewOpen = ref(false)
const error = ref('')
const brew = reactive({ category: '本格', difficulty: 'medium', theme: '' })
const filters = ['全部', '本格', '变格', '我的']
const libLoading = ref(false)
const filter = ref('全部')
const drawn = ref(null)
const shuffling = ref(false)

onMounted(() => gamesStore.load())

const ongoing = computed(() => gamesStore.soupSessions.filter(s => s.status === 'playing').slice(0, 8))
const allPuzzles = computed(() => [...gamesStore.customSoups, ...BUILTIN_SOUPS, ...(gamesStore.librarySoups || [])])
const visiblePuzzles = computed(() => {
  if (filter.value === '我的') return gamesStore.customSoups
  if (filter.value === '全部') return allPuzzles.value
  return allPuzzles.value.filter(p => p.category === filter.value)
})

function drawSoup() {
  if (shuffling.value) return
  const unsolved = allPuzzles.value.filter(p => !gamesStore.isSoupSolved(p.id) && p.id !== drawn.value?.id)
  const pool = unsolved.length ? unsolved : allPuzzles.value
  if (!pool.length) return
  shuffling.value = true
  setTimeout(() => {
    drawn.value = pool[Math.floor(Math.random() * pool.length)]
    shuffling.value = false
  }, 650)
}

function redraw() {
  drawn.value = null
  setTimeout(drawSoup, 380)
}

function tilt(e) {
  if (e.pointerType === 'touch') return
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  const x = (e.clientX - r.left) / r.width - 0.5
  const y = (e.clientY - r.top) / r.height - 0.5
  el.style.setProperty('--rx', `${(-y * 14).toFixed(2)}deg`)
  el.style.setProperty('--ry', `${(x * 16).toFixed(2)}deg`)
  el.style.setProperty('--mx', `${((x + 0.5) * 100).toFixed(1)}%`)
  el.style.setProperty('--my', `${((y + 0.5) * 100).toFixed(1)}%`)
}

function untilt(e) {
  const el = e.currentTarget
  el.style.setProperty('--rx', '0deg')
  el.style.setProperty('--ry', '0deg')
}

async function loadLibrary() {
  const lib = SOUP_LIBRARIES[0]
  error.value = ''
  libLoading.value = true
  try {
    const list = await downloadSoupLibrary(lib)
    gamesStore.setLibrary(list, { id: lib.id, name: lib.name, home: lib.home, credit: lib.credit, at: Date.now() })
    error.value = `已装入 ${list.length} 道题`
  } catch (e) {
    error.value = e?.message || String(e)
  } finally {
    libLoading.value = false
  }
}

function openSession(id) {
  router.push(`/games/soup/${id}`)
}

function startPuzzle(puzzle) {
  const session = gamesStore.startSoupSession(puzzle)
  openSession(session.id)
}

async function onBrew() {
  error.value = ''
  brewing.value = true
  try {
    const puzzle = await generateSoupPuzzle({ ...brew })
    const saved = gamesStore.addCustomSoup(puzzle)
    startPuzzle(saved)
  } catch (e) {
    error.value = e?.message || String(e)
  } finally {
    brewing.value = false
  }
}

async function onImport(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  error.value = ''
  try {
    const list = parseSoupLibrary(await file.text())
    if (!list.length) throw new Error('没有识别到题目')
    const existing = new Set(gamesStore.customSoups.map(p => p.story))
    let added = 0
    for (const p of list) {
      if (existing.has(p.story)) continue
      gamesStore.addCustomSoup(p)
      added++
    }
    filter.value = '我的'
    error.value = `已导入 ${added} 道题`
  } catch (e) {
    error.value = `导入失败：${e?.message || e}`
  }
}
</script>

<style scoped>
@import '../games.css';
.sp-top { margin-bottom: 0; }
.sp-top-fill { flex: 1; }

.sp-hero { padding: 2px 4px 6px; text-align: center; }
.sp-hero-eyebrow { font-size: 10px; letter-spacing: .3em; font-weight: 700; color: var(--accent); }
.sp-hero h1 { margin: 4px 0 2px; font-family: var(--hand); font-size: 40px; font-weight: 700; letter-spacing: .08em; line-height: 1.1; }
.sp-hero p { margin: 0; font-family: var(--hand); font-size: 14px; color: var(--ink-2); }

/* ---------- 卡背/卡面共用 ---------- */
.sp-card-back {
  background:
    radial-gradient(circle at 50% 50%, transparent 38%, rgba(243, 207, 122, .14) 39% 40%, transparent 41%),
    repeating-conic-gradient(from 0deg, rgba(243, 207, 122, .07) 0 10deg, transparent 10deg 20deg),
    radial-gradient(120% 90% at 30% 0%, #3E7C82, #183B47 60%, #0F262E);
  border: 1px solid rgba(243, 207, 122, .35);
  box-shadow: inset 0 0 0 6px #142F38, inset 0 0 0 7px rgba(243, 207, 122, .45);
}

/* ---------- 抽汤 ---------- */
.sp-draw { display: flex; flex-direction: column; align-items: center; padding: 18px 0 10px; }
.sp-deck { position: relative; width: 186px; height: 252px; perspective: 1100px; cursor: pointer; }
.sp-deck.drawn { cursor: default; }
.sp-deck-card {
  position: absolute; inset: 0; border-radius: 16px;
  transform: translate(calc(var(--i) * 5px - 10px), calc(var(--i) * 4px)) rotate(calc(var(--i) * 3deg - 6deg));
  opacity: .9; transition: transform .5s cubic-bezier(.3, 1.4, .45, 1);
  box-shadow: 0 16px 24px -18px rgba(0,0,0,.7);
}
.sp-deck.shuffling .sp-deck-card { animation: sp-shuffle .32s ease-in-out 2 alternate; animation-delay: calc(var(--i) * 40ms); }
.sp-deck.drawn .sp-deck-card { transform: translate(calc(var(--i) * 16px - 32px), 18px) rotate(calc(var(--i) * 7deg - 14deg)) scale(.92); opacity: .55; }
.sp-flip {
  position: absolute; inset: 0; transform-style: preserve-3d;
  transition: transform .8s cubic-bezier(.3, 1.25, .45, 1);
  animation: sp-float 4s ease-in-out infinite;
}
.sp-deck.shuffling .sp-flip { animation: sp-lift .65s ease-in-out; }
.sp-flip.flipped { transform: rotateY(180deg) translateY(-6px); animation: none; }
.sp-face {
  position: absolute; inset: 0; border-radius: 16px; backface-visibility: hidden; -webkit-backface-visibility: hidden;
  display: flex; flex-direction: column; overflow: hidden;
  box-shadow: 0 26px 40px -24px rgba(20, 47, 56, .9);
}
.sp-face.sp-card-back { align-items: center; justify-content: center; gap: 10px; color: #F3CF7A; }
.sp-back-mark { width: 74px; height: 74px; border-radius: 50%; display: grid; place-items: center; font-size: 40px; border: 1.5px solid rgba(243, 207, 122, .5); background: rgba(0,0,0,.18); }
.sp-back-txt { font-family: var(--hand); font-size: 14px; letter-spacing: .2em; opacity: .85; }
.sp-face-front {
  transform: rotateY(180deg); padding: 18px 16px 14px;
  background: linear-gradient(160deg, #FFFDF7, #F4ECDC); color: #2E2823;
  border: 1px solid rgba(0,0,0,.06);
}
.sp-face-front::before { content: ''; position: absolute; inset: 7px; border-radius: 11px; border: 1.5px solid var(--rank-c, #D99A3E); opacity: .5; pointer-events: none; }
.sp-face-front::after { content: ''; position: absolute; inset: 0; background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,.75) 46%, transparent 60%); transform: translateX(-120%); }
.sp-flip.flipped .sp-face-front::after { animation: sp-shine 1.1s .45s ease-out both; }
.sp-front-rank { align-self: flex-start; font-size: 11px; font-weight: 700; color: #fff; padding: 2px 9px; border-radius: 99px; background: var(--rank-c, #D99A3E); letter-spacing: .1em; }
.sp-front-title { margin: 10px 0 6px; font-family: var(--hand); font-size: 24px; }
.sp-front-story { flex: 1; margin: 0; font-family: var(--hand); font-size: 13.5px; line-height: 1.7; color: #5A4E43; display: -webkit-box; -webkit-line-clamp: 6; -webkit-box-orient: vertical; overflow: hidden; }
.sp-front-cat { font-size: 11px; color: #A79B8B; text-align: right; }
.d-easy { --rank-c: #5E9C95; }
.d-medium { --rank-c: #D99A3E; }
.d-hard { --rank-c: #C9473A; }
.sp-draw-actions { display: flex; gap: 10px; margin-top: 26px; }

/* ---------- 按钮 ---------- */
.sp-btn {
  display: inline-flex !important; align-items: center; justify-content: center; gap: 6px;
  padding: 11px 20px !important; border-radius: 99px; font-weight: 600; font-size: 14px;
  transition: transform .15s, box-shadow .15s;
}
.sp-btn:active { transform: translateY(2px); }
.sp-btn--main { background: var(--accent) !important; color: #fff !important; box-shadow: 0 4px 0 #9E3A27, 0 10px 18px -10px rgba(208, 84, 60, .8); }
.sp-btn--main:active { box-shadow: 0 2px 0 #9E3A27; }
.sp-btn--main:disabled { opacity: .7; }
.sp-btn--ghost { background: var(--card) !important; box-shadow: 0 4px 0 var(--line), var(--shadow); }

/* ---------- 精选题库 ---------- */
.sp-lib { display: flex; align-items: center; gap: 14px; margin: 14px 0 0; padding: 14px; border-radius: 16px; background: var(--card); box-shadow: var(--shadow); border: 1.5px dashed color-mix(in srgb, var(--accent) 40%, transparent); }
.sp-lib-stack { position: relative; flex: none; width: 40px; height: 50px; }
.sp-lib-stack span { position: absolute; inset: 0; border-radius: 6px; background: radial-gradient(120% 90% at 30% 0%, #3E7C82, #183B47); border: 1px solid rgba(243, 207, 122, .4); }
.sp-lib-stack span:nth-child(1) { rotate: -12deg; translate: -4px 2px; opacity: .6; }
.sp-lib-stack span:nth-child(2) { rotate: 6deg; translate: 4px 0; opacity: .8; }
.sp-lib-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.sp-lib-txt b { font-family: var(--hand); font-size: 16px; }
.sp-lib-txt small { font-size: 11.5px; color: var(--ink-2); }
.sp-lib-btn { padding: 8px 14px !important; font-size: 13px; }
.sp-foot a { color: var(--ink-2); }
.sp-link { text-decoration: underline; color: var(--ink-2) !important; font-size: 11px !important; }

/* ---------- 主厨 ---------- */
.sp-brew { margin: 14px 0 6px; border-radius: 16px; background: var(--ink); color: var(--paper); box-shadow: var(--shadow); overflow: hidden; }
.sp-brew-head { width: 100%; display: flex; align-items: center; gap: 12px; padding: 12px 14px; }
.sp-brew-ic { width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center; background: var(--accent); color: #fff; font-size: 18px; flex: none; }
.sp-brew-txt { flex: 1; display: flex; flex-direction: column; }
.sp-brew-txt b { font-family: var(--hand); font-size: 17px; }
.sp-brew-txt small { font-size: 11.5px; opacity: .6; }
.sp-brew-caret { transition: rotate .25s; opacity: .6; }
.sp-brew.open .sp-brew-caret { rotate: 180deg; }
.sp-brew-body { padding: 0 14px 14px; display: flex; flex-direction: column; gap: 10px; animation: sp-in .25s both; }
.sp-brew-body .sp-btn--main { box-shadow: 0 4px 0 #9E3A27; }
.sp-opt { display: flex; align-items: center; gap: 6px; }
.sp-opt span { width: 34px; font-size: 12px; opacity: .55; }
.sp-opt button { padding: 5px 13px; border-radius: 99px; font-size: 13px; border: 1px solid rgba(255,255,255,.18) !important; opacity: .75; }
.sp-opt button.on { background: var(--paper) !important; color: var(--ink) !important; opacity: 1; font-weight: 600; }
.sp-theme { width: 100%; padding: 8px 2px; border: 0; border-bottom: 1.5px dashed rgba(255,255,255,.3); background: transparent; color: inherit; font-family: var(--hand); font-size: 14px; outline: none; }
.sp-theme::placeholder { color: inherit; opacity: .4; }
.sp-error { margin: 4px 0 0; font-size: 12px; color: var(--accent); text-align: center; }

/* ---------- 分组 ---------- */
.sp-group { margin-top: 24px; }
.sp-h2 { margin: 0 0 12px; font-family: var(--hand); font-size: 20px; font-weight: 700; display: inline-block; background: linear-gradient(transparent 62%, rgba(247, 205, 92, .6) 62%); padding: 0 2px; }
.sp-h2 small { font-size: 13px; color: var(--ink-3); font-weight: 400; }
.sp-group-head { display: flex; align-items: center; justify-content: space-between; }
.sp-filter { display: flex; gap: 2px; margin-bottom: 12px; }
.sp-filter button { font-size: 12.5px; padding: 3px 10px; border-radius: 99px; color: var(--ink-2); }
.sp-filter button.on { background: var(--ink); color: var(--paper); }

.sp-tickets { display: flex; gap: 10px; overflow-x: auto; padding: 2px 2px 10px; scrollbar-width: none; }
.sp-ticket {
  flex: none; width: 130px; display: flex !important; flex-direction: column; gap: 2px; padding: 10px 14px !important;
  background: var(--card) !important; border-radius: 6px;
  -webkit-mask: radial-gradient(circle 7px at 0 50%, transparent 97%, #000 100%);
          mask: radial-gradient(circle 7px at 0 50%, transparent 97%, #000 100%);
  filter: drop-shadow(0 6px 8px rgba(90, 60, 30, .18));
}
.sp-ticket-no { font-size: 11px; color: var(--accent); font-weight: 700; }
.sp-ticket b { font-family: var(--hand); font-size: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sp-ticket small { font-size: 11px; color: var(--ink-3); }

/* ---------- 汤谱：3D 卡片 ---------- */
.sp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.sp-card { --rx: 0deg; --ry: 0deg; --mx: 50%; --my: 0%; perspective: 700px; cursor: pointer; animation: sp-drop .5s cubic-bezier(.3, 1.4, .45, 1) both; animation-delay: var(--delay); }
.sp-card-in {
  position: relative; height: 196px; display: flex; flex-direction: column; overflow: hidden;
  padding: 14px 13px 11px; border-radius: 14px;
  background: linear-gradient(165deg, var(--card), color-mix(in srgb, var(--card) 88%, var(--rank-c)));
  border: 1px solid color-mix(in srgb, var(--rank-c) 30%, transparent);
  box-shadow: 0 1px 0 rgba(255,255,255,.6) inset, 0 18px 26px -20px rgba(60, 40, 20, .7), 0 3px 0 color-mix(in srgb, var(--rank-c) 35%, var(--card));
  transform: rotateX(var(--rx)) rotateY(var(--ry));
  transition: transform .18s ease-out, box-shadow .2s;
  transform-style: preserve-3d;
}
.sp-card:active .sp-card-in { transform: scale(.96); }
.sp-card-in::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--rank-c); }
.sp-card-shine { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(circle at var(--mx) var(--my), rgba(255,255,255,.55), transparent 55%); opacity: 0; transition: opacity .2s; mix-blend-mode: soft-light; }
.sp-card:hover .sp-card-shine { opacity: 1; }
.sp-card-rank { align-self: flex-start; font-size: 10.5px; font-weight: 700; color: #fff; padding: 1px 8px; border-radius: 99px; background: var(--rank-c); transform: translateZ(20px); }
.sp-card-done { position: absolute; right: 10px; top: 11px; font-size: 20px; color: #3E8E7E; transform: translateZ(24px); }
.sp-card-title { margin: 9px 0 5px; font-family: var(--hand); font-size: 18px; line-height: 1.25; transform: translateZ(28px); }
.sp-card-story { flex: 1; margin: 0; font-family: var(--hand); font-size: 12.5px; line-height: 1.65; color: var(--ink-2); display: -webkit-box; -webkit-line-clamp: 5; -webkit-box-orient: vertical; overflow: hidden; transform: translateZ(14px); }
.sp-card-foot { font-size: 11px; color: var(--ink-3); margin-top: 6px; }
.sp-del { position: absolute; right: 6px; bottom: 6px; width: 22px; height: 22px; border-radius: 50%; display: grid !important; place-items: center; font-size: 11px; color: var(--ink-3); }
.sp-foot { font-size: 11px; color: var(--ink-3); text-align: center; margin-top: 22px; }

.sp-spin { animation: sp-spin 1s linear infinite; }
@keyframes sp-spin { to { transform: rotate(360deg); } }
@keyframes sp-in { from { opacity: 0; transform: translateY(-6px); } }
@keyframes sp-drop { from { opacity: 0; transform: translateY(14px); } }
@keyframes sp-float { 0%, 100% { transform: translateY(0) rotateZ(-1deg); } 50% { transform: translateY(-6px) rotateZ(1deg); } }
@keyframes sp-lift { 30% { transform: translateY(-26px) rotateZ(-6deg); } 70% { transform: translateY(-14px) rotateZ(5deg); } }
@keyframes sp-shuffle { to { transform: translate(calc(var(--i) * -14px + 26px), -6px) rotate(calc(var(--i) * -6deg + 10deg)); } }
@keyframes sp-shine { to { transform: translateX(120%); } }
@media (prefers-reduced-motion: reduce) { .sp-card, .sp-flip, .sp-deck-card { animation: none !important; } }
</style>
