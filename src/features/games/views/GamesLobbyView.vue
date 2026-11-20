<template>
  <div class="gm-lobby" :data-theme="settingsStore.isDark ? 'night' : 'day'">
    <header class="gm-top">
      <button class="gm-back" type="button" aria-label="返回" @click="router.push('/')"><i class="ph-bold ph-caret-left"></i></button>
      <div class="gm-title">
        <span class="gm-eyebrow">GAME NIGHT</span>
        <h1>游戏室</h1>
      </div>
      <span class="gm-top-spacer"></span>
    </header>

    <p class="gm-lede">拉上 TA，来一局。</p>

    <section class="gm-cards">
      <button
        v-for="(g, i) in games"
        :key="g.key"
        class="gm-card"
        :class="[`gm-card--${g.key}`, { 'is-soon': !g.route }]"
        :style="{ '--tilt': `${g.tilt}deg`, '--delay': `${i * 70}ms` }"
        type="button"
        :disabled="!g.route"
        @click="g.route && router.push(g.route)"
      >
        <span class="gm-tape" aria-hidden="true"></span>
        <div class="gm-card-art" aria-hidden="true">
          <i :class="g.icon"></i>
        </div>
        <div class="gm-card-body">
          <div class="gm-card-head">
            <h2>{{ g.name }}</h2>
            <span class="gm-tag">{{ g.route ? g.players : '筹备中' }}</span>
          </div>
          <p>{{ g.desc }}</p>
          <span v-if="g.route && g.stat" class="gm-stat">{{ g.stat }}</span>
        </div>
      </button>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '../../../stores/settings'
import { useGamesStore } from '../../../stores/games'

const router = useRouter()
const settingsStore = useSettingsStore()
const gamesStore = useGamesStore()

onMounted(() => gamesStore.load())

const solvedCount = computed(() => gamesStore.soupSessions.filter(s => s.status === 'solved').length)

const games = computed(() => [
  {
    key: 'soup',
    name: '海龟汤',
    players: '1 人 + TA',
    desc: '只听汤面，用"是或不是"一点点问出真相。',
    icon: 'ph-fill ph-bowl-steam',
    route: '/games/soup',
    tilt: -1.2,
    stat: solvedCount.value ? `已喝完 ${solvedCount.value} 碗` : ''
  },
  {
    key: 'spy',
    name: '谁是卧底',
    players: '4-8 人',
    desc: '每人一个词，只有一个人拿到的不一样。',
    icon: 'ph-fill ph-detective',
    route: '',
    tilt: 1
  },
  {
    key: 'wolf',
    name: '狼人杀',
    players: '6-9 人',
    desc: '天黑请闭眼。你坐一个位子，其余交给 AI。',
    icon: 'ph-fill ph-moon-stars',
    route: '',
    tilt: -0.6
  }
])
</script>

<style scoped>
.gm-lobby {
  --paper: #EFE7D8; --card: #FBF7EE; --ink: #2E2823; --ink-2: #74685B; --ink-3: #A79B8B;
  --line: rgba(46, 40, 35, .1); --dot: rgba(46, 40, 35, .14); --accent: #D0543C;
  --shadow: 0 1px 0 rgba(255,255,255,.75) inset, 0 14px 26px -18px rgba(90, 60, 30, .6), 0 2px 5px -3px rgba(90, 60, 30, .25);
  --hand: 'LXGW WenKai Screen', 'Kaiti SC', 'STKaiti', 'KaiTi', serif;
  --num: 'Caveat', 'LXGW WenKai Screen', cursive;
  position: absolute; inset: 0; overflow-y: auto;
  padding: var(--app-pt, 48px) 18px calc(28px + var(--app-safe-bottom, 0px));
  color: var(--ink);
  background-color: var(--paper);
  background-image: radial-gradient(var(--dot) 1px, transparent 1.4px);
  background-size: 18px 18px;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Noto Sans SC', 'Microsoft YaHei', sans-serif;
}
.gm-lobby[data-theme="night"] {
  --paper: #1E1F28; --card: #2A2B36; --ink: #EEE7DA; --ink-2: #A9A193; --ink-3: #6F6A62;
  --line: rgba(238, 231, 218, .1); --dot: rgba(238, 231, 218, .08); --accent: #E8826B;
  --shadow: 0 16px 28px -18px rgba(0, 0, 0, .8), 0 2px 6px -3px rgba(0, 0, 0, .5);
}
.gm-lobby button { font: inherit; color: inherit; border: 0; background: none; padding: 0; cursor: pointer; text-align: inherit; }

