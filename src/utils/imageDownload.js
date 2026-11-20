/**
 * 把聊天里的图片（data:/blob:/http 地址）存到本地。跨域地址浏览器可能改成直接打开。
 * @param {string} url
 * @param {number} [index]
 */
export function downloadImageUrl(url, index = 0) {
  const href = String(url || '').trim()
  if (!href || typeof document === 'undefined') return
  const ext = /^data:image\/(\w+)/i.exec(href)?.[1]?.replace('jpeg', 'jpg') || 'png'
  const link = document.createElement('a')
  link.href = href
  link.download = `chat_${Date.now()}_${index + 1}.${ext}`
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
}

/**
 * 依次保存多张图片；间隔一点时间，避免浏览器把连续下载当成弹窗拦掉。
 * @param {string[]} urls
 */
export function downloadImageUrls(urls) {
  const list = (Array.isArray(urls) ? urls : []).filter(Boolean)
  list.forEach((url, index) => {
    setTimeout(() => downloadImageUrl(url, index), index * 180)
  })
}
