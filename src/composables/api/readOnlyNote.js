/**
 * 已读不回记录：聊天时 AI 选择已读不回后，会在那批用户消息的最后一条上打标记
 * （readOnlyAt / readOnlyReason），后续请求据此告诉模型"你当时看到了但没回"，
 * 避免上下文里出现一串没有回应的用户消息而模型不知情。
 */

/**
 * @param {object} msg
 * @returns {string} 附加给模型的说明；未标记则返回空串
 */
export function formatReadOnlyNote(msg) {
  if (!msg || msg.role !== 'user') return ''
  if (!(Number(msg.readOnlyAt) > 0)) return ''
  const reason = String(msg.readOnlyReason || '').trim()
  return reason
    ? `（你已读了以上消息，但当时选择了不回复，原因：${reason}）`
    : '（你已读了以上消息，但当时选择了不回复）'
}

/**
 * @param {object} msg
 * @param {string} content
 * @returns {string}
 */
export function appendReadOnlyNote(msg, content) {
  const note = formatReadOnlyNote(msg)
  if (!note) return content
  const text = String(content ?? '')
  return text ? `${text}\n${note}` : note
}
