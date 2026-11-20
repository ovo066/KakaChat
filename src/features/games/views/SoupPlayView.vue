<template>
  <div class="sp-root sp-play" :data-theme="settingsStore.isDark ? 'night' : 'day'">
    <template v-if="session">
      <header class="sp-top">
        <button class="sp-icon" type="button" aria-label="返回" @click="router.push('/games/soup')"><i class="ph-bold ph-caret-left"></i></button>
        <h1>{{ session.puzzle.title }}</h1>
        <button class="sp-icon" type="button" aria-label="同伴" @click="showPicker = !showPicker">
          <img v-if="companion && avatar.kind === 'image'" :src="avatar.value" alt="" class="sp-mini-ava">
          <span v-else-if="companion" class="sp-mini-ava sp-mini-ava--txt">{{ avatar.value }}</span>
          <i v-else class="ph-bold ph-user-plus"></i>
        </button>
      </header>

      <div v-if="showPicker" class="sp-picker">
        <p>谁来当汤主（DM）</p>
        <div class="sp-picker-list">
          <button type="button" class="sp-chip" :class="{ on: !session.hostId }" @click="setHost(null)"><span class="sp-chip-txt sp-chip-txt--dm"><i class="ph-fill ph-mask-happy"></i></span>神秘汤主</button>
          <button v-for="c in singleContacts" :key="c.id" type="button" class="sp-chip" :disabled="session.companionId === c.id" :class="{ on: session.hostId === c.id }" @click="setHost(c.id)">
            <img v-if="contactAvatar(c).kind === 'image'" :src="contactAvatar(c).value" alt="">
            <span v-else class="sp-chip-txt">{{ contactAvatar(c).value }}</span>
            {{ c.name }}
          </button>
        </div>
        <p>拉一个人一起喝汤</p>
        <div class="sp-picker-list">
          <button type="button" class="sp-chip" :class="{ on: !session.companionId }" @click="setCompanion(null)"><span class="sp-chip-txt sp-chip-txt--solo"><i class="ph-bold ph-user"></i></span>独自</button>
          <button v-for="c in singleContacts" :key="c.id" type="button" class="sp-chip" :disabled="session.hostId === c.id" :class="{ on: session.companionId === c.id }" @click="setCompanion(c.id)">
            <img v-if="contactAvatar(c).kind === 'image'" :src="contactAvatar(c).value" alt="">
            <span v-else class="sp-chip-txt">{{ contactAvatar(c).value }}</span>
            {{ c.name }}
          </button>
        </div>
      </div>

      <div v-if="floatOn && session.status === 'playing'" class="sp-fabs">
        <button type="button" class="sp-fab" :class="{ on: floatStory }" aria-label="查看汤面" @click="floatStory = !floatStory; floatPicker = false"><i class="ph-fill ph-bowl-food"></i></button>
        <button type="button" class="sp-fab" :class="{ on: floatPicker }" aria-label="选角色" @click="floatPicker = !floatPicker; floatStory = false">
          <img v-if="companion && avatar.kind === 'image'" :src="avatar.value" alt="">
          <span v-else-if="companion" class="sp-fab-txt">{{ avatar.value }}</span>
          <i v-else class="ph-bold ph-users-three"></i>
        </button>
        <div v-if="floatStory" class="sp-fab-pop">
          <span class="sp-label">汤面</span>
          <p class="sp-fab-story">{{ session.puzzle.story }}</p>
          <p v-if="session.hintsUsed" class="sp-fab-hints"><i class="ph-fill ph-lightbulb"></i>{{ session.puzzle.hints.slice(0, session.hintsUsed).join(' / ') }}</p>
        </div>
        <div v-if="floatPicker" class="sp-fab-pop">
          <span class="sp-label">汤主</span>
          <div class="sp-picker-list">
            <button type="button" class="sp-chip" :class="{ on: !session.hostId }" @click="setHost(null)">神秘汤主</button>
            <button v-for="c in singleContacts" :key="c.id" type="button" class="sp-chip" :disabled="session.companionId === c.id" :class="{ on: session.hostId === c.id }" @click="setHost(c.id)">{{ c.name }}</button>
          </div>
          <span class="sp-label" style="margin-top:10px">队友</span>
          <div class="sp-picker-list">
            <button type="button" class="sp-chip" :class="{ on: !session.companionId }" @click="setCompanion(null)">独自</button>
            <button v-for="c in singleContacts" :key="c.id" type="button" class="sp-chip" :disabled="session.hostId === c.id" :class="{ on: session.companionId === c.id }" @click="setCompanion(c.id)">{{ c.name }}</button>
          </div>
        </div>
      </div>

      <section ref="bowlEl" class="sp-bowl-card">
        <span class="sp-note-tape" aria-hidden="true"></span>
        <span class="sp-label">汤面 · No.{{ String(gamesStore.soupSessions.length).padStart(2, '0') }}</span>
        <p class="sp-story">{{ session.puzzle.story }}</p>
        <div class="sp-meta">
          <span>{{ session.puzzle.category }} · {{ SOUP_DIFFICULTY_LABELS[session.puzzle.difficulty] || '浓汤' }}</span>
          <span>汤主 · {{ hostName }} · {{ askCount }} 问</span>
        </div>
      </section>

      <section ref="logEl" class="sp-log">
        <p v-if="!session.log.length" class="sp-empty">问一些能用"是/不是"回答的问题吧。<br>猜到了就点「还原」说出完整真相。</p>
        <template v-for="e in session.log" :key="e.id">
          <div v-if="e.kind === 'hint'" class="sp-hint"><i class="ph-fill ph-lightbulb"></i>{{ e.text }}</div>
          <div v-else-if="e.kind === 'chat'" class="sp-entry sp-entry--chat">
            <span class="sp-by">{{ e.by }}</span>
            <p>{{ e.text }}</p>
          </div>
          <div v-else class="sp-entry" :class="{ 'is-guess': e.kind === 'guess', 'is-mate': e.by && e.by !== '我' }">
            <span class="sp-by">{{ e.by }}{{ e.kind === 'guess' ? ' · 还原' : '' }}</span>
            <p>{{ e.text }}</p>
            <div v-if="e.verdict" class="sp-verdict-wrap">
              <span class="sp-stamp" :class="`t-${VERDICT[e.verdict]?.tone}`">{{ VERDICT[e.verdict]?.label }}</span>
            </div>
            <span v-else class="sp-thinking"><i></i><i></i><i></i></span>
            <span v-if="e.reaction" class="sp-react" :title="`${hostName} 点了反应`">{{ e.reaction }}</span>
          </div>
          <div v-if="e.remark" class="sp-dm">
            <img v-if="host && contactAvatar(host).kind === 'image'" :src="contactAvatar(host).value" alt="" class="sp-dm-ava">
            <span v-else class="sp-dm-ava">{{ host ? contactAvatar(host).value : hostInitial }}</span>
            <div class="sp-dm-bubble"><span class="sp-by">{{ hostName }}</span><p>{{ e.remark }}</p></div>
          </div>
        </template>
      </section>

      <section v-if="session.status !== 'playing'" class="sp-reveal">
        <span class="sp-label">{{ session.status === 'solved' ? '真相大白' : '汤底' }}</span>
        <p>{{ session.puzzle.answer }}</p>
        <div class="sp-reveal-actions">
          <button type="button" @click="router.push('/games/soup')">再来一碗</button>
        </div>
      </section>

      <p v-if="error" class="sp-error-line">{{ error }}</p>

      <footer v-if="session.status === 'playing'" class="sp-dock">
        <div class="sp-tools">
          <div class="sp-switch" :class="{ guess: mode === 'guess' }" role="tablist">
            <span class="sp-switch-knob" aria-hidden="true"></span>
            <button type="button" role="tab" :aria-selected="mode === 'ask'" @click="mode = 'ask'"><i class="ph-bold ph-question"></i>提问</button>
            <button type="button" role="tab" :aria-selected="mode === 'guess'" @click="mode = 'guess'"><i class="ph-bold ph-key"></i>还原真相</button>
          </div>
          <button class="sp-tool" type="button" :disabled="!hintLeft || busy" :title="`提示（剩 ${hintLeft}）`" @click="useHint">
            <i class="ph-fill ph-lightbulb"></i><span v-if="hintLeft" class="sp-tool-badge">{{ hintLeft }}</span>
          </button>
          <button v-if="companion" class="sp-tool" type="button" :disabled="busy" :title="`让 ${companion.name} 问`" @click="askCompanion">
            <img v-if="avatar.kind === 'image'" :src="avatar.value" alt="">
            <span v-else class="sp-tool-txt">{{ avatar.value }}</span>
          </button>
          <button class="sp-tool" type="button" :disabled="busy" title="看汤底" @click="giveUp"><i class="ph-fill ph-flag-banner"></i></button>
        </div>
        <form class="sp-input" :class="{ guess: mode === 'guess' }" @submit.prevent="submit">
          <i v-if="mode === 'guess'" class="ph-fill ph-key sp-input-ic"></i>
          <input v-model="draft" :placeholder="mode === 'guess' ? '说出你推理出的完整真相…' : '他是不是…？'" maxlength="300" :disabled="busy">
          <button type="submit" class="sp-send" :disabled="!draft.trim() || busy" :aria-label="mode === 'guess' ? '提交还原' : '发送'">
            <span v-if="mode === 'guess'" class="sp-send-txt">揭盅</span>
            <i v-else class="ph-bold ph-arrow-up"></i>
          </button>
        </form>
      </footer>
    </template>
    <p v-else-if="gamesStore.loaded" class="sp-empty">这碗汤不见了。</p>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSettingsStore } from '../../../stores/settings'