.gm-top { display: flex; align-items: center; gap: 8px; }
.gm-back { width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center; font-size: 18px; background: var(--card); box-shadow: var(--shadow); }
.gm-top-spacer { width: 38px; }
.gm-title { flex: 1; text-align: center; }
.gm-eyebrow { font-size: 10px; letter-spacing: .32em; color: var(--accent); font-weight: 700; }
.gm-title h1 { margin: 2px 0 0; font-family: var(--hand); font-size: 28px; font-weight: 700; letter-spacing: .08em; }
.gm-lede { margin: 6px 0 22px; text-align: center; font-family: var(--hand); font-size: 14px; color: var(--ink-2); }

.gm-cards { display: flex; flex-direction: column; gap: 22px; max-width: 460px; margin: 0 auto; }
.gm-card {
  position: relative; display: flex; gap: 14px; align-items: stretch;
  padding: 14px; border-radius: 6px;
  background: var(--card); box-shadow: var(--shadow);
  transform: rotate(var(--tilt));
  animation: gm-drop .55s cubic-bezier(.3, 1.45, .45, 1) both; animation-delay: var(--delay);
  transition: transform .25s cubic-bezier(.22, .9, .3, 1);
}
.gm-card:not(.is-soon):active { transform: rotate(0deg) scale(.98); }
.gm-card.is-soon { cursor: default; opacity: .62; filter: saturate(.5); }
.gm-tape {
  position: absolute; top: -9px; left: 50%; width: 74px; height: 20px; translate: -50% 0; rotate: 3deg;
  background: repeating-linear-gradient(45deg, rgba(255,255,255,.25) 0 6px, transparent 6px 12px), var(--tape, #E9C46A);
  opacity: .85; box-shadow: 0 1px 2px rgba(0,0,0,.08);
}
.gm-card-art {
  flex: 0 0 92px; height: 104px; border-radius: 4px; display: grid; place-items: center;
  font-size: 50px; color: rgba(255, 252, 244, .95); background: var(--art);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.18), inset 0 -18px 30px -18px rgba(0,0,0,.35);
}
.gm-card--soup { --art: radial-gradient(circle at 50% 30%, #3E7C82, #183B47 75%); --tape: #9CC5C0; }
.gm-card--spy  { --art: radial-gradient(circle at 50% 30%, #C77B58, #6B3426 75%); --tape: #F0B49E; }
.gm-card--wolf { --art: radial-gradient(circle at 50% 30%, #5A5A8F, #22223D 75%); --tape: #B8B5E0; }
.gm-card-body { flex: 1; min-width: 0; display: flex; flex-direction: column; padding-top: 2px; }
.gm-card-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.gm-card-head h2 { margin: 0; font-family: var(--hand); font-size: 22px; font-weight: 700; }
.gm-tag { flex: none; font-size: 11px; color: var(--ink-2); border: 1px dashed var(--ink-3); border-radius: 99px; padding: 1px 8px; }
.gm-card-body p { margin: 8px 0 0; font-size: 13px; line-height: 1.55; color: var(--ink-2); }
.gm-stat { margin-top: auto; padding-top: 6px; font-family: var(--hand); font-size: 13px; color: var(--accent); }

@keyframes gm-drop { from { opacity: 0; transform: translateY(-14px) rotate(calc(var(--tilt) * 4)); } }
@media (prefers-reduced-motion: reduce) { .gm-card { animation: none; } }
</style>
