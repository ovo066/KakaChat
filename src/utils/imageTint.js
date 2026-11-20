// 从头像/封面取一个主色，用来给 iOS 26 风格的联系人卡片、音乐卡片铺底色。
// 结果按来源缓存；跨域图片读不到像素时返回空串，由调用方用默认色兜底。

const SAMPLE_SIZE = 24
const cache = new Map()

/**
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {[number, number, number]} h (0-360), s (0-1), l (0-1)
 */
function rgbToHsl(r, g, b) {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0)
  else if (max === gn) h = (bn - rn) / d + 2
  else h = (rn - gn) / d + 4
  return [h * 60, s, l]
}

const HUE_BINS = 12

/**
 * 取「主色调」：按色相分桶、以饱和度加权投票，再在得票最多的桶里求平均。
 * 直接整体平均会把蓝天和橙色衣服混成发灰的紫色。
 * @param {Uint8ClampedArray} data
 * @returns {string} css hsl() 或空串
 */
export function pickTintFromPixels(data) {
  const bins = Array.from({ length: HUE_BINS + 1 }, () => ({ w: 0, r: 0, g: 0, b: 0 }))
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3] / 255
    if (alpha < 0.5) continue
    const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2])
    // 接近纯白/纯黑的像素几乎不算；灰色单独一个桶
    const w = alpha * (0.08 + s) * (l > 0.94 || l < 0.06 ? 0.1 : 1)
    const bin = bins[s < 0.12 ? HUE_BINS : Math.floor(h / (360 / HUE_BINS)) % HUE_BINS]
    bin.w += w
    bin.r += data[i] * w
    bin.g += data[i + 1] * w
    bin.b += data[i + 2] * w
  }
  const best = bins.reduce((top, bin) => (bin.w > top.w ? bin : top), bins[0])
  if (best.w <= 0) return ''
  const [h, s, l] = rgbToHsl(best.r / best.w, best.g / best.w, best.b / best.w)
  // 压到中等明度，保证上面的白字始终看得清
  const sat = Math.round(Math.min(0.85, s < 0.12 ? s : Math.max(s, 0.42)) * 100)
  const light = Math.round(Math.min(0.46, Math.max(0.3, l)) * 100)
  return `hsl(${Math.round(h)} ${sat}% ${light}%)`
}

function createCanvas() {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = SAMPLE_SIZE
  canvas.height = SAMPLE_SIZE
  return canvas
}

function readCanvasTint(canvas) {
  try {
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    return pickTintFromPixels(ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data)
  } catch {
    // 跨域图片会污染画布，读不到像素
    return ''
  }
}

function tintFromImage(url) {
  return new Promise((resolve) => {
    const canvas = createCanvas()
    if (!canvas || typeof Image === 'undefined') return resolve('')
    const img = new Image()
    if (!/^(?:data|blob):/i.test(url)) img.crossOrigin = 'anonymous'
    img.decoding = 'async'
    img.onload = () => {
      try {
        canvas.getContext('2d').drawImage(img, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE)
        resolve(readCanvasTint(canvas))
      } catch {
        resolve('')
      }
    }
    img.onerror = () => resolve('')
    img.src = url
  })
}

function tintFromEmoji(text) {
  const canvas = createCanvas()
  if (!canvas) return ''
  try {
    const ctx = canvas.getContext('2d')
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `${SAMPLE_SIZE - 2}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`
    ctx.fillText(text, SAMPLE_SIZE / 2, SAMPLE_SIZE / 2 + 1)
    return readCanvasTint(canvas)
  } catch {
    return ''
  }
}

/**
 * @param {{ avatar?: string, avatarType?: string } | string} source 图片地址，或 { avatar, avatarType }
 * @returns {Promise<string>} css 颜色，取不到时为空串
 */
export async function getImageTint(source) {
  const isObject = source && typeof source === 'object'
  const value = String(isObject ? source.avatar || '' : source || '').trim()
  if (!value) return ''
  const isImage = isObject ? source.avatarType === 'image' : true
  const cacheKey = (isImage ? 'img:' : 'txt:') + (value.length > 256 ? value.slice(0, 128) + value.length + value.slice(-128) : value)
  if (cache.has(cacheKey)) return cache.get(cacheKey)
  const tint = isImage ? await tintFromImage(value) : tintFromEmoji(value)
  if (cache.size > 64) cache.delete(cache.keys().next().value)
  cache.set(cacheKey, tint)
  return tint
}