import { useContactsStore } from '../../../stores/contacts'
import { useGamesStore } from '../../../stores/games'
import { usePersonasStore } from '../../../stores/personas'
import { makeId } from '../../../utils/id'
import { SOUP_DIFFICULTY_LABELS } from '../data/soups'
import { contactAvatar } from '../composables/gameApi'
import { SOUP_VERDICTS as VERDICT, companionAskSoup, companionReactSoup, judgeSoupQuestion } from '../composables/useTurtleSoup'

const route = useRoute()
const router = useRouter()
const settingsStore = useSettingsStore()
const contactsStore = useContactsStore()
const gamesStore = useGamesStore()

const draft = ref('')
const mode = ref('ask')
const busy = ref(false)
const error = ref('')
const showPicker = ref(false)
const logEl = ref(null)
const bowlEl = ref(null)
const floatOn = ref(false)
const floatStory = ref(false)
const floatPicker = ref(false)
const personasStore = usePersonasStore()
let bowlObserver = null

function observeBowl(el) {
  bowlObserver?.disconnect()
  if (!el || typeof IntersectionObserver === 'undefined') return
  bowlObserver = new IntersectionObserver(([en]) => {
    floatOn.value = !en.isIntersecting
    if (en.isIntersecting) { floatStory.value = false; floatPicker.value = false }
  }, { root: el.closest('.sp-root'), threshold: 0 })
  bowlObserver.observe(el)
}
watch(bowlEl, observeBowl)
onBeforeUnmount(() => bowlObserver?.disconnect())

