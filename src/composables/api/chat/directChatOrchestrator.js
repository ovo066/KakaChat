import { buildDirectChatApiMessages } from '../messageHistoryBuilder'
import { buildApiRequestMessages, buildDirectRequestPlan } from '../requestPlan'
import { appendInstructionMessage } from '../streamingRequest'
import { finalizeStreamingAssistantReply } from '../assistantMessageLifecycle'
import { applyReadOnlySuppression, finalizeAssistantTurn } from './chatSideEffects'
import { executeChatStreamOrchestrator } from './sharedChatExecutor'
import { prepareChatTools } from './toolPreparation'
import { resolveDirectMcpServerIds } from '../../../utils/mcpServers'

export async function runDirectChatOrchestrator(context, onChunk) {
  const {
    contactsStore,
    settingsStore,
    chatStore,
    promptStore,
    showToast,
    soundEffects,
    makeMsgId,
    resolveConfig,
    makeTraceId,
    buildApiFailure,
    getTemplateVars,
    applyTemplateVars,
    buildPersonaSystemPrompt,
    buildStickerSystemPrompt,
    buildSpecialFeaturesSystemPrompt,
    buildToolCallingPrompt,
    buildForumSystemPrompt,
    buildMemoryPrompt,
    buildMusicContextPrompt,
    discoverMcpTools,
    buildChatFormatSystemPrompt,
    shouldAddReplyFormatPrompt,
    buildReplyFormatSystemPrompt,
    buildUnifiedSystemPrompt,
    getContextWindowedMsgs,
    resolveContextMessagesForApi,
    insertLorebookEntries,
    buildDirectPostInstructionParts,
    createStreamChunkBatcher,
    buildStreamingDisplayContent,
    parseMomentContent,
    applyForumOnlyPlaceholder,
    pushMomentsIslandNotifications
  } = context

  const activeChat = contactsStore.activeChat
  const cfg = activeChat ? resolveConfig(activeChat.configId) : resolveConfig()
  if (!cfg?.key) {
    return buildApiFailure('CONFIG_MISSING', '请先配置 API Key', { feature: 'chat', action: 'callAPI' })
  }
  if (!activeChat) {
    return buildApiFailure('CHAT_NOT_FOUND', '没有活动的聊天', { feature: 'chat', action: 'callAPI' })
  }

  const toolPreparationPromise = prepareChatTools({
    contactsStore,
    settingsStore,
    activeChat,
    selectedMcpServerIds: resolveDirectMcpServerIds(activeChat),
    discoverMcpTools,
    makeMsgId
  })

  let suppressDecisionPromise = null
  if (settingsStore.allowLivenessEngine && settingsStore.livenessConfig?.allowChatReadOnly) {
    const lastUserMsg = activeChat.msgs.slice().reverse().find(m => m.role === 'user')
    suppressDecisionPromise = import('../../useLivenessEngine')
      .then(({ shouldSuppressReply }) => shouldSuppressReply(activeChat.id, lastUserMsg?.content))
      .catch(error => {
        console.warn('[LivenessEngine] shouldSuppressReply threw, proceeding normally:', error?.message || error)
        return { suppress: false }
      })
  }

  const traceId = makeTraceId()
  const contextWindowPromise = Promise.resolve().then(() => getContextWindowedMsgs(activeChat))
  contextWindowPromise.catch(() => {})
  const { tools, toolContext, externalExecutors } = await toolPreparationPromise

  const { templateVars, mainSystemPrompt, postHistoryPrompt } = buildDirectRequestPlan({
    activeChat,
    promptStore,
    getTemplateVars,
    applyTemplateVars,
    buildPersonaSystemPrompt,
    buildStickerSystemPrompt,
    buildSpecialFeaturesSystemPrompt,
    buildToolCallingPrompt,
    buildForumSystemPrompt,
    buildMemoryPrompt,
    buildMusicContextPrompt,
    buildChatFormatSystemPrompt,
    shouldAddReplyFormatPrompt,
    buildReplyFormatSystemPrompt,
    buildUnifiedSystemPrompt,
    tools
  })

  if (suppressDecisionPromise) {
    const result = await suppressDecisionPromise
    if (result.suppress) {
      return await applyReadOnlySuppression({
        activeChat,
        chatStore,
        settingsStore,
        showToast,
        reason: result.reason,
        recordReason: result.recordReason
      })
    }
    if (result.error) {
      console.warn('[LivenessEngine] Decision API error, proceeding with normal reply:', result.error)
    }
  }

  return await executeChatStreamOrchestrator({
    chatStore,
    activeChat,
    cfg,
    makeMsgId,
    traceId,
    onChunk,
    createStreamChunkBatcher,
    tools: tools && tools.length > 0 ? tools : undefined,
    toolContext,
    maxToolRounds: settingsStore.toolCallingConfig?.maxToolRounds,
    externalExecutors,
    getMessages: () => buildApiRequestMessages({
      activeChat,
      mainSystemPrompt,
      templateVars,
      loadContextWindowedMsgs: () => contextWindowPromise,
      resolveContextMessagesForApi,
      buildApiMessages: (resolvedContextMsgs) => buildDirectChatApiMessages(resolvedContextMsgs, activeChat.msgs),
      insertLorebookEntries,
      buildPostInstructionParts: (retrievedContext) => buildDirectPostInstructionParts({
        postHistoryPrompt,
        retrievedContext
      }),
      appendInstructionMessage
    }).then(result => result.messages),
    async onStreamComplete({ url, streamInfo, streamMsg }) {
      const { forumOnly, interactionOnly, acceptedMeet } = finalizeStreamingAssistantReply({
        message: streamMsg,
        activeChat,
        streamInfo,
        buildDisplayContent: buildStreamingDisplayContent,
        makeMsgId,
        syncForumToAI: settingsStore.syncForumToAI,
        parseMomentContent,
        actor: {
          id: activeChat.id,
          name: activeChat.name,
          avatar: activeChat.avatar
        },
        applyForumOnlyPlaceholder,
        pushMomentsIslandNotifications,
        visibility: {
          mode: 'single',
          traceId,
          model: cfg.model,
          url,
          allowAIImageGeneration: settingsStore.allowAIImageGeneration
        }
      })

      finalizeAssistantTurn(activeChat, soundEffects, {
        playSound: !interactionOnly
      })
      return { success: true, traceId, forumOnly, acceptedMeet }
    }
  })
}
