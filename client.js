/**
 * DeepSeek pure chat mode — browser half.
 *
 * A self-contained, DeepSeek-web-style chat surface rendered in `shell.overlay`.
 * It lists the profile's Sessions, retains the selected one through
 * `ctx.sessions`, turns its event window into plain user/assistant messages
 * (tool calls and process rows are ignored), and sends prompts through
 * `SessionFace.prompt`.
 */
window.__ModuleLoader__.load({
  id: '@local/deepseek-pure-chat',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const {
      useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore,
    } = React

    const NS = 'deepseek-pure-chat'
    const ACTIVE_KEY = 'dsh.deepseek-pure-chat.active'
    const THEME_KEY = 'dsh.deepseek-pure-chat.theme'
    const SEARCH_COMMAND = 'purechat_search'
    const WEB_MARKER = '[[dsh-pure-chat-web-search]]'
    const WEB_DIRECTIVE = WEB_MARKER + '（联网搜索）回答前请先调用 web_search 工具，检索与问题相关的最新网页资料；综合检索结果作答，并用 Markdown 链接列出来源。若检索不可用，请明确说明。\n\n'
    const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
    const MAX_IMAGES = 6
    const MAX_IMAGE_BYTES = 20 * 1024 * 1024

    /* ------------------------------------------------------------------ */
    /* Dictionaries                                                        */
    /* ------------------------------------------------------------------ */

    const ZH = {
      'appName': 'DeepSeek 纯聊天',
      'entry': '纯聊天',
      'entryHint': '打开 DeepSeek 纯聊天模式',
      'exit': '退出纯聊天',
      'newChat': '新对话',
      'searchPlaceholder': '搜索对话',
      'today': '今天',
      'yesterday': '昨天',
      'week': '7 天内',
      'month': '30 天内',
      'older': '更早',
      'greeting': '我是 DeepSeek，很高兴见到你！',
      'subtitle': '我可以帮你写代码、读文件、写作各种创意内容，请把你的任务交给我吧~',
      'suggestion1': '解读经典物理实验',
      'suggestion2': '设计一个充满未来感的城市',
      'suggestion3': '写一个简单的贪吃蛇游戏',
      'suggestion4': '帮我写一封辞职信',
      'placeholder': '给 DeepSeek 发送消息',
      'send': '发送',
      'stop': '停止生成',
      'deepThink': '深度思考',
      'thinking': '正在思考',
      'thinkingProcess': '深度思考中',
      'thought': '已深度思考',
      'copy': '复制',
      'copied': '已复制',
      'loadOlder': '加载更早消息',
      'noSessions': '还没有对话',
      'noResults': '没有匹配的对话',
      'disclaimer': '内容由 AI 生成，请仔细甄别',
      'loading': '正在载入对话…',
      'openFailed': '对话载入失败',
      'retry': '重试',
      'sendFailed': '发送失败',
      'stopped': '已停止生成',
      'themeLight': '切换到浅色模式',
      'themeDark': '切换到深色模式',
      'footerName': 'DeepSeek Harness',
      'footerMode': '纯聊天模式',
      'sessionFallback': '新对话',
      'closeSidebar': '关闭侧栏',
      'menu': '对话列表',
      'dismiss': '关闭',
      'noTextAnswer': '这一轮没有可显示的文字回复（工具调用已隐藏）',
      'maxTokens': '本轮达到输出上限，回答可能不完整',
      'blocked': '本轮没有产生可显示的内容',
      'waitingForYou': '这个对话正在等待你在 Harness 中确认',
      'handleInHarness': '回到 Harness 处理',
      'loadingOlder': '正在加载更早消息…',
      'loadOlderFailed': '加载失败，点击重试',
      'stopFailed': '停止失败',
      'listLoadFailed': '对话列表加载失败',
      'model': '模型',
      'modelHint': '切换当前对话使用的模型',
      'modelLoading': '正在加载模型列表…',
      'modelFailed': '模型列表加载失败',
      'noModels': '没有可用模型',
      'deepThinkOn': '开启深度思考',
      'deepThinkOff': '关闭深度思考',
      'deepThinkUnsupported': '当前模型不支持思考强度',
      'selectingModel': '正在切换模型…',
      'webSearch': '联网搜索',
      'webSearchHint': '回答前先检索网页；需要 Harness 已配置搜索服务',
      'searchingWeb': '正在联网搜索…',
      'attach': '上传图片',
      'attachHint': '添加图片；图片识别需要支持视觉的模型（例如 4.1flash）',
      'image': '图片',
      'imageLoadFailed': '图片加载失败',
      'removeImage': '移除图片',
      'tooManyImages': '最多添加 6 张图片',
      'imageTooLarge': '单张图片不能超过 20 MB',
      'unsupportedImage': '仅支持 PNG、JPEG、WebP、GIF 图片',
      'thinkTag': '思考',
      'crashTitle': '纯聊天界面加载失败',
      'crashHint': '可以关闭后重新打开；如果反复出现，请在插件页停用本插件。',
    }

    const EN = {
      'appName': 'DeepSeek pure chat',
      'entry': 'Pure chat',
      'entryHint': 'Open DeepSeek pure chat mode',
      'exit': 'Leave pure chat',
      'newChat': 'New chat',
      'searchPlaceholder': 'Search chats',
      'today': 'Today',
      'yesterday': 'Yesterday',
      'week': 'Previous 7 days',
      'month': 'Previous 30 days',
      'older': 'Older',
      'greeting': "I'm DeepSeek. Good to see you!",
      'subtitle': 'I can write code, read files, and help with all kinds of creative work — just tell me what you need.',
      'suggestion1': 'Explain a classic physics experiment',
      'suggestion2': 'Design a futuristic city',
      'suggestion3': 'Write a simple Snake game',
      'suggestion4': 'Write a resignation letter',
      'placeholder': 'Message DeepSeek',
      'send': 'Send',
      'stop': 'Stop generating',
      'deepThink': 'Deep thinking',
      'thinking': 'Thinking',
      'thinkingProcess': 'Thinking deeply',
      'thought': 'Thought process',
      'copy': 'Copy',
      'copied': 'Copied',
      'loadOlder': 'Load earlier messages',
      'noSessions': 'No conversations yet',
      'noResults': 'No matching conversations',
      'disclaimer': 'AI-generated content may be inaccurate',
      'loading': 'Loading conversation…',
      'openFailed': 'Could not load the conversation',
      'retry': 'Retry',
      'sendFailed': 'Could not send the message',
      'stopped': 'Generation stopped',
      'themeLight': 'Switch to light mode',
      'themeDark': 'Switch to dark mode',
      'footerName': 'DeepSeek Harness',
      'footerMode': 'Pure chat',
      'sessionFallback': 'New chat',
      'closeSidebar': 'Close sidebar',
      'menu': 'Conversations',
      'dismiss': 'Dismiss',
      'noTextAnswer': 'No displayable text in this turn (tool calls are hidden)',
      'maxTokens': 'This turn reached the output limit, so the answer may be incomplete',
      'blocked': 'This turn produced nothing displayable',
      'waitingForYou': 'This conversation is waiting for your confirmation in Harness',
      'handleInHarness': 'Handle in Harness',
      'loadingOlder': 'Loading earlier messages…',
      'loadOlderFailed': 'Could not load — click to retry',
      'stopFailed': 'Could not stop the run',
      'listLoadFailed': 'Could not load the conversation list',
      'model': 'Model',
      'modelHint': 'Switch the model used by this conversation',
      'modelLoading': 'Loading models…',
      'modelFailed': 'Could not load the model list',
      'noModels': 'No models available',
      'deepThinkOn': 'Turn on deep thinking',
      'deepThinkOff': 'Turn off deep thinking',
      'deepThinkUnsupported': 'This model has no thinking levels',
      'selectingModel': 'Switching model…',
      'webSearch': 'Web search',
      'webSearchHint': 'Search the web before answering; requires a configured web-search provider',
      'searchingWeb': 'Searching the web…',
      'attach': 'Upload image',
      'attachHint': 'Add an image; image understanding needs a vision model (for example 4.1flash)',
      'image': 'Image',
      'imageLoadFailed': 'Could not load the image',
      'removeImage': 'Remove image',
      'tooManyImages': 'Up to 6 images',
      'imageTooLarge': 'Each image must be under 20 MB',
      'unsupportedImage': 'Only PNG, JPEG, WebP, and GIF images are supported',
      'thinkTag': 'Think',
      'crashTitle': 'The pure chat surface failed to load',
      'crashHint': 'Close and reopen it; disable the plugin if this repeats.',
    }

    /* ------------------------------------------------------------------ */
    /* Event-window projection (pure)                                      */
    /* ------------------------------------------------------------------ */

    /**
     * Prepare one user message for display: strip the hidden web-search
     * directive, collect durable image references, and remember whether the
     * turn was requested with live search.
     */
    function userContentOf(content) {
      const texts = []
      const images = []
      let webSearch = false
      if (!Array.isArray(content)) return { text: '', images, webSearch }
      for (const block of content) {
        if (block === null || typeof block !== 'object') continue
        if (block.type === 'text' && typeof block.text === 'string') {
          if (block.text.startsWith(WEB_MARKER)) {
            webSearch = true
            continue
          }
          texts.push(block.text)
        } else if (block.type === 'image' && block.attachment !== undefined) {
          images.push(block.attachment)
        }
      }
      return { text: texts.join(''), images, webSearch }
    }

    /** Convert durable image bytes to a self-contained display URL. */
    function bytesToDataUrl(bytes, mediaType) {
      const chunkSize = 0x8000
      const parts = []
      for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        parts.push(String.fromCharCode.apply(null, bytes.subarray(offset, offset + chunkSize)))
      }
      return 'data:' + mediaType + ';base64,' + btoa(parts.join(''))
    }

    /** Read one browser image file as base64 plus a local preview. */
    function readImageFile(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onerror = () => reject(new Error('image read failed'))
        reader.onload = () => {
          const result = typeof reader.result === 'string' ? reader.result : ''
          const match = /^data:([^;]+);base64,([\s\S]+)$/.exec(result)
          if (match === null) {
            reject(new Error('image read failed'))
            return
          }
          resolve({
            mediaType: match[1],
            data: match[2],
            previewUrl: result,
            name: file.name,
            bytes: file.size,
          })
        }
        reader.readAsDataURL(file)
      })
    }

    /** Readable one-line failure copy from a durable failure object. */
    function failureText(failure) {
      if (failure === null || typeof failure !== 'object') return String(failure ?? '')
      const code = typeof failure.code === 'string' ? failure.code : ''
      const message = typeof failure.message === 'string' ? failure.message : ''
      if (message !== '') return code === '' ? message : message + ' (' + code + ')'
      return code !== '' ? code : 'Unknown error'
    }

    /** Rebuild the flat text/reasoning view of a streaming message from its blocks. */
    function syncStreamingText(message) {
      const blocks = message.blocks || {}
      const indices = Object.keys(blocks).map(Number).sort((left, right) => left - right)
      const texts = []
      const reasonings = []
      for (const index of indices) {
        const block = blocks[index]
        if (block === undefined) continue
        if (block.kind === 'text') texts.push(block.text)
        else if (block.kind === 'reasoning') reasonings.push(block.text)
      }
      message.text = texts.join('')
      message.reasoning = reasonings.join('\n\n')
    }

    /** Return the block accumulator for one stream index, creating it when needed. */
    function streamBlock(message, index, kind) {
      message.blocks = message.blocks || {}
      let block = message.blocks[index]
      if (block === undefined || block.kind !== kind) {
        block = { kind, text: '' }
        message.blocks[index] = block
      }
      return block
    }

    /** Apply one live stream chunk to a streaming assistant message. */
    function applyChunk(message, chunk) {
      if (chunk === null || typeof chunk !== 'object') return
      const index = Number.isInteger(chunk.index) ? chunk.index : 0
      switch (chunk.type) {
        case 'block-start': {
          const kind = chunk.blockType === 'text'
            ? 'text'
            : chunk.blockType === 'reasoning' ? 'reasoning' : 'other'
          message.blocks = message.blocks || {}
          message.blocks[index] = { kind, text: '' }
          break
        }
        case 'text-delta':
          streamBlock(message, index, 'text').text += typeof chunk.text === 'string' ? chunk.text : ''
          break
        case 'reasoning-delta':
          streamBlock(message, index, 'reasoning').text += typeof chunk.text === 'string' ? chunk.text : ''
          break
        case 'block-end': {
          const block = chunk.block === null || typeof chunk.block !== 'object' ? {} : chunk.block
          const kind = block.type === 'text'
            ? 'text'
            : block.type === 'reasoning' ? 'reasoning' : 'other'
          message.blocks = message.blocks || {}
          message.blocks[index] = {
            kind,
            text: typeof block.text === 'string' ? block.text : '',
          }
          break
        }
        default:
          return
      }
      syncStreamingText(message)
    }

    /**
     * Rows derived from a durable event are cached by that event object. The
     * event window reuses immutable event objects across snapshots, so an
     * unchanged message keeps its row identity and its React subtree skips
     * re-rendering while another message streams.
     */
    const ROW_CACHE = new WeakMap()

    function cachedRow(event, create) {
      let row = ROW_CACHE.get(event)
      if (row === undefined) {
        row = create()
        ROW_CACHE.set(event, row)
      }
      return row
    }

    /** Replace the streaming row of one step with its settled message. */
    function settleAssistant(messages, event) {
      const data = event.data || {}
      const turn = Number(data.turn)
      const step = Number(data.step)
      const settled = cachedRow(event, () => {
        const content = data.message && Array.isArray(data.message.content) ? data.message.content : []
        const texts = []
        const reasonings = []
        for (const block of content) {
          if (block === null || typeof block !== 'object') continue
          if (block.type === 'text' && typeof block.text === 'string') texts.push(block.text)
          else if (block.type === 'reasoning' && typeof block.text === 'string') reasonings.push(block.text)
        }
        return {
          id: 'a:' + turn + ':' + step + ':' + event.seq,
          role: 'assistant',
          turn,
          step,
          text: texts.join(''),
          reasoning: reasonings.join('\n\n'),
          streaming: false,
          interrupted: data.interrupted === true,
          time: event.time,
          usage: data.usage,
        }
      })
      const index = messages.findIndex(item => (
        item.role === 'assistant' && item.turn === turn && item.step === step
      ))
      if (index < 0) messages.push(settled)
      else messages[index] = settled
    }

    /**
     * Project the Session event window into the plain chat rows the replica
     * shows. Assistant rows are folded per turn/step; tool calls, process
     * evidence, context injections, retries, and commands stay out of view.
     */
    function buildMessages(entries) {
      const messages = []
      if (!Array.isArray(entries)) return messages
      let currentTurn = null
      let searchPending = false
      const turnsWithText = new Set()
      for (const entry of entries) {
        if (entry === null || typeof entry !== 'object') continue
        const event = entry.event
        if (event === null || typeof event !== 'object') continue
        if (entry.type === 'transient') {
          if (event.type !== 'assistant/live-chunk') continue
          const data = event.data || {}
          const turn = Number(data.turn)
          const step = Number(data.step)
          const attempt = String(data.attemptId ?? '')
          let message = messages.find(item => (
            item.role === 'assistant' && item.streaming === true
            && item.turn === turn && item.step === step && item.attempt === attempt
          ))
          if (message === undefined) {
            message = {
              id: 's:' + turn + ':' + step + ':' + attempt,
              role: 'assistant',
              turn,
              step,
              attempt,
              text: '',
              reasoning: '',
              blocks: {},
              streaming: true,
              interrupted: false,
              time: event.time,
            }
            messages.push(message)
          }
          applyChunk(message, data.chunk)
          if (message.text.trim() !== '' || message.reasoning.trim() !== '') turnsWithText.add(turn)
          continue
        }
        if (event.type === 'user/message') {
          if (event.surfaceOp !== 'append') continue
          const source = event.data && event.data.source
          const kind = source && typeof source === 'object' ? source.kind : undefined
          if (kind === 'pure-chat-search') {
            // Injected by the Host search command; it belongs to the next prompt.
            searchPending = true
            continue
          }
          if (kind !== undefined && kind !== 'user') continue
          const content = userContentOf(event.data && event.data.content)
          if (content.text.trim() === '' && content.images.length === 0) continue
          messages.push(cachedRow(event, () => ({
            id: 'u:' + event.seq,
            role: 'user',
            text: content.text.trim(),
            images: content.images,
            webSearch: content.webSearch || searchPending,
            time: event.time,
          })))
          searchPending = false
          continue
        }
        if (event.type === 'turn/start') {
          currentTurn = Number(event.data && event.data.turn)
          continue
        }
        if (event.type === 'assistant/message') {
          if (event.surfaceOp !== 'append') continue
          const turn = Number(event.data && event.data.turn)
          const content = event.data && event.data.message && Array.isArray(event.data.message.content)
            ? event.data.message.content
            : []
          if (content.some(block => (
            block !== null && typeof block === 'object'
            && (block.type === 'text' || block.type === 'reasoning')
            && typeof block.text === 'string' && block.text.trim() !== ''
          ))) {
            turnsWithText.add(turn)
          }
          settleAssistant(messages, event)
          continue
        }
        if (event.type === 'turn/end') {
          const reason = event.data && event.data.reason
          if (reason && reason.kind === 'error') {
            const error = reason.error
            messages.push(cachedRow(event, () => ({
              id: 'e:' + event.seq,
              role: 'notice',
              tone: 'error',
              text: failureText(error),
              time: event.time,
            })))
          } else if (reason && reason.kind === 'aborted') {
            if (currentTurn !== null && !turnsWithText.has(currentTurn)) {
              messages.push(cachedRow(event, () => ({
                id: 'e:' + event.seq,
                role: 'notice',
                tone: 'muted',
                textKey: 'stopped',
                time: event.time,
              })))
            }
          } else if (reason && reason.kind === 'max-tokens') {
            messages.push(cachedRow(event, () => ({
              id: 'e:' + event.seq,
              role: 'notice',
              tone: 'warning',
              textKey: 'maxTokens',
              time: event.time,
            })))
          } else if (reason && reason.kind === 'blocked') {
            if (currentTurn !== null && !turnsWithText.has(currentTurn)) {
              messages.push(cachedRow(event, () => ({
                id: 'e:' + event.seq,
                role: 'notice',
                tone: 'muted',
                textKey: 'blocked',
                time: event.time,
              })))
            }
          } else if (currentTurn !== null && !turnsWithText.has(currentTurn)) {
            messages.push(cachedRow(event, () => ({
              id: 'e:' + event.seq,
              role: 'notice',
              tone: 'muted',
              textKey: 'noTextAnswer',
              time: event.time,
            })))
          }
          currentTurn = null
          searchPending = false
          continue
        }
      }
      return messages.filter(message => (
        message.role !== 'assistant'
        || message.text.trim() !== ''
        || message.reasoning.trim() !== ''
      ))
    }

    /* ------------------------------------------------------------------ */
    /* Session store and engine                                            */
    /* ------------------------------------------------------------------ */

    const EMPTY_CHAT = Object.freeze({
      messages: Object.freeze([]),
      running: false,
      sending: false,
      openState: 'open',
      openError: null,
      hasMore: false,
      blank: true,
      activeId: null,
    })

    function errorMessage(error) {
      if (error === null || error === undefined) return ''
      if (typeof error === 'string') return error
      if (typeof error.message === 'string' && error.message !== '') return error.message
      try {
        return JSON.stringify(error)
      } catch {
        return String(error)
      }
    }

    /** Whether two model selections describe the same provider/model/effort. */
    function sameSelection(left, right) {
      if (left === right) return true
      if (left === null || left === undefined || right === null || right === undefined) return false
      return left.provider === right.provider
        && left.model === right.model
        && left.reasoningEffort === right.reasoningEffort
    }

    /** Whether two model-directory snapshots expose the same public state. */
    function sameModelState(left, right) {
      if (left === right) return true
      if (left === null || right === null) return false
      return sameSelection(left.current, right.current)
        && left.groups === right.groups
        && left.failures === right.failures
        && left.routable === right.routable
        && left.status === right.status
        && left.pending === right.pending
        && left.error === right.error
    }

    /** Retain one Session and expose its plain chat projection as an observable. */
    function createSessionStore(ctx, id, onChange) {
      let reference = null
      let released = false
      let ready = false
      let readyError = null
      let version = 0
      let cached = null
      const unsubscribers = []

      const notify = () => {
        version += 1
        cached = null
        onChange()
      }

      try {
        reference = ctx.sessions.retain(id, { source: 'gateway' })
        const binding = reference.binding
        unsubscribers.push(binding.eventSource.subscribe(notify))
        unsubscribers.push(binding.session.subscribe(notify))
        reference.ready.then(() => {
          ready = true
          notify()
        }, (error) => {
          readyError = error
          notify()
        })
      } catch (error) {
        readyError = error
      }

      const binding = () => (reference === null ? null : reference.binding)

      const getSnapshot = () => {
        if (cached !== null) return cached
        const live = binding()
        const events = live === null ? null : live.eventSource.getSnapshot()
        const session = live === null ? null : live.session.getSnapshot()
        const entries = events === null ? [] : events.entries
        cached = {
          messages: buildMessages(entries),
          running: session === null ? false : session.running === true,
          hasMore: events === null ? false : events.hasMore === true,
          blank: session === null ? true : session.blank !== false,
          openState: session === null ? (readyError === null ? 'loading' : 'error') : session.openState,
          openError: readyError !== null ? { message: errorMessage(readyError) } : (session === null ? null : session.openError),
          version,
        }
        return cached
      }

      return {
        id,
        getSnapshot,
        ready: () => (reference === null ? Promise.reject(readyError ?? new Error('session unavailable')) : reference.ready),
        prompt: (content) => {
          const live = binding()
          if (live === null) return Promise.reject(new Error('session unavailable'))
          return live.session.prompt(content, 'queue')
        },
        command: (line) => {
          const live = binding()
          if (live === null) return Promise.reject(new Error('session unavailable'))
          return live.session.command(line)
        },
        readImage: (attachment) => {
          const live = binding()
          if (live === null) return Promise.resolve(null)
          return live.session.readAttachment(attachment).then((result) => {
            if (result === null || result === undefined || result.ok === false) return null
            return {
              mediaType: attachment.mediaType,
              data: result.value.data,
            }
          }, () => null)
        },
        imageLimits: () => {
          const live = binding()
          if (live === null) return null
          try {
            return live.session.projections.faceOf('imageLimits').getSnapshot()
          } catch {
            return null
          }
        },
        cancel: () => {
          const live = binding()
          return live === null ? Promise.resolve() : live.session.cancel()
        },
        loadOlder: () => {
          const live = binding()
          return live === null ? Promise.resolve() : live.session.loadOlder()
        },
        dispose() {
          if (released) return
          released = true
          for (const off of unsubscribers.splice(0)) {
            try { off() } catch { /* ignore teardown races */ }
          }
          try { reference?.release() } catch { /* ignore teardown races */ }
          reference = null
        },
      }
    }

    /**
     * Own the active Session and the observable chat state used by React.
     * `open(null)` returns to the welcome state without creating a Session.
     */
    function createEngine(ctx) {
      let current = null
      let sending = false
      let ensuring = null
      let version = 0
      let cached = null
      const listeners = new Set()
      let disposed = false

      const notify = () => {
        if (disposed) return
        version += 1
        cached = null
        for (const listener of listeners) listener()
      }

      const open = (id) => {
        if (disposed) return
        if (current !== null && current.id === id) return
        if (current !== null) current.store.dispose()
        if (id === null || id === undefined) {
          current = null
          try { localStorage.removeItem(ACTIVE_KEY) } catch { /* storage unavailable */ }
        } else {
          current = {
            id,
            store: createSessionStore(ctx, id, notify),
          }
          try { localStorage.setItem(ACTIVE_KEY, id) } catch { /* storage unavailable */ }
        }
        notify()
      }

      const ensureSession = () => {
        if (current !== null) return Promise.resolve(current.store)
        if (ensuring !== null) return ensuring
        ensuring = (async () => {
          const list = ctx.sessions.list.getSnapshot()
          const recent = list.ids
            .map(sessionId => list.byId[sessionId])
            .find(summary => (
              summary !== undefined
              && summary.cwd !== undefined
              && summary.origin !== 'subagent'
              && summary.blank !== true
            ))
          let created
          try {
            created = await ctx.sessions.create(recent && recent.cwd ? { cwd: recent.cwd } : {})
          } catch (error) {
            // A stale or unusable directory must not block a new pure chat.
            if (recent === undefined || recent.cwd === undefined) throw error
            created = await ctx.sessions.create()
          }
          if (disposed) return null
          open(created)
          const store = current.store
          await store.ready()
          return store
        })()
        const wrapped = ensuring.finally(() => {
          if (ensuring === wrapped) ensuring = null
        })
        ensuring = wrapped
        return wrapped
      }

      return {
        subscribe(listener) {
          listeners.add(listener)
          return () => { listeners.delete(listener) }
        },
        getSnapshot() {
          if (cached !== null) return cached
          if (current === null) {
            cached = { ...EMPTY_CHAT, sending, version }
          } else {
            cached = { ...current.store.getSnapshot(), activeId: current.id, sending, version }
          }
          return cached
        },
        open,
        ensure: ensureSession,
        async send(content) {
          if (!Array.isArray(content) || content.length === 0 || sending) return
          sending = true
          notify()
          try {
            const store = await ensureSession()
            if (store === null) return
            await store.ready()
            const result = await store.prompt(content)
            if (result !== null && typeof result === 'object' && result.ok === false) {
              throw new Error(result.error ? result.error.message : 'prompt refused')
            }
          } finally {
            sending = false
            notify()
          }
        },
        async search(query) {
          const store = await ensureSession()
          if (store === null) return false
          await store.ready()
          const result = await withTimeout(
            store.command('/' + SEARCH_COMMAND + ' ' + query),
            20000,
            'web search timed out',
          )
          if (result !== null && typeof result === 'object' && result.ok === false) {
            throw new Error(result.error ? result.error.message : 'search command failed')
          }
          return result !== null && typeof result === 'object'
            && result.value !== undefined && result.value !== null
            && result.value.matched === true
        },
        readImage(attachment) {
          if (current === null) return Promise.resolve(null)
          return current.store.readImage(attachment)
        },
        imageLimits() {
          return current === null ? null : current.store.imageLimits()
        },
        stop() {
          if (current === null) return Promise.resolve()
          return current.store.cancel()
        },
        loadOlder() {
          if (current === null) return Promise.resolve()
          return current.store.loadOlder()
        },
        reopen() {
          if (current === null) return
          const id = current.id
          current.store.dispose()
          current = null
          open(id)
        },
        isDisposed() { return disposed },
        dispose() {
          disposed = true
          listeners.clear()
          if (current !== null) {
            current.store.dispose()
            current = null
          }
        },
      }
    }

    /* ------------------------------------------------------------------ */
    /* Icons                                                               */
    /* ------------------------------------------------------------------ */

    function Svg({ size = 18, children, viewBox = '0 0 24 24', className, style }) {
      return h('svg', {
        width: size,
        height: size,
        viewBox,
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.8,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': true,
        focusable: false,
        className,
        style,
      }, children)
    }

    function BrandMark({ size = 30, className }) {
      return h('svg', {
        width: size,
        height: size,
        viewBox: '0 0 32 32',
        className,
        'aria-hidden': true,
        focusable: false,
      }, [
        h('rect', { key: 'bg', x: 0, y: 0, width: 32, height: 32, rx: 9, fill: 'currentColor' }),
        h('path', {
          key: 'wave',
          d: 'M7.6 21.2c3.4 0 5-2.4 7.7-2.4 1.9 0 3.1 1.1 4.6 2.4 1.7 1.4 3.2 2 4.9 2-1.3-1.7-2-3.3-2-5.4 0-3.9-3.1-7-7.1-7-3.2 0-5.9 2.2-6.7 5.1',
          fill: 'none',
          stroke: '#fff',
          strokeWidth: 2.4,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
        h('circle', { key: 'eye', cx: 21.2, cy: 11.1, r: 1.4, fill: '#fff' }),
      ])
    }

    const Icon = {
      plus: (props) => h(Svg, props, [h('path', { key: 'a', d: 'M12 5v14' }), h('path', { key: 'b', d: 'M5 12h14' })]),
      search: (props) => h(Svg, props, [h('circle', { key: 'a', cx: 11, cy: 11, r: 6.4 }), h('path', { key: 'b', d: 'm16 16 4 4' })]),
      send: (props) => h(Svg, props, [h('path', { key: 'a', d: 'M12 19V5' }), h('path', { key: 'b', d: 'm6 11 6-6 6 6' })]),
      stop: (props) => h(Svg, props, [h('rect', { key: 'a', x: 7, y: 7, width: 10, height: 10, rx: 2, fill: 'currentColor', stroke: 'none' })]),
      copy: (props) => h(Svg, props, [
        h('rect', { key: 'a', x: 9, y: 9, width: 11, height: 11, rx: 2.4 }),
        h('path', { key: 'b', d: 'M5 15V6.4A2.4 2.4 0 0 1 7.4 4H15' }),
      ]),
      check: (props) => h(Svg, props, [h('path', { key: 'a', d: 'm5 12.5 4.2 4.2L19 6.8' })]),
      close: (props) => h(Svg, props, [h('path', { key: 'a', d: 'm6 6 12 12' }), h('path', { key: 'b', d: 'm18 6-12 12' })]),
      sun: (props) => h(Svg, props, [
        h('circle', { key: 'a', cx: 12, cy: 12, r: 4 }),
        h('path', { key: 'b', d: 'M12 2.6v2.2M12 19.2v2.2M4.4 4.4l1.6 1.6M18 18l1.6 1.6M2.6 12h2.2M19.2 12h2.2M4.4 19.6 6 18M18 6l1.6-1.6' }),
      ]),
      moon: (props) => h(Svg, props, [h('path', { key: 'a', d: 'M20 14.2A8 8 0 1 1 9.8 4a6.4 6.4 0 0 0 10.2 10.2Z' })]),
      brain: (props) => h(Svg, props, [
        h('path', { key: 'a', d: 'M9.5 4.6A3.1 3.1 0 0 0 6.4 7.7a3.1 3.1 0 0 0-1.7 5.6 3.2 3.2 0 0 0 2.3 5.3h.4V6.9' }),
        h('path', { key: 'b', d: 'M14.5 4.6a3.1 3.1 0 0 1 3.1 3.1 3.1 3.1 0 0 1 1.7 5.6 3.2 3.2 0 0 1-2.3 5.3h-.4V6.9' }),
        h('path', { key: 'c', d: 'M9.5 9.2h1.6M9.5 14.2h1.6M13 9.2h1.5M13 14.2h1.5' }),
      ]),
      chevron: (props) => h(Svg, props, [h('path', { key: 'a', d: 'm8 10 4 4 4-4' })]),
      arrowDown: (props) => h(Svg, props, [h('path', { key: 'a', d: 'M12 5v14' }), h('path', { key: 'b', d: 'm6 13 6 6 6-6' })]),
      history: (props) => h(Svg, props, [h('path', { key: 'a', d: 'M4 12a8 8 0 1 0 2.4-5.7' }), h('path', { key: 'b', d: 'M4 5v5h5' }), h('path', { key: 'c', d: 'M12 8v4.4l2.8 1.7' })]),
      spark: (props) => h(Svg, props, [h('path', { key: 'a', d: 'M12 3.5 13.9 9l5.6 1.9-5.6 1.9L12 18.4l-1.9-5.6L4.5 10.9 10.1 9Z' })]),
      globe: (props) => h(Svg, props, [
        h('circle', { key: 'a', cx: 12, cy: 12, r: 8 }),
        h('path', { key: 'b', d: 'M4 12h16' }),
        h('path', { key: 'c', d: 'M12 4c2.2 2.2 3.3 5 3.3 8s-1.1 5.8-3.3 8c-2.2-2.2-3.3-5-3.3-8S9.8 6.2 12 4Z' }),
      ]),
      paperclip: (props) => h(Svg, props, [h('path', {
        key: 'a',
        d: 'M20 11.5 12.2 19.3a5 5 0 0 1-7.1-7.1l8.1-8.1a3.4 3.4 0 0 1 4.8 4.8l-8.1 8.1a1.8 1.8 0 0 1-2.5-2.5l7.4-7.4',
      })]),
    }

    /* ------------------------------------------------------------------ */
    /* Small utilities                                                     */
    /* ------------------------------------------------------------------ */

    function readString(key) {
      try { return localStorage.getItem(key) } catch { return null }
    }

    function writeString(key, value) {
      try {
        if (value === null || value === undefined) localStorage.removeItem(key)
        else localStorage.setItem(key, value)
      } catch { /* storage unavailable */ }
    }

    /** Bound one promise so a stuck Host call cannot disable the composer. */
    function withTimeout(promise, milliseconds, message) {
      let timer
      const timeout = new Promise((_, reject) => {
        timer = window.setTimeout(() => reject(new Error(message)), milliseconds)
      })
      return Promise.race([promise, timeout]).finally(() => {
        if (timer !== undefined) window.clearTimeout(timer)
      })
    }

    function draftKey(id) {
      return 'dsh.deepseek-pure-chat.draft.' + (id === null || id === undefined ? 'new' : id)
    }

    /** Resolve the active Harness color scheme without requiring the Theme service. */
    function hostColorScheme(ctx) {
      try {
        const theme = ctx.get('theme')
        const snapshot = theme === undefined ? undefined : theme.getSnapshot()
        const scheme = snapshot && snapshot.active ? snapshot.active.colorScheme : undefined
        return scheme === 'light' || scheme === 'dark' ? scheme : null
      } catch {
        return null
      }
    }

    function copyText(text) {
      const clipboard = typeof navigator !== 'undefined' ? navigator.clipboard : undefined
      if (clipboard && typeof clipboard.writeText === 'function') {
        return clipboard.writeText(text).then(() => true, () => fallbackCopy(text))
      }
      return Promise.resolve(fallbackCopy(text))
    }

    function fallbackCopy(text) {
      if (typeof document === 'undefined') return false
      const area = document.createElement('textarea')
      area.value = text
      area.setAttribute('readonly', '')
      area.style.position = 'fixed'
      area.style.top = '-1000px'
      area.style.opacity = '0'
      document.body.appendChild(area)
      let ok = false
      try {
        area.select()
        ok = document.execCommand('copy')
      } catch {
        ok = false
      } finally {
        document.body.removeChild(area)
      }
      return ok
    }

    function startOfDay(time) {
      const date = new Date(time)
      date.setHours(0, 0, 0, 0)
      return date.getTime()
    }

    function groupOf(time, now) {
      const day = 24 * 60 * 60 * 1000
      const diff = Math.floor((startOfDay(now) - startOfDay(time)) / day)
      if (diff <= 0) return 'today'
      if (diff === 1) return 'yesterday'
      if (diff < 7) return 'week'
      if (diff < 30) return 'month'
      return 'older'
    }

    function groupSessions(list, query, now) {
      const needle = query.trim().toLowerCase()
      const rows = []
      for (const id of list.ids) {
        const summary = list.byId[id]
        if (summary === undefined || summary === null) continue
        if (summary.origin === 'subagent') continue
        if (summary.blank === true) continue
        const title = summary.displayTitle || summary.title || ''
        if (needle !== '' && !title.toLowerCase().includes(needle)) continue
        rows.push(summary)
      }
      rows.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      const groups = new Map()
      for (const row of rows) {
        const key = groupOf(row.updatedAt || 0, now)
        if (!groups.has(key)) groups.set(key, [])
        groups.get(key).push(row)
      }
      return ['today', 'yesterday', 'week', 'month', 'older']
        .filter(key => groups.has(key))
        .map(key => ({ key, items: groups.get(key) }))
    }

    /* ------------------------------------------------------------------ */
    /* Markdown                                                            */
    /* ------------------------------------------------------------------ */

    function isSafeHref(href) {
      return /^(https?:|mailto:)/i.test(href)
    }

    function renderInline(text, keyBase) {
      const nodes = []
      const pattern = /(\*\*[^*\n]+\*\*|`[^`\n]+`|\[[^\]\n]+\]\([^)\s]+\)|\*[^*\n]+\*)/g
      let last = 0
      let match
      let index = 0
      while ((match = pattern.exec(text)) !== null) {
        if (match.index > last) nodes.push(text.slice(last, match.index))
        const token = match[0]
        const key = keyBase + ':i' + index
        index += 1
        if (token.startsWith('**') && token.endsWith('**')) {
          nodes.push(h('strong', { key }, renderInline(token.slice(2, -2), key)))
        } else if (token.startsWith('`') && token.endsWith('`')) {
          nodes.push(h('code', { key, className: 'dsp-inline-code' }, token.slice(1, -1)))
        } else if (token.startsWith('*') && token.endsWith('*')) {
          nodes.push(h('em', { key }, renderInline(token.slice(1, -1), key)))
        } else {
          const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token)
          if (link !== null && isSafeHref(link[2])) {
            nodes.push(h('a', {
              key,
              className: 'dsp-link',
              href: link[2],
              target: '_blank',
              rel: 'noreferrer noopener',
            }, link[1]))
          } else {
            nodes.push(token)
          }
        }
        last = match.index + token.length
      }
      if (last < text.length) nodes.push(text.slice(last))
      return nodes
    }

    /** Inline rendering that preserves soft line breaks as real breaks. */
    function renderInlineLines(text, keyBase) {
      const lines = String(text).split('\n')
      const nodes = []
      lines.forEach((line, index) => {
        if (index > 0) nodes.push(h('br', { key: keyBase + ':br' + index }))
        nodes.push(...renderInline(line, keyBase + ':l' + index))
      })
      return nodes
    }

    function CodeBlock({ lang, code, t }) {
      const [copied, setCopied] = useState(false)
      const onCopy = () => {
        void copyText(code).then((ok) => {
          if (!ok) return
          setCopied(true)
          window.setTimeout(() => setCopied(false), 1600)
        })
      }
      return h('div', { className: 'dsp-code' }, [
        h('div', { key: 'head', className: 'dsp-code-head' }, [
          h('span', { key: 'lang', className: 'dsp-code-lang' }, lang || 'text'),
          h('button', {
            key: 'copy',
            type: 'button',
            className: 'dsp-code-copy',
            onClick: onCopy,
            'aria-label': t('copy'),
          }, copied ? h(Icon.check, { size: 14 }) : h(Icon.copy, { size: 14 }), h('span', null, copied ? t('copied') : t('copy'))),
        ]),
        h('pre', { key: 'pre', className: 'dsp-code-pre' }, h('code', null, code)),
      ])
    }

    function renderBlocks(text, t) {
      const lines = String(text).replace(/\r\n/g, '\n').split('\n')
      const blocks = []
      let index = 0
      let key = 0
      while (index < lines.length) {
        const line = lines[index]
        if (line.trim() === '') { index += 1; continue }
        const fence = /^\s*```([^\s`]*)\s*$/.exec(line)
        if (fence !== null) {
          const lang = fence[1] || ''
          const body = []
          index += 1
          while (index < lines.length && !/^\s*```\s*$/.test(lines[index])) {
            body.push(lines[index])
            index += 1
          }
          index += 1
          blocks.push(h(CodeBlock, { key: 'c' + key, lang, code: body.join('\n'), t }))
          key += 1
          continue
        }
        const heading = /^(#{1,6})\s+(.*)$/.exec(line)
        if (heading !== null) {
          const level = Math.min(6, heading[1].length)
          blocks.push(h('h' + level, { key: 'h' + key, className: 'dsp-md-h dsp-md-h' + level }, renderInline(heading[2], 'h' + key)))
          key += 1
          index += 1
          continue
        }
        if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
          blocks.push(h('hr', { key: 'r' + key, className: 'dsp-md-rule' }))
          key += 1
          index += 1
          continue
        }
        if (/^\s*>/.test(line)) {
          const quote = []
          while (index < lines.length && /^\s*>/.test(lines[index])) {
            quote.push(lines[index].replace(/^\s*>\s?/, ''))
            index += 1
          }
          blocks.push(h('blockquote', { key: 'q' + key, className: 'dsp-md-quote' }, renderBlocks(quote.join('\n'), t)))
          key += 1
          continue
        }
        const tableSeparator = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/
        if (line.includes('|') && index + 1 < lines.length && tableSeparator.test(lines[index + 1])) {
          const parseRow = (row) => row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim())
          const header = parseRow(line)
          index += 2
          const rows = []
          while (index < lines.length && lines[index].includes('|') && lines[index].trim() !== '') {
            rows.push(parseRow(lines[index]))
            index += 1
          }
          blocks.push(h('div', { key: 't' + key, className: 'dsp-table-wrap' }, h('table', {
            className: 'dsp-md-table',
          }, [
            h('thead', { key: 'head' }, h('tr', null, header.map((cell, column) => (
              h('th', { key: column }, renderInlineLines(cell, 'th' + key + ':' + column))
            )))),
            h('tbody', { key: 'body' }, rows.map((row, rowIndex) => (
              h('tr', { key: rowIndex }, header.map((_, column) => (
                h('td', { key: column }, renderInlineLines(row[column] ?? '', 'td' + key + ':' + rowIndex + ':' + column))
              )))
            ))),
          ])))
          key += 1
          continue
        }
        if (/^\s*[-*+]\s+/.test(line)) {
          const items = []
          while (index < lines.length && /^\s*[-*+]\s+/.test(lines[index])) {
            items.push(h('li', { key: 'li' + items.length }, renderInlineLines(lines[index].replace(/^\s*[-*+]\s+/, ''), 'li' + key + ':' + items.length)))
            index += 1
          }
          blocks.push(h('ul', { key: 'u' + key, className: 'dsp-md-list' }, items))
          key += 1
          continue
        }
        if (/^\s*\d+[.)]\s+/.test(line)) {
          const items = []
          while (index < lines.length && /^\s*\d+[.)]\s+/.test(lines[index])) {
            items.push(h('li', { key: 'li' + items.length }, renderInlineLines(lines[index].replace(/^\s*\d+[.)]\s+/, ''), 'ol' + key + ':' + items.length)))
            index += 1
          }
          blocks.push(h('ol', { key: 'o' + key, className: 'dsp-md-list' }, items))
          key += 1
          continue
        }
        const paragraph = [line]
        index += 1
        while (index < lines.length && lines[index].trim() !== ''
          && !/^\s*(```|#{1,6}\s|>|[-*+]\s+|\d+[.)]\s+)/.test(lines[index])) {
          paragraph.push(lines[index])
          index += 1
        }
        blocks.push(h('p', { key: 'p' + key, className: 'dsp-md-p' }, renderInlineLines(paragraph.join('\n'), 'p' + key)))
        key += 1
      }
      return blocks
    }

    function Markdown({ text, t }) {
      return h('div', { className: 'dsp-markdown' }, renderBlocks(text, t))
    }

    /* ------------------------------------------------------------------ */
    /* Chat components                                                     */
    /* ------------------------------------------------------------------ */

    function ThinkingDots({ label }) {
      return h('div', { className: 'dsp-thinking', role: 'status', 'aria-live': 'polite' }, [
        h('span', { key: 'dots', className: 'dsp-dots', 'aria-hidden': true }, [
          h('i', { key: '1' }), h('i', { key: '2' }), h('i', { key: '3' }),
        ]),
        label === undefined ? null : h('span', { key: 'label', className: 'dsp-thinking-label' }, label),
      ])
    }

    function Reasoning({ text, streaming, t }) {
      const [open, setOpen] = useState(streaming)
      const previous = useRef(streaming)
      useEffect(() => {
        if (previous.current !== streaming) {
          setOpen(streaming)
          previous.current = streaming
        }
      }, [streaming])
      if (text.trim() === '') return null
      return h('div', { className: 'dsp-reasoning', 'data-open': open ? 'true' : 'false' }, [
        h('button', {
          key: 'toggle',
          type: 'button',
          className: 'dsp-reasoning-toggle',
          onClick: () => setOpen(value => !value),
          'aria-expanded': open,
        }, [
          h(Icon.brain, { key: 'icon', size: 15, className: 'dsp-reasoning-icon' }),
          h('span', { key: 'label' }, streaming ? t('thinkingProcess') : t('thought')),
          h(Icon.chevron, { key: 'chev', size: 15, className: 'dsp-reasoning-chevron' }),
        ]),
        open ? h('div', { key: 'body', className: 'dsp-reasoning-body' }, h(Markdown, { text, t })) : null,
      ])
    }

    function AssistantMessage({ message, t }) {
      const [copied, setCopied] = useState(false)
      const onCopy = () => {
        void copyText(message.text).then((ok) => {
          if (!ok) return
          setCopied(true)
          window.setTimeout(() => setCopied(false), 1600)
        })
      }
      const hasText = message.text.trim() !== ''
      const hasReasoning = message.reasoning.trim() !== ''
      if (!hasText && !hasReasoning && !message.streaming) return null
      return h('article', { className: 'dsp-row dsp-row-assistant' }, [
        hasReasoning
          ? h(Reasoning, { key: 'r', text: message.reasoning, streaming: message.streaming && message.text.trim() === '', t })
          : null,
        message.text.trim() !== ''
          ? h('div', { key: 'body', className: 'dsp-answer' }, [
            h(Markdown, { key: 'md', text: message.text, t }),
            message.streaming ? h('span', { key: 'caret', className: 'dsp-caret', 'aria-hidden': true }) : null,
          ])
          : null,
        message.streaming && message.text.trim() === ''
          ? h(ThinkingDots, { key: 'think', label: t('thinking') })
          : null,
        message.interrupted
          ? h('div', { key: 'stopped', className: 'dsp-stopped' }, t('stopped'))
          : null,
        !message.streaming && message.text.trim() !== ''
          ? h('div', { key: 'actions', className: 'dsp-actions' }, [
            h('button', {
              key: 'copy',
              type: 'button',
              className: 'dsp-icon-btn',
              onClick: onCopy,
              'aria-label': t('copy'),
              title: copied ? t('copied') : t('copy'),
            }, copied ? h(Icon.check, { size: 16 }) : h(Icon.copy, { size: 16 })),
          ])
          : null,
      ])
    }

    const IMAGE_CACHE = new Map()

    function UserImage({ attachment, loadImage, t }) {
      const id = attachment !== null && typeof attachment === 'object' ? attachment.attachmentId : undefined
      const [url, setUrl] = useState(() => (id === undefined ? null : IMAGE_CACHE.get(id) ?? null))
      const [failed, setFailed] = useState(false)
      useEffect(() => {
        let live = true
        if (url !== null || id === undefined || attachment.offloaded === true) return undefined
        Promise.resolve(loadImage(attachment)).then((image) => {
          if (!live) return
          if (image === null || image === undefined || image.data === undefined) {
            setFailed(true)
            return
          }
          const next = bytesToDataUrl(image.data, image.mediaType || attachment.mediaType)
          IMAGE_CACHE.set(id, next)
          setUrl(next)
        }, () => {
          if (live) setFailed(true)
        })
        return () => { live = false }
      }, [attachment, id, loadImage, url])
      if (url !== null) {
        return h('img', {
          className: 'dsp-user-image',
          src: url,
          alt: attachment.name || t('image'),
          loading: 'lazy',
        })
      }
      return h('span', { className: 'dsp-image-placeholder' }, failed ? t('imageLoadFailed') : t('image'))
    }

    function UserMessage({ message, t, loadImage }) {
      const images = Array.isArray(message.images) ? message.images : []
      return h('div', { className: 'dsp-row dsp-row-user' }, [
        h('div', { key: 'bubble', className: 'dsp-bubble' }, [
          images.length > 0
            ? h('div', { key: 'images', className: 'dsp-bubble-images' }, images.map((image, index) => (
              image.previewUrl !== undefined
                ? h('img', {
                  key: 'preview-' + index,
                  className: 'dsp-user-image',
                  src: image.previewUrl,
                  alt: image.name || t('image'),
                })
                : h(UserImage, { key: 'image-' + index, attachment: image, loadImage, t })
            )))
            : null,
          message.webSearch
            ? h('div', { key: 'web', className: 'dsp-search-badge' }, [
              h(Icon.globe, { key: 'i', size: 12 }),
              h('span', { key: 'l' }, t('webSearch')),
            ])
            : null,
          message.text !== ''
            ? h('div', { key: 'text', className: 'dsp-bubble-text' }, message.text)
            : null,
        ]),
      ])
    }

    function NoticeRow({ message, t }) {
      const text = message.textKey === undefined ? message.text : t(message.textKey)
      return h('div', { className: 'dsp-row dsp-row-notice' }, [
        h('span', { key: 'n', className: 'dsp-notice', 'data-tone': message.tone || 'info' }, text),
      ])
    }

    const MessageRow = React.memo(function MessageRow({ message, t, locale, loadImage }) {
      void locale
      if (message.role === 'user') return h(UserMessage, { message, t, loadImage })
      if (message.role === 'notice') return h(NoticeRow, { message, t })
      return h(AssistantMessage, { message, t })
    })

    /* ------------------------------------------------------------------ */
    /* Composer                                                            */
    /* ------------------------------------------------------------------ */

    function ModelMenu({
      t, state, name, open, setOpen, onToggle, busy, onSelect, onReload,
    }) {
      const wrapRef = useRef(null)
      useEffect(() => {
        if (!open) return undefined
        const onDown = (event) => {
          if (wrapRef.current !== null && !wrapRef.current.contains(event.target)) setOpen(false)
        }
        document.addEventListener('mousedown', onDown)
        return () => document.removeEventListener('mousedown', onDown)
      }, [open, setOpen])
      const groups = Array.isArray(state?.groups) ? state.groups : []
      const current = state?.current ?? null
      const loading = state === null || state.status === 'loading' || state.status === 'idle'
      return h('div', { className: 'dsp-model-wrap', ref: wrapRef }, [
        h('button', {
          key: 'trigger',
          type: 'button',
          className: 'dsp-model-btn',
          onClick: onToggle,
          title: t('modelHint'),
          'aria-haspopup': 'menu',
          'aria-expanded': open,
        }, [
          h('span', { key: 'name', className: 'dsp-model-name' }, name || t('model')),
          h(Icon.chevron, { key: 'chev', size: 14, className: 'dsp-model-chevron' }),
        ]),
        open ? h('div', {
          key: 'menu',
          className: 'dsp-model-menu',
          role: 'menu',
          'aria-label': t('model'),
        }, [
          h('div', { key: 'head', className: 'dsp-model-head' }, [
            h('span', { key: 'title' }, t('model')),
            busy ? h('span', { key: 'busy', className: 'dsp-model-busy' }, t('selectingModel')) : null,
          ]),
          state?.error !== null && state?.error !== undefined
            ? h('div', { key: 'error', className: 'dsp-model-error' }, [
              h('span', { key: 'message' }, state.error),
              h('button', { key: 'retry', type: 'button', className: 'dsp-model-retry', onClick: onReload }, t('retry')),
            ])
            : null,
          loading && groups.length === 0
            ? h('div', { key: 'loading', className: 'dsp-model-empty' }, t('modelLoading'))
            : null,
          groups.length === 0 && !loading
            ? h('div', { key: 'none', className: 'dsp-model-empty' }, t('noModels'))
            : null,
          ...groups.map(group => h('div', { key: 'group:' + group.id, className: 'dsp-model-group' }, [
            h('div', { key: 'provider', className: 'dsp-model-provider' }, group.name || group.id),
            ...group.models.map(model => {
              const active = current !== null
                && current.provider === group.id
                && current.model === model.id
              return h('button', {
                key: model.id,
                type: 'button',
                role: 'menuitemradio',
                'aria-checked': active,
                className: 'dsp-model-item',
                'data-active': active ? 'true' : 'false',
                disabled: busy,
                onClick: () => {
                  onSelect({
                    provider: group.id,
                    model: model.id,
                    ...model.reasoning?.defaultEffort === undefined
                      ? {}
                      : { reasoningEffort: model.reasoning.defaultEffort },
                  })
                  setOpen(false)
                },
              }, [
                h('span', { key: 'name', className: 'dsp-model-item-name' }, model.name || model.id),
                model.reasoning === undefined
                  ? null
                  : h('span', { key: 'think', className: 'dsp-model-tag' }, t('thinkTag')),
                active ? h(Icon.check, { key: 'check', size: 14, className: 'dsp-model-check' }) : null,
              ])
            }),
          ])),
          ...(Array.isArray(state?.failures) ? state.failures : []).map(failure => (
            h('div', { key: 'failure:' + failure.id, className: 'dsp-model-failure' }, [
              h('span', { key: 'name', className: 'dsp-model-failure-name' }, failure.name || failure.id),
              h('span', { key: 'message' }, failure.message),
            ])
          )),
        ]) : null,
      ])
    }

    function Composer({
      t, draft, setDraft, onSend, onStop, running, sending, textareaRef, hero,
      attachments, onAddImages, onRemoveImage,
      modelName, modelState, modelBusy, modelOpen, setModelOpen, onToggleModelMenu, onSelectModel, onReloadModel,
      deep, canThink, onToggleDeep, webSearch, setWebSearch,
    }) {
      const canSend = (draft.trim() !== '' || attachments.length > 0) && !sending
      const fileRef = useRef(null)
      const resize = useCallback(() => {
        const area = textareaRef.current
        if (area === null) return
        area.style.height = '0px'
        area.style.height = Math.min(area.scrollHeight, 220) + 'px'
      }, [textareaRef])

      useEffect(() => { resize() }, [draft, resize])

      const submit = () => {
        if (running) { void onStop(); return }
        if (!canSend) return
        void onSend()
      }

      const onKeyDown = (event) => {
        if (event.key !== 'Enter' || event.shiftKey) return
        if (event.nativeEvent && event.nativeEvent.isComposing) return
        event.preventDefault()
        if (!running && canSend) void onSend()
      }

      const onFiles = (event) => {
        const files = Array.from(event.target.files || [])
        event.target.value = ''
        if (files.length > 0) void onAddImages(files)
      }

      const onPaste = (event) => {
        const files = Array.from(event.clipboardData?.files || [])
        if (files.length === 0) return
        event.preventDefault()
        void onAddImages(files)
      }

      const onDrop = (event) => {
        const files = Array.from(event.dataTransfer?.files || [])
        if (files.length === 0) return
        event.preventDefault()
        void onAddImages(files)
      }

      const onDragOver = (event) => {
        if (event.dataTransfer?.types?.includes('Files')) event.preventDefault()
      }

      return h('div', { className: 'dsp-composer-wrap', 'data-hero': hero ? 'true' : 'false' }, [
        h('div', {
          key: 'card',
          className: 'dsp-composer',
          onDrop,
          onDragOver,
        }, [
          attachments.length > 0
            ? h('div', { key: 'attachments', className: 'dsp-attach-rail' }, attachments.map(attachment => (
              h('div', { key: attachment.id, className: 'dsp-attach-chip' }, [
                h('img', {
                  key: 'img',
                  src: attachment.previewUrl,
                  alt: attachment.name || t('image'),
                  title: attachment.name || t('image'),
                }),
                h('button', {
                  key: 'remove',
                  type: 'button',
                  className: 'dsp-attach-remove',
                  onClick: () => onRemoveImage(attachment.id),
                  'aria-label': t('removeImage'),
                  title: t('removeImage'),
                }, h(Icon.close, { size: 11 })),
              ])
            )))
            : null,
          h('textarea', {
            key: 'input',
            ref: textareaRef,
            className: 'dsp-textarea',
            value: draft,
            rows: 1,
            placeholder: t('placeholder'),
            'aria-label': t('placeholder'),
            onChange: event => setDraft(event.target.value),
            onKeyDown,
            onPaste,
          }),
          h('div', { key: 'bar', className: 'dsp-composer-bar' }, [
            h('div', { key: 'left', className: 'dsp-composer-left' }, [
              h(ModelMenu, {
                key: 'model',
                t,
                state: modelState,
                name: modelName,
                open: modelOpen,
                setOpen: setModelOpen,
                onToggle: onToggleModelMenu,
                busy: modelBusy,
                onSelect: onSelectModel,
                onReload: onReloadModel,
              }),
              h('button', {
                key: 'think',
                type: 'button',
                className: 'dsp-pill',
                'data-active': deep ? 'true' : 'false',
                disabled: !canThink || modelBusy,
                title: !canThink ? t('deepThinkUnsupported') : deep ? t('deepThinkOff') : t('deepThinkOn'),
                onClick: onToggleDeep,
                'aria-pressed': deep,
              }, [h(Icon.brain, { key: 'i', size: 15 }), h('span', { key: 'l' }, t('deepThink'))]),
              h('button', {
                key: 'web',
                type: 'button',
                className: 'dsp-pill',
                'data-active': webSearch ? 'true' : 'false',
                title: t('webSearchHint'),
                onClick: () => setWebSearch(value => !value),
                'aria-pressed': webSearch,
              }, [h(Icon.globe, { key: 'i', size: 15 }), h('span', { key: 'l' }, t('webSearch'))]),
              h('button', {
                key: 'attach',
                type: 'button',
                className: 'dsp-icon-btn dsp-attach-btn',
                onClick: () => fileRef.current?.click(),
                disabled: sending,
                title: t('attachHint'),
                'aria-label': t('attach'),
              }, h(Icon.paperclip, { size: 17 })),
              h('input', {
                key: 'file',
                ref: fileRef,
                type: 'file',
                accept: IMAGE_TYPES.join(','),
                multiple: true,
                style: { display: 'none' },
                onChange: onFiles,
              }),
            ]),
            h('div', { key: 'right', className: 'dsp-composer-right' }, running
              ? h('button', {
                key: 'stop',
                type: 'button',
                className: 'dsp-submit dsp-submit-stop',
                onClick: () => { void onStop() },
                'aria-label': t('stop'),
                title: t('stop'),
              }, h(Icon.stop, { size: 18 }))
              : h('button', {
                key: 'send',
                type: 'button',
                className: 'dsp-submit',
                disabled: !canSend,
                onClick: submit,
                'aria-label': t('send'),
                title: t('send'),
              }, h(Icon.send, { size: 18 }))),
          ]),
        ]),
        h('div', { key: 'note', className: 'dsp-disclaimer' }, t('disclaimer')),
      ])
    }

    /* ------------------------------------------------------------------ */
    /* Sidebar                                                             */
    /* ------------------------------------------------------------------ */

    function SessionItem({ summary, label, active, running, onSelect }) {
      return h('button', {
        type: 'button',
        className: 'dsp-session',
        'data-active': active ? 'true' : 'false',
        onClick: () => onSelect(summary.id),
        title: label,
        'aria-current': active ? 'true' : undefined,
      }, [
        running ? h('span', { key: 'dot', className: 'dsp-session-dot', 'aria-hidden': true }) : null,
        h('span', { key: 'title', className: 'dsp-session-title' }, label),
      ])
    }

    function Sidebar({
      t, list, activeId, onSelect, onNew, query, setQuery, theme, toggleTheme, onExit, mobileOpen, listError, onRetry,
    }) {
      const groups = groupSessions(list, query, Date.now())
      return h('aside', {
        className: 'dsp-sidebar',
        'data-mobile-open': mobileOpen ? 'true' : 'false',
        'aria-label': t('menu'),
      }, [
        h('div', { key: 'brand', className: 'dsp-brand' }, [
          h('span', { key: 'mark', className: 'dsp-brand-mark' }, h(BrandMark, { size: 30 })),
          h('span', { key: 'name', className: 'dsp-brand-name' }, 'deepseek'),
        ]),
        h('button', {
          key: 'new',
          type: 'button',
          className: 'dsp-new',
          onClick: onNew,
        }, [h(Icon.plus, { key: 'i', size: 17 }), h('span', { key: 'l' }, t('newChat'))]),
        h('label', { key: 'search', className: 'dsp-search' }, [
          h(Icon.search, { key: 'i', size: 15, className: 'dsp-search-icon' }),
          h('input', {
            key: 'input',
            type: 'text',
            value: query,
            placeholder: t('searchPlaceholder'),
            'aria-label': t('searchPlaceholder'),
            onChange: event => setQuery(event.target.value),
          }),
        ]),
        h('div', { key: 'list', className: 'dsp-history' },
          list.phase !== 'ready'
            ? h('div', { className: 'dsp-history-hint' }, [
              h('span', { key: 'msg' }, listError ? t('listLoadFailed') : t('loading')),
              listError
                ? h('button', { key: 'retry', type: 'button', className: 'dsp-history-retry', onClick: onRetry }, t('retry'))
                : null,
            ])
            : groups.length === 0
              ? h('div', { className: 'dsp-history-hint' }, query.trim() === '' ? t('noSessions') : t('noResults'))
              : groups.map(group => h('section', { key: group.key, className: 'dsp-group' }, [
                h('h3', { key: 'h', className: 'dsp-group-title' }, t(group.key)),
                h('div', { key: 'items', className: 'dsp-group-items' }, group.items.map(summary => (
                  h(SessionItem, {
                    key: summary.id,
                    summary,
                    label: summary.displayTitle === summary.id ? t('sessionFallback') : summary.displayTitle,
                    active: summary.id === activeId,
                    running: summary.running === true,
                    onSelect,
                  })
                ))),
              ]))),
        h('div', { key: 'footer', className: 'dsp-sidebar-footer' }, [
          h('div', { key: 'user', className: 'dsp-user' }, [
            h('span', { key: 'avatar', className: 'dsp-avatar', 'aria-hidden': true }, 'D'),
            h('span', { key: 'copy', className: 'dsp-user-copy' }, [
              h('span', { key: 'n', className: 'dsp-user-name' }, t('footerName')),
              h('span', { key: 'm', className: 'dsp-user-mode' }, t('footerMode')),
            ]),
          ]),
          h('div', { key: 'actions', className: 'dsp-sidebar-actions' }, [
            h('button', {
              key: 'theme',
              type: 'button',
              className: 'dsp-icon-btn',
              onClick: toggleTheme,
              title: theme === 'dark' ? t('themeLight') : t('themeDark'),
              'aria-label': theme === 'dark' ? t('themeLight') : t('themeDark'),
            }, theme === 'dark' ? h(Icon.sun, { size: 17 }) : h(Icon.moon, { size: 17 })),
            h('button', {
              key: 'exit',
              type: 'button',
              className: 'dsp-icon-btn',
              onClick: onExit,
              title: t('exit'),
              'aria-label': t('exit'),
            }, h(Icon.close, { size: 17 })),
          ]),
        ]),
      ])
    }

    /* ------------------------------------------------------------------ */
    /* Hero                                                                */
    /* ------------------------------------------------------------------ */

    function Hero({ t, composer, onSuggestion }) {
      const suggestions = [t('suggestion1'), t('suggestion2'), t('suggestion3'), t('suggestion4')]
      return h('div', { className: 'dsp-hero' }, [
        h('div', { key: 'head', className: 'dsp-hero-head' }, [
          h('span', { key: 'mark', className: 'dsp-hero-mark' }, h(BrandMark, { size: 44 })),
          h('h1', { key: 'title', className: 'dsp-hero-title' }, t('greeting')),
          h('p', { key: 'sub', className: 'dsp-hero-sub' }, t('subtitle')),
        ]),
        h('div', { key: 'composer', className: 'dsp-hero-composer' }, composer),
        h('div', { key: 'chips', className: 'dsp-chips' }, suggestions.map((label, index) => (
          h('button', {
            key: index,
            type: 'button',
            className: 'dsp-chip',
            onClick: () => onSuggestion(label),
          }, label)
        ))),
      ])
    }

    /* ------------------------------------------------------------------ */
    /* App                                                                 */
    /* ------------------------------------------------------------------ */

    function useObservable(subscribe, getSnapshot) {
      return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
    }

    const ABSENT_STATUS = new Map()

    /** Stable fallback when the host does not expose the status hook. */
    function useAbsentStatus(selector) {
      return selector(ABSENT_STATUS)
    }

    function PureChatApp({ ctx, t, onExit, useSessionStatus }) {
      const engineRef = useRef(null)
      if (engineRef.current === null || engineRef.current.isDisposed()) {
        engineRef.current = createEngine(ctx)
      }
      const engine = engineRef.current
      const [draft, setDraft] = useState(() => readString(draftKey(null)) ?? '')
      const [pending, setPending] = useState(null)
      const [error, setError] = useState('')
      const [query, setQuery] = useState('')
      const [mobileNav, setMobileNav] = useState(false)
      const [attachments, setAttachments] = useState([])
      const [webSearch, setWebSearch] = useState(false)
      const [model, setModel] = useState(null)
      const [modelMenuOpen, setModelMenuOpen] = useState(false)
      const [olderState, setOlderState] = useState('idle')
      const [listError, setListError] = useState(false)
      const [theme, setTheme] = useState(() => {
        const saved = readString(THEME_KEY)
        if (saved === 'light' || saved === 'dark') return saved
        const host = hostColorScheme(ctx)
        if (host !== null) return host
        if (typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
        return 'light'
      })
      const restored = useRef(false)
      const mountedRef = useRef(false)
      const loadedModelDirectories = useRef(null)
      if (loadedModelDirectories.current === null) loadedModelDirectories.current = new WeakSet()
      const draftSessionRef = useRef(draftKey(null))
      const navEpoch = useRef(0)
      const appRef = useRef(null)
      const textareaRef = useRef(null)
      const threadRef = useRef(null)
      const stick = useRef(true)
      const pendingTimer = useRef(null)

      const chat = useObservable(
        useCallback(listener => engine.subscribe(listener), [engine]),
        useCallback(() => engine.getSnapshot(), [engine]),
      )
      const list = useObservable(
        useCallback(listener => ctx.sessions.list.subscribe(listener), [ctx]),
        useCallback(() => ctx.sessions.list.getSnapshot(), [ctx]),
      )
      const locale = useObservable(
        useCallback(listener => ctx.locale.subscribe(listener), [ctx]),
        useCallback(() => ctx.locale.getSnapshot().active, [ctx]),
      )
      const useStatusHook = typeof useSessionStatus === 'function' ? useSessionStatus : useAbsentStatus
      const selectStatuses = useCallback(value => value, [])
      const statuses = useStatusHook(selectStatuses)
      const waiting = chat.activeId !== null && statuses instanceof Map
        ? statuses.get(chat.activeId)?.pendingInteraction
        : undefined
      // Resolve the optional model service once; calling ctx.get on every
      // render would make the model effect look permanently unstable.
      const [modelDirectories, setModelDirectories] = useState(() => {
        try {
          return ctx.get('modelDirectories') ?? null
        } catch {
          return null
        }
      })

      useEffect(() => {
        mountedRef.current = true
        return () => {
          mountedRef.current = false
          if (pendingTimer.current !== null) {
            window.clearTimeout(pendingTimer.current)
            pendingTimer.current = null
          }
          // React StrictMode replays effects on the same instance; dispose only
          // when the component is really gone.
          queueMicrotask(() => {
            if (!mountedRef.current) engine.dispose()
          })
        }
      }, [engine])

      const refreshList = useCallback(() => {
        setListError(false)
        ctx.sessions.refresh().catch(() => setListError(true))
      }, [ctx])

      useEffect(() => { void refreshList() }, [refreshList])

      // The model service may register after this plugin; bind it once when it
      // appears, without re-reading ctx.get on every render.
      useEffect(() => {
        if (modelDirectories !== null) return undefined
        let service = null
        try {
          service = ctx.get('modelDirectories') ?? null
        } catch {
          service = null
        }
        if (service !== null) setModelDirectories(service)
        return undefined
      }, [chat.activeId, ctx, modelDirectories])

      // Return focus to the control that opened the mode when it closes.
      useEffect(() => {
        const previous = document.activeElement
        return () => {
          try {
            if (previous !== null && typeof previous.focus === 'function') previous.focus()
          } catch { /* the previous control may be gone */ }
        }
      }, [])

      // The overlay owns the keyboard while it is open: Esc leaves (or closes
      // the mobile drawer first) and Tab cannot reach the Harness UI behind it.
      useEffect(() => {
        const handle = (event) => {
          if (event.defaultPrevented) return
          if (event.key === 'Escape') {
            if (event.isComposing) return
            event.preventDefault()
            event.stopPropagation()
            if (modelMenuOpen) {
              setModelMenuOpen(false)
              return
            }
            if (mobileNav) {
              setMobileNav(false)
              return
            }
            onExit()
            return
          }
          if (event.key !== 'Tab') return
          const root = appRef.current
          if (root === null) return
          const focusables = Array.from(root.querySelectorAll(
            'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
          )).filter((element) => {
            const rect = element.getBoundingClientRect()
            return rect.width > 0 && rect.right > 0 && rect.left < window.innerWidth
          })
          if (focusables.length === 0) return
          const first = focusables[0]
          const last = focusables[focusables.length - 1]
          if (!focusables.includes(document.activeElement)) {
            event.preventDefault()
            first.focus()
            return
          }
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault()
            last.focus()
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault()
            first.focus()
          }
        }
        document.addEventListener('keydown', handle, true)
        return () => document.removeEventListener('keydown', handle, true)
      }, [mobileNav, modelMenuOpen, onExit])

      // Restore the last conversation once the catalog is ready. No Session is
      // created here: the model menu, image picker, and send path create one
      // lazily, so opening pure chat never starts Host work on its own.
      useEffect(() => {
        if (restored.current) return
        if (list.phase !== 'ready') return
        restored.current = true
        const saved = readString(ACTIVE_KEY)
        if (saved !== null && list.byId[saved] !== undefined) engine.open(saved)
      }, [list, engine])

      // One shared per-session model directory supplies the catalog and both
      // model and reasoning-effort selection. The directory is loaded once and
      // state is only replaced when one of its public fields changes.
      useEffect(() => {
        if (chat.activeId === null || modelDirectories === null) {
          setModel(null)
          return undefined
        }
        let directory
        try {
          directory = modelDirectories.directoryFor(chat.activeId)
        } catch {
          setModel(null)
          return undefined
        }
        let live = true
        const update = () => {
          if (!live) return
          const next = directory.store.getSnapshot()
          setModel(previous => sameModelState(previous, next) ? previous : next)
        }
        update()
        const off = directory.store.subscribe(update)
        // The catalog is loaded lazily when the model menu opens; opening a
        // saved conversation must not start model-catalog work by itself.
        return () => {
          live = false
          off()
        }
      }, [chat.activeId, modelDirectories])

      // Focus the composer when the surface opens or a new chat starts.
      useEffect(() => {
        window.requestAnimationFrame(() => textareaRef.current?.focus())
      }, [chat.activeId])

      // Each conversation keeps its own unsent draft across switches and exits.
      useEffect(() => {
        const key = draftKey(chat.activeId)
        draftSessionRef.current = key
        setDraft(readString(key) ?? '')
        setOlderState('idle')
      }, [chat.activeId])

      const updateDraft = useCallback((value) => {
        setDraft(value)
        writeString(draftSessionRef.current, value === '' ? null : value)
      }, [])

      const modelGroups = Array.isArray(model?.groups) ? model.groups : []
      const currentSelection = model?.current ?? null
      const currentModelEntry = currentSelection === null
        ? undefined
        : modelGroups.find(group => group.id === currentSelection.provider)
          ?.models.find(entry => entry.id === currentSelection.model)
      const reasoningEfforts = Array.isArray(currentModelEntry?.reasoning?.efforts)
        ? currentModelEntry.reasoning.efforts
        : []
      const currentEffort = currentSelection?.reasoningEffort
        ?? currentModelEntry?.reasoning?.defaultEffort
      const deepEffort = reasoningEfforts.length > 0
        ? reasoningEfforts[reasoningEfforts.length - 1].id
        : undefined
      const canThink = reasoningEfforts.length > 1
      const deep = canThink && currentEffort === deepEffort
      const modelName = currentModelEntry?.name || currentSelection?.model || ''
      const modelBusy = model?.status === 'selecting' || (model?.pending ?? null) !== null

      const selectModel = useCallback(async (selection) => {
        if (modelDirectories === undefined || chat.activeId === null) return
        let directory
        try {
          directory = modelDirectories.directoryFor(chat.activeId)
        } catch (failure) {
          setError(errorMessage(failure) || t('modelFailed'))
          return
        }
        const result = await directory.select(selection)
        if (result !== null && typeof result === 'object' && result.ok === false) {
          setError(result.error.code + ': ' + result.error.message)
        }
      }, [chat.activeId, modelDirectories, t])

      const toggleDeep = useCallback(() => {
        if (!canThink || currentSelection === null) return
        const target = deep ? reasoningEfforts[0] : reasoningEfforts[reasoningEfforts.length - 1]
        if (target === undefined) return
        void selectModel({
          provider: currentSelection.provider,
          model: currentSelection.model,
          reasoningEffort: target.id,
        })
      }, [canThink, currentSelection, deep, reasoningEfforts, selectModel])

      const reloadModel = useCallback(() => {
        if (modelDirectories === null || chat.activeId === null) return
        try {
          modelDirectories.directoryFor(chat.activeId).load().catch(() => {})
        } catch { /* the directory store keeps its error */ }
      }, [chat.activeId, modelDirectories])

      const loadModelCatalog = useCallback(() => {
        if (modelDirectories === null || chat.activeId === null) return
        let directory
        try {
          directory = modelDirectories.directoryFor(chat.activeId)
        } catch {
          return
        }
        if (loadedModelDirectories.current.has(directory)) return
        loadedModelDirectories.current.add(directory)
        directory.load().catch(() => { /* surfaced on the directory store */ })
      }, [chat.activeId, modelDirectories])

      // Load the catalog only while the model menu is actually open.
      useEffect(() => {
        if (modelMenuOpen) loadModelCatalog()
      }, [loadModelCatalog, modelMenuOpen])

      const toggleModelMenu = useCallback(() => {
        if (modelMenuOpen) {
          setModelMenuOpen(false)
          return
        }
        setModelMenuOpen(true)
        if (chat.activeId === null) {
          engine.ensure().catch((failure) => {
            setError(errorMessage(failure) || t('sendFailed'))
          })
        }
      }, [chat.activeId, engine, modelMenuOpen, t])

      const addImages = useCallback(async (files) => {
        if (!Array.isArray(files) || files.length === 0) return
        setError('')
        if (chat.activeId === null) {
          try {
            await engine.ensure()
          } catch (failure) {
            setError(errorMessage(failure) || t('sendFailed'))
            return
          }
        }
        const limits = engine.imageLimits()
        const maxImages = typeof limits?.maxImagesPerMessage === 'number'
          ? limits.maxImagesPerMessage
          : MAX_IMAGES
        const maxBytes = typeof limits?.maxImageBytes === 'number'
          ? limits.maxImageBytes
          : MAX_IMAGE_BYTES
        const currentCount = attachments.length
        const accepted = []
        for (const file of files) {
          const mediaType = file.type === 'image/jpg' ? 'image/jpeg' : file.type
          if (!IMAGE_TYPES.includes(mediaType)) {
            setError(t('unsupportedImage'))
            continue
          }
          if (file.size > maxBytes) {
            setError(t('imageTooLarge'))
            continue
          }
          if (currentCount + accepted.length >= maxImages) {
            setError(t('tooManyImages'))
            break
          }
          try {
            const read = await readImageFile(file)
            accepted.push({
              id: 'image-' + Date.now() + '-' + Math.random().toString(16).slice(2),
              ...read,
              mediaType,
            })
          } catch {
            setError(t('imageLoadFailed'))
          }
        }
        if (accepted.length > 0) {
          setAttachments(previous => [...previous, ...accepted].slice(0, maxImages))
        }
      }, [attachments.length, chat.activeId, engine, t])

      const removeAttachment = useCallback((id) => {
        setAttachments(previous => previous.filter(attachment => attachment.id !== id))
      }, [])

      // Follow the newest message while the reader is near the bottom.
      useEffect(() => {
        const element = threadRef.current
        if (element === null) return
        if (stick.current) element.scrollTop = element.scrollHeight
      }, [chat.messages, chat.running, pending])

      useEffect(() => {
        stick.current = true
        const element = threadRef.current
        if (element !== null) element.scrollTop = element.scrollHeight
      }, [chat.activeId])

      // Retire the optimistic echo once the durable user message lands.
      useEffect(() => {
        if (pending === null) return
        const landed = chat.messages.some(message => (
          message.role === 'user'
          && message.text === pending.text
          && (message.images?.length ?? 0) === pending.images.length
          && Math.abs((message.time || 0) - pending.at) < 120000
        ))
        if (landed) setPending(null)
      }, [chat.messages, pending])

      const openSession = useCallback((id) => {
        stick.current = true
        navEpoch.current += 1
        if (pendingTimer.current !== null) window.clearTimeout(pendingTimer.current)
        engine.open(id)
        setQuery('')
        setMobileNav(false)
        setPending(null)
        setError('')
        setAttachments([])
        setModelMenuOpen(false)
      }, [engine])

      const handleInHarness = useCallback(() => {
        const navigation = ctx.get('uiWorkspace')
        if (chat.activeId !== null && navigation !== undefined && typeof navigation.openSession === 'function') {
          try {
            navigation.openSession(chat.activeId)
          } catch { /* navigation is best effort */ }
        }
        onExit()
      }, [chat.activeId, ctx, onExit])

      const newChat = useCallback(() => {
        stick.current = true
        navEpoch.current += 1
        if (pendingTimer.current !== null) window.clearTimeout(pendingTimer.current)
        engine.open(null)
        writeString(draftKey(null), null)
        updateDraft('')
        setPending(null)
        setError('')
        setOlderState('idle')
        setMobileNav(false)
        setAttachments([])
        setModelMenuOpen(false)
        window.requestAnimationFrame(() => textareaRef.current?.focus())
      }, [engine, updateDraft])

      const saveTheme = useCallback((next) => {
        setTheme(next)
        writeString(THEME_KEY, next)
      }, [])

      const busy = chat.sending || (pending !== null && pending.searching === true)

      const send = useCallback(async () => {
        const text = draft.trim()
        const images = attachments
        if ((text === '' && images.length === 0) || busy) return
        const epoch = navEpoch.current
        updateDraft('')
        setError('')
        setAttachments([])
        setPending({
          text,
          at: Date.now(),
          images,
          webSearch: webSearch && text !== '',
          searching: webSearch && text !== '',
        })
        stick.current = true
        if (pendingTimer.current !== null) window.clearTimeout(pendingTimer.current)
        pendingTimer.current = window.setTimeout(() => setPending(null), 120000)
        try {
          let searched = false
          if (webSearch && text !== '') {
            try {
              searched = await engine.search(text)
            } catch {
              searched = false
            }
            if (navEpoch.current !== epoch) return
            setPending(current => (current === null ? null : { ...current, searching: false }))
          }
          const content = []
          if (webSearch && text !== '' && !searched) {
            content.push({ type: 'text', text: WEB_DIRECTIVE })
          }
          if (text !== '') content.push({ type: 'text', text })
          for (const image of images) {
            content.push({
              type: 'image',
              mediaType: image.mediaType,
              data: image.data,
              ...(image.name === undefined || image.name === '' ? {} : { name: image.name }),
            })
          }
          if (content.length === 0) return
          await engine.send(content)
        } catch (failure) {
          if (navEpoch.current !== epoch) return
          setPending(null)
          setError(errorMessage(failure) || t('sendFailed'))
          updateDraft(text)
          setAttachments(images)
        }
      }, [attachments, busy, draft, engine, t, updateDraft, webSearch])

      const stop = useCallback(async () => {
        try {
          const result = await engine.stop()
          if (result !== null && typeof result === 'object' && result.ok === false) {
            throw new Error(result.error ? result.error.message : 'stop refused')
          }
        } catch (failure) {
          setError(errorMessage(failure) || t('stopFailed'))
        }
      }, [engine, t])

      const loadOlder = useCallback(async () => {
        if (olderState === 'loading') return
        setOlderState('loading')
        const element = threadRef.current
        const previousHeight = element === null ? 0 : element.scrollHeight
        const previousTop = element === null ? 0 : element.scrollTop
        try {
          await engine.loadOlder()
          setOlderState('idle')
        } catch {
          setOlderState('error')
        }
        window.requestAnimationFrame(() => {
          const target = threadRef.current
          if (target === null) return
          target.scrollTop = previousTop + Math.max(0, target.scrollHeight - previousHeight)
        })
      }, [engine, olderState])

      const pickSuggestion = useCallback((text) => {
        updateDraft(text)
        window.requestAnimationFrame(() => textareaRef.current?.focus())
      }, [updateDraft])

      const loadingSession = chat.activeId !== null
        && (chat.openState === 'loading' || chat.openState === 'cold')
        && chat.messages.length === 0
      const hero = !loadingSession && chat.messages.length === 0 && pending === null && !chat.running

      const composer = h(Composer, {
        t,
        draft,
        setDraft: updateDraft,
        onSend: send,
        onStop: stop,
        running: chat.running,
        sending: busy,
        attachments,
        onAddImages: addImages,
        onRemoveImage: removeAttachment,
        modelName,
        modelState: model,
        modelBusy,
        modelOpen: modelMenuOpen,
        setModelOpen: setModelMenuOpen,
        onToggleModelMenu: toggleModelMenu,
        onSelectModel: selectModel,
        onReloadModel: reloadModel,
        deep,
        canThink,
        onToggleDeep: toggleDeep,
        webSearch,
        setWebSearch,
        textareaRef,
        hero,
      })

      const thread = h('div', {
        key: 'thread',
        ref: threadRef,
        className: 'dsp-thread',
        onScroll: (event) => {
          const element = event.currentTarget
          stick.current = element.scrollHeight - element.scrollTop - element.clientHeight < 120
        },
      }, [
        chat.hasMore
          ? h('div', { key: 'older', className: 'dsp-older' }, h('button', {
            type: 'button',
            className: 'dsp-older-btn',
            disabled: olderState === 'loading',
            'data-state': olderState,
            onClick: () => { void loadOlder() },
          }, olderState === 'loading'
            ? t('loadingOlder')
            : olderState === 'error' ? t('loadOlderFailed') : t('loadOlder')))
          : null,
        chat.openState === 'error'
          ? h('div', { key: 'error', className: 'dsp-open-error' }, [
            h('p', { key: 'p' }, t('openFailed')),
            h('p', { key: 'm', className: 'dsp-open-error-detail' }, errorMessage(chat.openError)),
            h('button', { key: 'r', type: 'button', className: 'dsp-retry', onClick: () => engine.reopen() }, t('retry')),
          ])
          : null,
        chat.openState === 'loading' && chat.messages.length === 0
          ? h('div', { key: 'loading', className: 'dsp-loading', role: 'status' }, [
            h('span', { key: 's', className: 'dsp-shimmer' }),
            h('span', { key: 's2', className: 'dsp-shimmer dsp-shimmer-short' }),
          ])
          : null,
        chat.messages.map(message => h(MessageRow, {
          key: message.id,
          message,
          t,
          locale,
          loadImage: engine.readImage,
        })),
        pending === null ? null : h('div', { key: 'pending', className: 'dsp-pending' }, h(UserMessage, {
          message: {
            text: pending.text,
            images: pending.images,
            webSearch: pending.webSearch,
          },
          t,
          loadImage: engine.readImage,
        })),
        pending !== null && pending.searching === true
          ? h('div', { key: 'searching', className: 'dsp-searching', role: 'status' }, [
            h(Icon.globe, { key: 'i', size: 15 }),
            h('span', { key: 'l' }, t('searchingWeb')),
          ])
          : null,
        chat.running && !hasStreamingAnswer(chat.messages) ? h(ThinkingDots, { key: 'thinking', label: t('thinking') }) : null,
      ])

      return h('div', {
        ref: appRef,
        className: 'dsp-app',
        'data-theme': theme,
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': t('appName'),
      }, [
        h('style', { key: 'styles' }, STYLES),
        mobileNav ? h('button', {
          key: 'scrim',
          type: 'button',
          className: 'dsp-scrim',
          'aria-label': t('closeSidebar'),
          onClick: () => setMobileNav(false),
        }) : null,
        h(Sidebar, {
          key: 'sidebar',
          t,
          list,
          activeId: chat.activeId,
          onSelect: openSession,
          onNew: newChat,
          query,
          setQuery,
          theme,
          mobileOpen: mobileNav,
          listError,
          onRetry: refreshList,
          toggleTheme: () => saveTheme(theme === 'dark' ? 'light' : 'dark'),
          onExit,
        }),
        h('main', { key: 'main', className: 'dsp-main' }, [
          h('div', { key: 'topbar', className: 'dsp-topbar' }, [
            h('button', {
              key: 'menu',
              type: 'button',
              className: 'dsp-menu-btn',
              onClick: () => setMobileNav(value => !value),
              'aria-label': t('menu'),
              'aria-expanded': mobileNav,
            }, h(Icon.history, { size: 18 })),
            h('span', { key: 'brand', className: 'dsp-mobile-brand' }, [
              h(BrandMark, { key: 'm', size: 24 }),
              h('span', { key: 'n' }, 'deepseek'),
            ]),
            h('button', {
              key: 'exit',
              type: 'button',
              className: 'dsp-exit',
              onClick: onExit,
              title: t('exit'),
              'aria-label': t('exit'),
            }, [h(Icon.close, { key: 'i', size: 14 }), h('span', { key: 'l' }, t('exit'))]),
          ]),
          error !== ''
            ? h('div', { key: 'err', className: 'dsp-error-banner', role: 'alert' }, [
              h('span', { key: 't' }, error),
              h('button', { key: 'x', type: 'button', className: 'dsp-icon-btn', onClick: () => setError(''), 'aria-label': t('dismiss') }, h(Icon.close, { size: 15 })),
            ])
            : null,
          waiting
            ? h('div', { key: 'waiting', className: 'dsp-waiting', role: 'status' }, [
              h('span', { key: 't', className: 'dsp-waiting-text' }, t('waitingForYou')),
              h('button', { key: 'go', type: 'button', className: 'dsp-waiting-btn', onClick: handleInHarness }, t('handleInHarness')),
            ])
            : null,
          hero
            ? h(Hero, { key: 'hero', t, composer, onSuggestion: pickSuggestion })
            : h('div', { key: 'body', className: 'dsp-body' }, [thread, composer]),
        ]),
      ])
    }

    /**
     * Whether the newest row already shows live model output. A running Session
     * that is only executing tools still gets the global thinking indicator.
     */
    function hasStreamingAnswer(messages) {
      const last = messages[messages.length - 1]
      return last !== undefined && last.role === 'assistant' && last.streaming === true
        && (last.text.trim() !== '' || last.reasoning.trim() !== '')
    }

    /* ------------------------------------------------------------------ */
    /* Root + entry                                                        */
    /* ------------------------------------------------------------------ */

    function EntryPill({ t, onOpen }) {
      return h(React.Fragment, null, [
        h('style', { key: 'styles' }, STYLES),
        h('button', {
          key: 'pill',
          type: 'button',
          className: 'dsp-entry',
          onClick: onOpen,
          title: t('entryHint'),
          'aria-label': t('entryHint'),
        }, [
          h('span', { key: 'mark', className: 'dsp-entry-mark' }, h(BrandMark, { size: 20 })),
          h('span', { key: 'label', className: 'dsp-entry-label' }, t('entry')),
        ]),
      ])
    }

    class ChatBoundary extends React.Component {
      constructor(props) {
        super(props)
        this.state = { error: null }
      }

      static getDerivedStateFromError(error) {
        return { error }
      }

      componentDidCatch(error) {
        try {
          console.error('[deepseek-pure-chat] render failed', error)
        } catch { /* console unavailable */ }
      }

      render() {
        if (this.state.error !== null) {
          const message = this.state.error && this.state.error.message
            ? String(this.state.error.message)
            : String(this.state.error)
          return h('div', {
            className: 'dsp-app dsp-crash',
            'data-theme': 'light',
            role: 'alertdialog',
            'aria-label': this.props.t('crashTitle'),
          }, [
            h('style', { key: 'styles' }, STYLES),
            h('div', { key: 'box', className: 'dsp-crash-box' }, [
              h('div', { key: 'title', className: 'dsp-crash-title' }, this.props.t('crashTitle')),
              h('p', { key: 'hint', className: 'dsp-crash-hint' }, this.props.t('crashHint')),
              h('code', { key: 'error', className: 'dsp-crash-error' }, message),
              h('button', {
                key: 'close',
                type: 'button',
                className: 'dsp-crash-close',
                onClick: this.props.onExit,
              }, this.props.t('exit')),
            ]),
          ])
        }
        return this.props.children
      }
    }

    function PureChatRoot({ ctx, t, useSessionStatus }) {
      // Always start closed. A persisted "open" flag could otherwise trap the
      // whole application behind a broken overlay after a refresh.
      const [open, setOpen] = useState(false)
      // Re-render translated copy when the active Harness locale changes; `t`
      // resolves the active dictionary at call time.
      useSyncExternalStore(
        useCallback(listener => ctx.locale.subscribe(listener), [ctx]),
        useCallback(() => ctx.locale.getSnapshot().active, [ctx]),
        useCallback(() => ctx.locale.getSnapshot().active, [ctx]),
      )
      const enter = useCallback(() => {
        setOpen(true)
      }, [])
      const leave = useCallback(() => {
        setOpen(false)
      }, [])
      if (!open) return h(EntryPill, { t, onOpen: enter })
      return h(ChatBoundary, { t, onExit: leave }, h(PureChatApp, {
        ctx,
        t,
        onExit: leave,
        useSessionStatus,
      }))
    }

    /* ------------------------------------------------------------------ */
    /* Styles                                                              */
    /* ------------------------------------------------------------------ */

    const STYLES = `
.dsp-app, .dsp-entry, .dsp-app * { box-sizing: border-box; }
.dsp-crash { display: flex; align-items: center; justify-content: center; background: #f7f9fe; color: #1f2329; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; }
.dsp-crash-box { width: min(480px, calc(100vw - 40px)); padding: 22px; border: 1px solid #e8edf6; border-radius: 16px; background: #fff; box-shadow: 0 18px 60px rgba(23, 37, 84, 0.16); }
.dsp-crash-title { font-size: 17px; font-weight: 650; }
.dsp-crash-hint { margin: 8px 0; color: #6b7280; font-size: 13px; line-height: 1.6; }
.dsp-crash-error { display: block; max-height: 140px; overflow: auto; padding: 9px 11px; border-radius: 8px; background: #f6f8fc; color: #d93a3f; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 11.5px; white-space: pre-wrap; word-break: break-word; }
.dsp-crash-close { margin-top: 14px; height: 34px; padding: 0 16px; border: none; border-radius: 9px; background: #4d6bfe; color: #fff; font-size: 13px; cursor: pointer; }
.dsp-app {
  --dsp-bg: #ffffff;
  --dsp-sidebar: #f7f9fe;
  --dsp-elevated: #ffffff;
  --dsp-text: #1f2329;
  --dsp-text-2: #6b7280;
  --dsp-text-3: #98a1b0;
  --dsp-border: #e8edf6;
  --dsp-border-strong: #d8e1f0;
  --dsp-accent: #4d6bfe;
  --dsp-accent-hover: #3d5bf2;
  --dsp-accent-weak: #edf2ff;
  --dsp-user-bubble: #eff4ff;
  --dsp-hover: #eef2fb;
  --dsp-active: #e8eeff;
  --dsp-code-bg: #f6f8fc;
  --dsp-danger: #d93a3f;
  --dsp-warn: #b26a00;
  --dsp-shadow: 0 18px 60px rgba(23, 37, 84, 0.16);
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  display: flex;
  overflow: hidden;
  overscroll-behavior: contain;
  background: var(--dsp-bg);
  color: var(--dsp-text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif;
  font-size: 15px;
  line-height: 1.6;
  pointer-events: auto;
  -webkit-font-smoothing: antialiased;
  animation: dsp-fade-in 160ms ease-out;
}
html[data-windows-titlebar] .dsp-app { top: var(--dsh-windows-titlebar-height, 0px); }
.dsp-app[data-theme="dark"] {
  --dsp-bg: #1b1c1f;
  --dsp-sidebar: #212226;
  --dsp-elevated: #26272c;
  --dsp-text: #ececef;
  --dsp-text-2: #a2a7b3;
  --dsp-text-3: #767c89;
  --dsp-border: #2f3137;
  --dsp-border-strong: #3a3d45;
  --dsp-accent: #5b7bff;
  --dsp-accent-hover: #6c89ff;
  --dsp-accent-weak: #262c44;
  --dsp-user-bubble: #2b3040;
  --dsp-hover: #2a2c32;
  --dsp-active: #2c3350;
  --dsp-code-bg: #232429;
  --dsp-danger: #ff6b70;
  --dsp-warn: #f0b35a;
  --dsp-shadow: 0 18px 60px rgba(0, 0, 0, 0.55);
}
@keyframes dsp-fade-in { from { opacity: 0 } to { opacity: 1 } }
@keyframes dsp-pop { from { opacity: 0; transform: translateY(4px) } to { opacity: 1; transform: none } }
@keyframes dsp-bounce { 0%, 60%, 100% { transform: translateY(0); opacity: .45 } 30% { transform: translateY(-4px); opacity: 1 } }
@keyframes dsp-shimmer { 0% { background-position: -240px 0 } 100% { background-position: 240px 0 } }
@media (prefers-reduced-motion: reduce) {
  .dsp-app { animation: none }
  .dsp-row { animation: none }
  .dsp-dots i { animation: none }
}
.dsp-app button { font-family: inherit; }
.dsp-sidebar {
  width: 268px;
  flex: 0 0 268px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 10px 12px 12px;
  background: var(--dsp-sidebar);
  border-right: 1px solid var(--dsp-border);
}
.dsp-brand { display: flex; align-items: center; gap: 9px; padding: 8px 8px 10px; }
.dsp-brand-mark { display: inline-flex; color: var(--dsp-accent); }
.dsp-brand-name { font-size: 18px; font-weight: 650; letter-spacing: -0.2px; color: var(--dsp-text); }
.dsp-new {
  display: flex; align-items: center; justify-content: center; gap: 7px;
  width: 100%; height: 42px; margin: 2px 0 10px;
  border: none; border-radius: 12px; cursor: pointer;
  background: var(--dsp-accent); color: #fff;
  font-size: 14px; font-weight: 550;
  transition: background 120ms ease, transform 120ms ease;
}
.dsp-new:hover { background: var(--dsp-accent-hover); }
.dsp-new:active { transform: scale(0.99); }
.dsp-search {
  display: flex; align-items: center; gap: 7px;
  height: 36px; margin-bottom: 8px; padding: 0 10px;
  border: 1px solid var(--dsp-border); border-radius: 10px;
  background: var(--dsp-elevated); color: var(--dsp-text-3);
}
.dsp-search:focus-within { border-color: var(--dsp-accent); box-shadow: 0 0 0 3px rgba(77, 107, 254, 0.12); }
.dsp-search-icon { flex: 0 0 auto; }
.dsp-search input {
  flex: 1; min-width: 0; height: 100%;
  border: none; outline: none; background: transparent;
  color: var(--dsp-text); font-size: 13px;
}
.dsp-search input::placeholder { color: var(--dsp-text-3); }
.dsp-history { flex: 1; min-height: 0; overflow-y: auto; margin: 2px -4px 0; padding: 0 4px 8px; scrollbar-width: thin; overscroll-behavior: contain; }
.dsp-history::-webkit-scrollbar, .dsp-thread::-webkit-scrollbar { width: 6px; }
.dsp-history::-webkit-scrollbar-thumb, .dsp-thread::-webkit-scrollbar-thumb { background: var(--dsp-border-strong); border-radius: 999px; }
.dsp-history-hint { padding: 18px 10px; color: var(--dsp-text-3); font-size: 12.5px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.dsp-history-retry {
  padding: 3px 12px; border: 1px solid var(--dsp-border); border-radius: 7px;
  background: transparent; color: var(--dsp-accent); font-size: 12px; cursor: pointer;
}
.dsp-history-retry:hover { border-color: var(--dsp-accent); }
.dsp-group { margin-bottom: 10px; }
.dsp-group-title { margin: 10px 8px 5px; color: var(--dsp-text-3); font-size: 11.5px; font-weight: 500; letter-spacing: 0.02em; }
.dsp-group-items { display: flex; flex-direction: column; gap: 1px; }
.dsp-session {
  display: flex; align-items: center; gap: 7px;
  width: 100%; height: 36px; padding: 0 10px;
  border: none; border-radius: 9px; background: transparent;
  color: var(--dsp-text-2); font-size: 13.5px; text-align: left; cursor: pointer;
  transition: background 100ms ease, color 100ms ease;
}
.dsp-session:hover { background: var(--dsp-hover); color: var(--dsp-text); }
.dsp-session[data-active="true"] { background: var(--dsp-active); color: var(--dsp-accent); font-weight: 550; }
.dsp-session-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsp-session-dot { flex: 0 0 auto; width: 6px; height: 6px; border-radius: 999px; background: var(--dsp-accent); }
.dsp-sidebar-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 4px 0; border-top: 1px solid var(--dsp-border); }
.dsp-user { display: flex; align-items: center; gap: 8px; min-width: 0; }
.dsp-avatar {
  display: inline-flex; align-items: center; justify-content: center;
  width: 30px; height: 30px; border-radius: 999px;
  background: linear-gradient(135deg, #7d93ff, #4d6bfe);
  color: #fff; font-size: 13px; font-weight: 650; flex: 0 0 auto;
}
.dsp-user-copy { display: flex; flex-direction: column; min-width: 0; line-height: 1.25; }
.dsp-user-name { font-size: 12.5px; color: var(--dsp-text); white-space: nowrap; }
.dsp-user-mode { font-size: 11px; color: var(--dsp-text-3); white-space: nowrap; }
.dsp-sidebar-actions { display: flex; align-items: center; gap: 2px; }
.dsp-icon-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; padding: 0; border: none; border-radius: 7px;
  background: transparent; color: var(--dsp-text-2); cursor: pointer;
}
.dsp-icon-btn:hover { background: var(--dsp-hover); color: var(--dsp-text); }
.dsp-main { position: relative; display: flex; flex-direction: column; flex: 1; min-width: 0; min-height: 0; }
.dsp-topbar { position: absolute; top: 12px; right: 16px; left: 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; z-index: 5; pointer-events: none; }
.dsp-topbar > * { pointer-events: auto; }
.dsp-menu-btn {
  display: none; align-items: center; justify-content: center;
  width: 32px; height: 32px; padding: 0;
  border: 1px solid var(--dsp-border); border-radius: 9px;
  background: var(--dsp-elevated); color: var(--dsp-text-2); cursor: pointer;
}
.dsp-menu-btn:hover { color: var(--dsp-text); }
.dsp-scrim { display: none; }
.dsp-mobile-brand { display: none; align-items: center; gap: 7px; font-size: 15px; font-weight: 650; color: var(--dsp-text); margin-right: auto; }
.dsp-mobile-brand svg { color: var(--dsp-accent); }
.dsp-exit {
  display: inline-flex; align-items: center; gap: 6px;
  height: 30px; margin-left: auto; padding: 0 12px;
  border: 1px solid var(--dsp-border); border-radius: 999px;
  background: var(--dsp-elevated); color: var(--dsp-text-2);
  font-size: 12px; cursor: pointer; box-shadow: 0 2px 10px rgba(20, 30, 60, 0.05);
  opacity: 0.9; transition: opacity 120ms ease, color 120ms ease, border-color 120ms ease;
}
.dsp-exit:hover { opacity: 1; color: var(--dsp-text); border-color: var(--dsp-border-strong); }
.dsp-body { display: flex; flex-direction: column; flex: 1; min-height: 0; }
.dsp-thread { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 76px 28px 8px; }
.dsp-thread > * { max-width: 760px; margin-left: auto; margin-right: auto; }
.dsp-row { animation: dsp-pop 140ms ease-out; }
.dsp-row-user { display: flex; justify-content: flex-end; margin-top: 26px; }
.dsp-bubble {
  max-width: 78%; padding: 10px 15px;
  border-radius: 16px 16px 4px 16px;
  background: var(--dsp-user-bubble); color: var(--dsp-text);
  font-size: 15px; line-height: 1.72;
  word-break: break-word; overflow-wrap: anywhere;
}
.dsp-bubble-text { white-space: pre-wrap; }
.dsp-bubble-images { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 6px; }
.dsp-user-image {
  display: block; max-width: 230px; max-height: 230px;
  border-radius: 10px; object-fit: cover;
  border: 1px solid var(--dsp-border);
}
.dsp-image-placeholder {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 96px; height: 64px; padding: 0 10px;
  border: 1px dashed var(--dsp-border-strong); border-radius: 9px;
  color: var(--dsp-text-3); font-size: 11.5px;
}
.dsp-search-badge {
  display: inline-flex; align-items: center; gap: 4px;
  margin-bottom: 6px; padding: 2px 7px;
  border-radius: 999px; background: var(--dsp-accent-weak); color: var(--dsp-accent);
  font-size: 11px;
}
.dsp-pending { opacity: 0.76; }
.dsp-searching {
  display: flex; align-items: center; gap: 7px;
  max-width: 760px; margin: 12px auto 0;
  color: var(--dsp-text-3); font-size: 12.5px;
}
.dsp-searching svg { color: var(--dsp-accent); animation: dsp-pulse 1.2s ease-in-out infinite; }
@keyframes dsp-pulse { 50% { opacity: 0.35 } }
.dsp-row-assistant { position: relative; margin-top: 26px; padding-bottom: 4px; }
.dsp-answer { color: var(--dsp-text); }
.dsp-markdown { font-size: 15.5px; line-height: 1.85; word-break: break-word; }
.dsp-md-p { margin: 0 0 12px; }
.dsp-markdown > *:last-child { margin-bottom: 0; }
.dsp-md-h { margin: 20px 0 10px; font-weight: 650; line-height: 1.4; }
.dsp-md-h1 { font-size: 23px; }
.dsp-md-h2 { font-size: 20px; }
.dsp-md-h3 { font-size: 17.5px; }
.dsp-md-h4, .dsp-md-h5, .dsp-md-h6 { font-size: 16px; }
.dsp-md-list { margin: 0 0 12px; padding-left: 22px; }
.dsp-md-list li { margin: 4px 0; }
.dsp-md-quote { margin: 0 0 12px; padding: 2px 0 2px 14px; border-left: 3px solid var(--dsp-border-strong); color: var(--dsp-text-2); }
.dsp-md-rule { margin: 18px 0; border: none; border-top: 1px solid var(--dsp-border); }
.dsp-table-wrap { margin: 4px 0 14px; overflow-x: auto; border: 1px solid var(--dsp-border); border-radius: 10px; }
.dsp-md-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.dsp-md-table th, .dsp-md-table td { padding: 8px 12px; border-bottom: 1px solid var(--dsp-border); text-align: left; vertical-align: top; }
.dsp-md-table th { background: var(--dsp-code-bg); font-weight: 600; color: var(--dsp-text); }
.dsp-md-table tr:last-child td { border-bottom: none; }
.dsp-inline-code {
  padding: 1px 5px; border-radius: 5px;
  background: var(--dsp-accent-weak); color: var(--dsp-accent);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.88em;
}
.dsp-link { color: var(--dsp-accent); text-decoration: none; }
.dsp-link:hover { text-decoration: underline; }
.dsp-code { margin: 4px 0 14px; border: 1px solid var(--dsp-border); border-radius: 12px; overflow: hidden; background: var(--dsp-code-bg); }
.dsp-code-head { display: flex; align-items: center; justify-content: space-between; height: 34px; padding: 0 8px 0 14px; border-bottom: 1px solid var(--dsp-border); }
.dsp-code-lang { color: var(--dsp-text-3); font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.04em; }
.dsp-code-copy {
  display: inline-flex; align-items: center; gap: 5px;
  height: 24px; padding: 0 7px; border: none; border-radius: 6px;
  background: transparent; color: var(--dsp-text-3); font-size: 11.5px; cursor: pointer;
}
.dsp-code-copy:hover { background: var(--dsp-hover); color: var(--dsp-text); }
.dsp-code-pre { margin: 0; padding: 13px 16px; overflow-x: auto; }
.dsp-code-pre code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 13px; line-height: 1.65; white-space: pre; color: var(--dsp-text); }
.dsp-reasoning { margin: 0 0 14px; border: 1px solid var(--dsp-border); border-radius: 12px; background: transparent; overflow: hidden; }
.dsp-reasoning-toggle {
  display: flex; align-items: center; gap: 7px;
  width: 100%; padding: 9px 13px; border: none; background: transparent;
  color: var(--dsp-text-2); font-size: 12.5px; cursor: pointer; text-align: left;
}
.dsp-reasoning-toggle:hover { background: var(--dsp-hover); }
.dsp-reasoning-icon { flex: 0 0 auto; color: var(--dsp-accent); }
.dsp-reasoning-chevron { margin-left: auto; transition: transform 140ms ease; }
.dsp-reasoning[data-open="true"] .dsp-reasoning-chevron { transform: rotate(180deg); }
.dsp-reasoning-body { padding: 2px 14px 12px; border-top: 1px solid var(--dsp-border); color: var(--dsp-text-2); font-size: 13.5px; }
.dsp-reasoning-body .dsp-markdown { font-size: 13.5px; line-height: 1.75; }
.dsp-reasoning-body .dsp-md-p { margin-bottom: 8px; }
.dsp-caret { display: inline-block; width: 7px; height: 17px; margin-left: 2px; vertical-align: -2px; border-radius: 2px; background: var(--dsp-accent); animation: dsp-caret 1s steps(2, start) infinite; }
@keyframes dsp-caret { 50% { opacity: 0 } }
.dsp-thinking { display: flex; align-items: center; gap: 9px; margin: 18px auto 6px; max-width: 760px; }
.dsp-dots { display: inline-flex; gap: 4px; }
.dsp-dots i { width: 6px; height: 6px; border-radius: 999px; background: var(--dsp-accent); animation: dsp-bounce 1.15s infinite ease-in-out; }
.dsp-dots i:nth-child(2) { animation-delay: .14s; }
.dsp-dots i:nth-child(3) { animation-delay: .28s; }
.dsp-thinking-label { color: var(--dsp-text-3); font-size: 12.5px; }
.dsp-stopped { display: inline-block; margin-top: 8px; padding: 2px 8px; border-radius: 6px; background: var(--dsp-hover); color: var(--dsp-text-3); font-size: 11.5px; }
.dsp-actions { display: flex; align-items: center; gap: 2px; margin-top: 6px; opacity: 0.55; transition: opacity 120ms ease; }
.dsp-row-assistant:hover .dsp-actions { opacity: 1; }
.dsp-row-notice { display: flex; justify-content: center; margin-top: 18px; }
.dsp-notice { padding: 5px 12px; border-radius: 999px; background: var(--dsp-hover); color: var(--dsp-text-2); font-size: 12px; }
.dsp-notice[data-tone="error"] { background: rgba(217, 58, 63, 0.1); color: var(--dsp-danger); }
.dsp-notice[data-tone="warning"] { background: rgba(178, 106, 0, 0.12); color: var(--dsp-warn); }
.dsp-older { display: flex; justify-content: center; margin-bottom: 8px; }
.dsp-older-btn { padding: 5px 14px; border: 1px solid var(--dsp-border); border-radius: 999px; background: var(--dsp-elevated); color: var(--dsp-text-2); font-size: 12px; cursor: pointer; }
.dsp-older-btn:hover { color: var(--dsp-text); border-color: var(--dsp-border-strong); }
.dsp-older-btn:disabled { opacity: 0.6; cursor: default; }
.dsp-older-btn[data-state="error"] { color: var(--dsp-danger); border-color: rgba(217, 58, 63, 0.3); }
.dsp-loading { display: flex; flex-direction: column; gap: 12px; padding-top: 30px; }
.dsp-shimmer { display: block; height: 14px; width: 62%; border-radius: 7px; background: linear-gradient(90deg, var(--dsp-hover) 25%, var(--dsp-border) 50%, var(--dsp-hover) 75%); background-size: 480px 100%; animation: dsp-shimmer 1.4s linear infinite; }
.dsp-shimmer-short { width: 38%; }
.dsp-open-error { max-width: 460px; margin: 40px auto; padding: 18px; border: 1px solid var(--dsp-border); border-radius: 14px; text-align: center; }
.dsp-open-error p { margin: 0 0 8px; }
.dsp-open-error-detail { color: var(--dsp-text-3); font-size: 12.5px; word-break: break-word; }
.dsp-retry { margin-top: 6px; padding: 6px 16px; border: 1px solid var(--dsp-border-strong); border-radius: 8px; background: transparent; color: var(--dsp-text); font-size: 13px; cursor: pointer; }
.dsp-retry:hover { border-color: var(--dsp-accent); color: var(--dsp-accent); }
.dsp-composer-wrap { flex: 0 0 auto; width: 100%; max-width: 816px; margin: 0 auto; padding: 10px 28px 18px; }
.dsp-composer-wrap[data-hero="true"] { padding: 0; max-width: 760px; }
.dsp-composer {
  border: 1px solid var(--dsp-border-strong); border-radius: 22px;
  background: var(--dsp-elevated); padding: 12px 12px 9px;
  box-shadow: 0 6px 26px rgba(23, 37, 84, 0.06);
  transition: border-color 120ms ease, box-shadow 120ms ease;
}
.dsp-composer:focus-within { border-color: var(--dsp-accent); box-shadow: 0 6px 30px rgba(77, 107, 254, 0.13); }
.dsp-textarea {
  display: block; width: 100%; min-height: 30px; max-height: 220px;
  padding: 4px 6px; border: none; outline: none; resize: none;
  background: transparent; color: var(--dsp-text);
  font-family: inherit; font-size: 15px; line-height: 1.62;
  scrollbar-width: thin;
}
.dsp-textarea::placeholder { color: var(--dsp-text-3); }
.dsp-composer-bar { display: flex; align-items: flex-end; justify-content: space-between; gap: 10px; margin-top: 6px; }
.dsp-composer-left { display: flex; align-items: center; flex-wrap: wrap; gap: 5px; min-width: 0; }
.dsp-model-wrap { position: relative; min-width: 0; }
.dsp-model-btn {
  display: inline-flex; align-items: center; gap: 4px;
  height: 30px; max-width: 170px; padding: 0 9px;
  border: 1px solid var(--dsp-border); border-radius: 999px;
  background: transparent; color: var(--dsp-text-2);
  font-size: 12.5px; cursor: pointer; transition: color 120ms ease, border-color 120ms ease;
}
.dsp-model-btn:hover:not(:disabled) { color: var(--dsp-text); border-color: var(--dsp-border-strong); }
.dsp-model-btn:disabled { opacity: 0.5; cursor: default; }
.dsp-model-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsp-model-chevron { flex: 0 0 auto; opacity: 0.7; }
.dsp-model-menu {
  position: absolute; left: 0; bottom: calc(100% + 8px); z-index: 30;
  width: 320px; max-width: calc(100vw - 40px); max-height: min(360px, 55vh); overflow-y: auto;
  padding: 6px; border: 1px solid var(--dsp-border); border-radius: 14px;
  background: var(--dsp-elevated); box-shadow: var(--dsp-shadow);
}
.dsp-model-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 5px 8px 7px; color: var(--dsp-text-3); font-size: 11.5px;
}
.dsp-model-busy { color: var(--dsp-accent); }
.dsp-model-error {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  margin: 2px 4px 6px; padding: 7px 9px; border-radius: 8px;
  background: rgba(217, 58, 63, 0.08); color: var(--dsp-danger); font-size: 11.5px;
}
.dsp-model-retry {
  flex: 0 0 auto; padding: 2px 8px; border: 1px solid currentColor; border-radius: 6px;
  background: transparent; color: inherit; font-size: 11px; cursor: pointer;
}
.dsp-model-empty { padding: 14px 8px; color: var(--dsp-text-3); font-size: 12.5px; text-align: center; }
.dsp-model-group { margin-top: 2px; }
.dsp-model-provider { padding: 7px 9px 3px; color: var(--dsp-text-3); font-size: 11px; }
.dsp-model-item {
  display: flex; align-items: center; gap: 7px;
  width: 100%; min-height: 32px; padding: 5px 9px;
  border: none; border-radius: 8px; background: transparent;
  color: var(--dsp-text); font-size: 13px; text-align: left; cursor: pointer;
}
.dsp-model-item:hover:not(:disabled) { background: var(--dsp-hover); }
.dsp-model-item[data-active="true"] { background: var(--dsp-accent-weak); color: var(--dsp-accent); }
.dsp-model-item:disabled { opacity: 0.55; cursor: default; }
.dsp-model-item-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsp-model-failure {
  display: flex; flex-direction: column; gap: 2px;
  margin: 3px 4px; padding: 7px 9px; border-radius: 8px;
  background: var(--dsp-code-bg); color: var(--dsp-text-3); font-size: 11px;
}
.dsp-model-failure-name { color: var(--dsp-text-2); font-weight: 550; }
.dsp-model-tag {
  flex: 0 0 auto; padding: 1px 6px; border-radius: 999px;
  background: var(--dsp-hover); color: var(--dsp-text-3); font-size: 10px;
}
.dsp-model-check { flex: 0 0 auto; }
.dsp-attach-btn { flex: 0 0 auto; }
.dsp-attach-rail { display: flex; flex-wrap: wrap; gap: 7px; padding: 2px 4px 8px; }
.dsp-attach-chip { position: relative; width: 56px; height: 56px; }
.dsp-attach-chip img {
  width: 56px; height: 56px; object-fit: cover;
  border: 1px solid var(--dsp-border); border-radius: 9px; display: block;
}
.dsp-attach-remove {
  position: absolute; top: -5px; right: -5px;
  display: inline-flex; align-items: center; justify-content: center;
  width: 18px; height: 18px; padding: 0; border: none; border-radius: 999px;
  background: var(--dsp-text); color: var(--dsp-bg); cursor: pointer;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}
.dsp-pill:disabled { opacity: 0.45; cursor: default; }
.dsp-pill:disabled:hover { color: var(--dsp-text-2); border-color: var(--dsp-border); }
.dsp-icon-btn:disabled { opacity: 0.45; cursor: default; }
.dsp-pill {
  display: inline-flex; align-items: center; gap: 6px;
  height: 30px; padding: 0 11px;
  border: 1px solid var(--dsp-border); border-radius: 999px;
  background: transparent; color: var(--dsp-text-2); font-size: 12.5px; cursor: pointer;
  transition: background 120ms ease, color 120ms ease, border-color 120ms ease;
}
.dsp-pill:hover { color: var(--dsp-text); border-color: var(--dsp-border-strong); }
.dsp-pill[data-active="true"] { background: var(--dsp-accent-weak); border-color: transparent; color: var(--dsp-accent); }
.dsp-composer-right { display: flex; align-items: center; gap: 6px; }
.dsp-submit {
  display: inline-flex; align-items: center; justify-content: center;
  width: 34px; height: 34px; padding: 0; border: none; border-radius: 999px;
  background: var(--dsp-accent); color: #fff; cursor: pointer;
  transition: background 120ms ease, opacity 120ms ease, transform 120ms ease;
}
.dsp-submit:hover:not(:disabled) { background: var(--dsp-accent-hover); }
.dsp-submit:active:not(:disabled) { transform: scale(0.95); }
.dsp-submit:disabled { opacity: 0.32; cursor: default; }
.dsp-submit-stop { background: transparent; color: var(--dsp-text); border: 1px solid var(--dsp-border-strong); }
.dsp-submit-stop:hover { background: var(--dsp-hover); }
.dsp-disclaimer { margin-top: 10px; color: var(--dsp-text-3); font-size: 11.5px; text-align: center; }
.dsp-hero { display: flex; flex-direction: column; justify-content: center; align-items: center; flex: 1; min-height: 0; overflow-y: auto; padding: 84px 28px 40px; }
.dsp-hero-head { width: 100%; max-width: 760px; text-align: center; }
.dsp-hero-mark { display: inline-flex; color: var(--dsp-accent); margin-bottom: 18px; }
.dsp-hero-title { margin: 0; font-size: 30px; line-height: 1.4; font-weight: 500; letter-spacing: -0.4px; color: var(--dsp-text); }
.dsp-hero-sub { margin: 12px 0 0; color: var(--dsp-text-2); font-size: 14px; line-height: 1.7; }
.dsp-hero-composer { width: 100%; max-width: 760px; margin-top: 30px; }
.dsp-chips { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; max-width: 760px; margin-top: 20px; }
.dsp-chip {
  height: 36px; padding: 0 15px;
  border: 1px solid var(--dsp-border); border-radius: 999px;
  background: var(--dsp-elevated); color: var(--dsp-text-2);
  font-size: 13px; cursor: pointer;
  transition: border-color 120ms ease, color 120ms ease, background 120ms ease;
}
.dsp-chip:hover { border-color: var(--dsp-accent); color: var(--dsp-accent); background: var(--dsp-accent-weak); }
.dsp-error-banner {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  max-width: 760px; width: calc(100% - 56px); margin: 54px auto 0; padding: 9px 12px;
  border: 1px solid rgba(217, 58, 63, 0.28); border-radius: 10px;
  background: rgba(217, 58, 63, 0.07); color: var(--dsp-danger); font-size: 13px;
}
.dsp-waiting {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  max-width: 760px; width: calc(100% - 56px); margin: 54px auto 0; padding: 9px 12px;
  border: 1px solid rgba(77, 107, 254, 0.3); border-radius: 10px;
  background: var(--dsp-accent-weak); color: var(--dsp-accent); font-size: 13px;
}
.dsp-waiting-text { min-width: 0; }
.dsp-waiting-btn {
  flex: 0 0 auto; height: 26px; padding: 0 10px;
  border: 1px solid rgba(77, 107, 254, 0.35); border-radius: 7px;
  background: transparent; color: var(--dsp-accent); font-size: 12px; cursor: pointer;
}
.dsp-waiting-btn:hover { background: rgba(77, 107, 254, 0.1); }
.dsp-entry {
  position: fixed; right: 20px; bottom: 20px; z-index: 2147482000;
  display: inline-flex; align-items: center; gap: 8px;
  height: 40px; padding: 0 15px 0 12px;
  border: 1px solid var(--dsw-alias-border-l1, #e8edf6); border-radius: 999px;
  background: var(--dsw-alias-bg-overlay, #ffffff); color: var(--dsw-alias-label-primary, #1f2329);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 13px; cursor: pointer; pointer-events: auto;
  box-shadow: 0 8px 28px rgba(23, 37, 84, 0.16);
  transition: transform 120ms ease, box-shadow 120ms ease;
}
.dsp-entry:hover { transform: translateY(-1px); box-shadow: 0 12px 34px rgba(23, 37, 84, 0.22); }
.dsp-entry-mark { display: inline-flex; color: #4d6bfe; }
.dsp-entry-label { font-weight: 550; }
@media (max-width: 960px) {
  .dsp-sidebar { width: 236px; flex-basis: 236px; }
  .dsp-hero-title { font-size: 26px; }
}
@media (max-width: 760px) {
  .dsp-sidebar {
    display: flex;
    position: fixed; top: 0; bottom: 0; left: 0;
    z-index: 40; width: 280px; flex-basis: 280px;
    transform: translateX(-104%);
    transition: transform 180ms ease;
    box-shadow: 24px 0 60px rgba(10, 18, 40, 0.22);
  }
  .dsp-sidebar[data-mobile-open="true"] { transform: none; }
  .dsp-scrim {
    display: block; position: fixed; inset: 0; z-index: 35;
    padding: 0; border: none; background: rgba(15, 23, 42, 0.4);
    cursor: pointer;
  }
  .dsp-menu-btn { display: inline-flex; }
  .dsp-mobile-brand { display: inline-flex; }
  .dsp-thread { padding: 70px 16px 8px; }
  .dsp-composer-wrap { padding: 8px 16px 14px; }
  .dsp-hero { padding: 76px 16px 30px; }
  .dsp-bubble { max-width: 88%; }
  .dsp-exit span { display: none; }
}
`

    /* ------------------------------------------------------------------ */
    /* Client plugin                                                       */
    /* ------------------------------------------------------------------ */

    return {
      inject: ['slots', 'sessions', 'locale'],
      apply(ctx) {
        ctx.effect(
          () => ctx.locale.register(NS, { zh: ZH, en: EN }),
          'deepseek-pure-chat: dictionaries',
        )
        const t = ctx.locale.bind(NS)
        ctx.slots.inject('shell.overlay', () => ctx.slots.register({
          name: 'shell.overlay',
          id: 'deepseek-pure-chat',
          order: 50,
        }, (props) => h(PureChatRoot, {
          ctx,
          t,
          useSessionStatus: props !== null && props !== undefined ? props.useSessionStatus : undefined,
        })))
      },
    }
  },
})