onMounted(async () => {
  await gamesStore.load()
  scrollDown()
})

const session = computed(() => gamesStore.getSoupSession(route.params.id))
const singleContacts = computed(() => contactsStore.contacts.filter(c => c.type !== 'group'))
const companion = computed(() => singleContacts.value.find(c => c.id === session.value?.companionId) || null)
const avatar = computed(() => contactAvatar(companion.value))
const host = computed(() => singleContacts.value.find(c => c.id === session.value?.hostId) || null)
const hostName = computed(() => host.value?.name || '神秘汤主')
const userName = computed(() => {
  const p = (companion.value && personasStore.getPersonaForContact(companion.value.id)) || personasStore.getPersonaForContact(null)
  return String(p?.name || '').trim() || '我'
})
const hostInitial = computed(() => Array.from(hostName.value)[0])
const askCount = computed(() => session.value?.log.filter(e => e.kind === 'ask' || e.kind === 'guess').length || 0)
const hintLeft = computed(() => Math.max(0, (session.value?.puzzle.hints?.length || 0) - (session.value?.hintsUsed || 0)))

function scrollDown() {
  nextTick(() => {
    const root = logEl.value?.closest('.sp-root')
    if (root) root.scrollTo({ top: root.scrollHeight, behavior: 'smooth' })
  })
}

function setHost(id) {
  session.value.hostId = id
}

function setCompanion(id) {
  session.value.companionId = id
  showPicker.value = false
}

function pushEntry(entry) {
  const item = { id: makeId('sl'), at: Date.now(), ...entry }
  session.value.log.push(item)
  scrollDown()
  return session.value.log[session.value.log.length - 1]
}

async function finish(status) {
  const s = session.value
  s.status = status
  s.endedAt = Date.now()
  scrollDown()
  if (companion.value) {
    try {
      const line = await companionReactSoup(s, companion.value)
      if (line) pushEntry({ kind: 'chat', by: companion.value.name, text: line })
    } catch { /* 感想失败不影响结果 */ }
  }
}

async function judge(entry) {
  try {
    const { verdict, reaction, remark } = await judgeSoupQuestion(session.value, entry.text, {
      kind: entry.kind,
      host: host.value,
      by: !entry.by || entry.by === '我' ? userName.value : entry.by,
      userName: userName.value
    })
    entry.verdict = verdict
    if (reaction) entry.reaction = reaction
    if (remark) {
      entry.remark = remark
      scrollDown()
    }
    if (verdict === 'solved') await finish('solved')
  } catch (e) {
    error.value = e?.message || String(e)
    session.value.log = session.value.log.filter(x => x.id !== entry.id)
  }
}

async function submit() {
  const text = draft.value.trim()
  if (!text || busy.value) return
  error.value = ''
  busy.value = true
  draft.value = ''
  const kind = mode.value
  mode.value = 'ask'
  const entry = pushEntry({ kind, by: '我', text })
  await judge(entry)
  busy.value = false
}

async function askCompanion() {
  if (!companion.value || busy.value) return
  error.value = ''
  busy.value = true
  try {
    const { text, kind } = await companionAskSoup(session.value, companion.value, { host: host.value, userName: userName.value })
    if (text) {
      const entry = pushEntry({ kind, by: companion.value.name, text })
      await judge(entry)
    }
  } catch (e) {
    error.value = e?.message || String(e)
  }
  busy.value = false
}

function useHint() {
  const s = session.value
  const hint = s.puzzle.hints?.[s.hintsUsed]
  if (!hint) return
  s.hintsUsed++
  pushEntry({ kind: 'hint', text: hint })
}

function giveUp() {
  if (!confirm('确定要直接看汤底吗？')) return
  finish('revealed')
}
</script>

<style scoped>
@import '../games.css';
.sp-play { padding-bottom: calc(150px + var(--app-safe-bottom, 0px)); }
.sp-mini-ava { width: 30px; height: 30px; border-radius: 50%; object-fit: cover; }
.sp-mini-ava--txt { display: grid; place-items: center; background: var(--accent); color: #fff; font-size: 13px; font-family: var(--hand); }

.sp-picker { margin: -6px 0 14px; padding: 12px; border-radius: 8px; background: var(--card); box-shadow: var(--shadow); }
.sp-picker p { margin: 0 0 8px; font-family: var(--hand); font-size: 14px; color: var(--ink-2); }
.sp-picker-list { display: flex; flex-wrap: wrap; gap: 6px; }
.sp-picker p + .sp-picker-list + p { margin-top: 12px; }
.sp-chip { display: inline-flex !important; align-items: center; gap: 6px; padding: 3px 12px 3px 3px !important; border-radius: 99px; font-size: 13px; border: 1px solid var(--line) !important; transition: background .2s, color .2s; }
.sp-chip img, .sp-chip-txt { width: 26px; height: 26px; border-radius: 50%; object-fit: cover; flex: none; }
.sp-chip-txt { display: grid; place-items: center; font-family: var(--hand); font-size: 13px; color: #fff; background: #C9A27E; }
.sp-chip-txt--dm { background: #1D4A55; color: #F3CF7A; }
.sp-chip-txt--solo { background: var(--ink-3); }
.sp-chip.on { background: var(--ink) !important; color: var(--paper); border-color: var(--ink) !important; }

.sp-bowl-card {
  --rule: 30px;
  position: relative; margin: 14px 4px 0;
  padding: 22px 20px 14px 46px;
  background:
    linear-gradient(90deg, transparent 32px, rgba(208, 84, 60, .35) 32px 33.5px, transparent 33.5px),
    repeating-linear-gradient(transparent 0 calc(var(--rule) - 1px), var(--rule-c, rgba(70, 110, 140, .2)) calc(var(--rule) - 1px) var(--rule)),
    var(--note-bg, #FFFCF4);
  background-position: 0 0, 0 14px, 0 0;
  color: var(--ink);
  rotate: -.8deg;
  box-shadow: 0 1px 1px rgba(0,0,0,.04), 0 18px 26px -20px rgba(90, 60, 30, .55);
  clip-path: polygon(0 0, 100% 0, 100% calc(100% - 26px), calc(100% - 26px) 100%, 0 100%);
}
.sp-root[data-theme="night"] .sp-bowl-card { --note-bg: #2F3040; --rule-c: rgba(200, 210, 230, .1); }
.sp-bowl-card::after {
  content: ''; position: absolute; right: 0; bottom: 0; width: 26px; height: 26px;
  background: linear-gradient(225deg, transparent 50%, rgba(0,0,0,.08) 50%, var(--fold, #E9E0CC) 56%);
}
.sp-root[data-theme="night"] .sp-bowl-card::after { --fold: #44455A; }
.sp-note-tape {
  position: absolute; top: -11px; left: 50%; width: 86px; height: 22px; translate: -50% 0; rotate: 2.5deg;
  background: repeating-linear-gradient(-45deg, rgba(255,255,255,.3) 0 5px, transparent 5px 10px), #9CC5C0;
  opacity: .9; box-shadow: 0 1px 2px rgba(0,0,0,.1);
}
.sp-label { display: block; height: 16px; font-size: 10px; letter-spacing: .28em; font-weight: 700; color: var(--accent); }
.sp-story { margin: 6px 0 12px; font-family: var(--hand); font-size: 18px; line-height: var(--rule); }
.sp-meta { display: flex; justify-content: space-between; font-family: var(--hand); font-size: 12.5px; color: var(--ink-2); }

.sp-log { margin-top: 18px; display: flex; flex-direction: column; gap: 10px; }
.sp-empty { text-align: center; font-family: var(--hand); font-size: 14px; color: var(--ink-2); line-height: 1.7; margin: 24px 0; }
.sp-entry { position: relative; padding: 10px 14px 12px; border-radius: 4px 12px 12px 12px; background: var(--card); box-shadow: var(--shadow); max-width: 92%; align-self: flex-end; border-radius: 12px 4px 12px 12px; animation: sp-in .3s cubic-bezier(.22, .9, .3, 1) both; }
.sp-entry.is-mate { align-self: flex-start; border-radius: 4px 12px 12px 12px; }
.sp-entry.is-guess { border: 1.5px dashed var(--accent); }
.sp-entry p { margin: 2px 0 0; font-size: 14.5px; line-height: 1.55; }
.sp-entry--chat { align-self: flex-start; background: transparent; box-shadow: none; border: 1px dashed var(--ink-3); }
.sp-by { font-size: 11px; color: var(--ink-3); }
.sp-verdict-wrap { display: flex; align-items: center; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
.sp-stamp {
  display: inline-block; padding: 2px 10px; border: 2px solid currentColor; border-radius: 4px;
  font-family: var(--hand); font-weight: 700; font-size: 14px; letter-spacing: .1em;
  rotate: -4deg; animation: sp-stamp .35s cubic-bezier(.3, 1.6, .5, 1) both;
}
.sp-stamp.t-yes { color: #3E8E7E; }
.sp-stamp.t-no { color: #C9473A; }
.sp-stamp.t-mute { color: var(--ink-3); }
.sp-stamp.t-half { color: #D08A2E; }
.sp-stamp.t-win { color: #fff; background: var(--accent); border-color: var(--accent); }
.sp-react {
  position: absolute; left: -10px; bottom: -10px; width: 28px; height: 28px; border-radius: 50%;
  display: grid; place-items: center; font-size: 15px; background: var(--card);
  box-shadow: 0 0 0 2px var(--paper), 0 4px 8px -4px rgba(0,0,0,.35);
  animation: sp-pop .4s cubic-bezier(.3, 1.8, .5, 1) both;
}
.sp-entry.is-mate .sp-react { left: auto; right: -10px; }
.sp-dm { display: flex; align-items: flex-end; gap: 8px; align-self: flex-start; max-width: 86%; animation: sp-in .35s both; }
.sp-dm-ava { flex: none; width: 28px; height: 28px; border-radius: 50%; object-fit: cover; display: grid; place-items: center; font-family: var(--hand); font-size: 13px; color: #F2EBDD; background: var(--soup); }
.sp-dm-bubble { padding: 8px 12px; border-radius: 12px 12px 12px 4px; background: #1D4A55; color: #F2EBDD; }
.sp-dm-bubble .sp-by { color: #F3CF7A; }
.sp-dm-bubble p { margin: 2px 0 0; font-family: var(--hand); font-size: 14.5px; line-height: 1.55; }
.sp-picker-list button:disabled { opacity: .35; }
.sp-note { font-size: 12px; color: var(--ink-2); font-family: var(--hand); }
.sp-hint { align-self: center; display: flex; align-items: center; gap: 6px; font-family: var(--hand); font-size: 13.5px; color: #8A6A1E; background: #F3DB7C; padding: 6px 12px; rotate: -1deg; box-shadow: 0 6px 10px -8px rgba(0,0,0,.4); }
.sp-thinking { display: inline-flex; gap: 4px; margin-top: 8px; }
.sp-thinking i { width: 6px; height: 6px; border-radius: 50%; background: var(--ink-3); animation: sp-dot 1s infinite; }
.sp-thinking i:nth-child(2) { animation-delay: .15s; }
.sp-thinking i:nth-child(3) { animation-delay: .3s; }

.sp-reveal { margin-top: 20px; padding: 18px; border-radius: 10px; background: var(--card); box-shadow: var(--shadow); border-top: 4px solid var(--accent); animation: sp-in .5s both; }
.sp-reveal .sp-label { color: var(--accent); }
.sp-reveal p { margin: 8px 0 14px; font-family: var(--hand); font-size: 16px; line-height: 1.8; }
.sp-reveal-actions button { width: 100%; padding: 10px; border-radius: 8px; text-align: center; background: var(--ink) !important; color: var(--paper) !important; font-weight: 600; }
.sp-error-line { margin: 12px 0 0; font-size: 12px; color: var(--accent); text-align: center; }

.sp-dock {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 5;
  padding: 8px 12px calc(10px + var(--app-safe-bottom, 0px));
  background: linear-gradient(transparent, var(--paper) 28%);
}
.sp-tools { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.sp-switch {
  position: relative; flex: 1; display: grid; grid-template-columns: 1fr 1fr; padding: 3px;
  border-radius: 99px; background: var(--card); box-shadow: var(--shadow);
}
.sp-switch-knob {
  position: absolute; top: 3px; bottom: 3px; left: 3px; width: calc(50% - 3px); border-radius: 99px;
  background: var(--ink); transition: transform .35s cubic-bezier(.3, 1.35, .45, 1), background .3s;
}
.sp-switch.guess .sp-switch-knob { transform: translateX(100%); background: linear-gradient(135deg, #E0673F, #B8402B); box-shadow: 0 4px 12px -4px rgba(208, 84, 60, .7); }
.sp-switch button { position: relative; z-index: 1; display: flex !important; align-items: center; justify-content: center; gap: 5px; padding: 7px 0 !important; font-size: 13px; font-weight: 600; color: var(--ink-2); transition: color .25s; }
.sp-switch:not(.guess) button:first-of-type { color: var(--paper); }
.sp-switch.guess button:last-of-type { color: #fff; }
.sp-tool {
  position: relative; flex: none; width: 38px; height: 38px; border-radius: 50%; display: grid !important; place-items: center;
  font-size: 17px; color: var(--ink-2); background: var(--card) !important; box-shadow: var(--shadow); transition: transform .15s;
}
.sp-tool:active { transform: scale(.9); }
.sp-tool:disabled { opacity: .4; }
.sp-tool .ph-lightbulb { color: #D9A83E; }
.sp-tool img, .sp-tool-txt { width: 30px; height: 30px; border-radius: 50%; object-fit: cover; }
.sp-tool-txt { display: grid; place-items: center; background: #C9A27E; color: #fff; font-family: var(--hand); font-size: 13px; }
.sp-tool-badge { position: absolute; top: -3px; right: -3px; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 99px; font-size: 10px; line-height: 16px; font-weight: 700; color: #fff; background: var(--accent); box-shadow: 0 0 0 2px var(--paper); }
.sp-input {
  display: flex; align-items: center; gap: 6px; padding: 5px 5px 5px 16px; border-radius: 99px;
  background: var(--card); box-shadow: var(--shadow); border: 1.5px solid transparent;
  transition: border-color .3s, box-shadow .3s, background .3s;
}
.sp-input.guess { padding-left: 12px; border-color: rgba(208, 84, 60, .55); background: color-mix(in srgb, var(--card) 92%, #D0543C); box-shadow: 0 0 0 4px rgba(208, 84, 60, .1), var(--shadow); }
.sp-input-ic { font-size: 20px; color: var(--accent); animation: sp-pop .35s both; }
.sp-input input { flex: 1; min-width: 0; border: 0; outline: none; background: transparent; color: var(--ink); font-size: 15px; padding: 7px 0; }
.sp-input.guess input { font-family: var(--hand); font-size: 15.5px; }
.sp-send { height: 36px; min-width: 36px; border-radius: 99px; display: grid !important; place-items: center; background: var(--ink) !important; color: var(--paper) !important; transition: transform .15s, min-width .25s; }
.sp-input.guess .sp-send { min-width: 62px; padding: 0 14px !important; background: linear-gradient(135deg, #E0673F, #B8402B) !important; color: #fff !important; box-shadow: 0 3px 0 #8E3020; }
.sp-send-txt { font-family: var(--hand); font-size: 15px; font-weight: 700; letter-spacing: .1em; }
.sp-send:active { transform: translateY(2px); }
.sp-send:disabled { opacity: .35; }

.sp-fabs { position: fixed; right: 12px; top: calc(70px + var(--app-safe-top, 0px)); z-index: 6; display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
.sp-fab { width: 44px; height: 44px; border-radius: 50%; display: grid !important; place-items: center; font-size: 20px; color: var(--accent); background: var(--card) !important; box-shadow: 0 6px 16px -6px rgba(0,0,0,.4); animation: sp-pop .3s both; overflow: hidden; }
.sp-fab.on { background: var(--ink) !important; color: var(--paper); }
.sp-fab img, .sp-fab-txt { width: 100%; height: 100%; object-fit: cover; }
.sp-fab-txt { display: grid; place-items: center; background: #C9A27E; color: #fff; font-family: var(--hand); font-size: 15px; }
.sp-fab-pop { width: min(300px, calc(100vw - 24px)); max-height: 50vh; overflow-y: auto; padding: 12px 14px; border-radius: 10px; background: var(--card); box-shadow: var(--shadow), 0 12px 30px -12px rgba(0,0,0,.45); animation: sp-in .25s both; }
.sp-fab-story { margin: 6px 0 0; font-family: var(--hand); font-size: 15px; line-height: 1.6; }
.sp-fab-hints { margin: 8px 0 0; font-size: 12.5px; color: #8A6A1E; display: flex; gap: 4px; }
.sp-fab-pop .sp-picker-list { margin-top: 6px; }
.sp-fab-pop .sp-chip { padding: 4px 12px !important; }
@keyframes sp-in { from { opacity: 0; transform: translateY(8px); } }
@keyframes sp-stamp { from { opacity: 0; transform: scale(1.8); } }
@keyframes sp-pop { from { opacity: 0; transform: scale(.2) rotate(-30deg); } }
@keyframes sp-dot { 0%, 100% { opacity: .3; } 50% { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .sp-steam span, .sp-entry, .sp-stamp { animation: none; } }
</style>
