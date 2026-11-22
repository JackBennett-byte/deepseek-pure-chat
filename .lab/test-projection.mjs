import fs from 'node:fs'

const source = fs.readFileSync('D:\\harness\\插件\\client.js', 'utf8')
const start = source.indexOf('    function userContentOf(content) {')
const end = source.indexOf('    /* ------------------------------------------------------------------ */\n    /* Session store')
if (start < 0 || end < 0 || end <= start) throw new Error('projection block not found')
const block = source.slice(start, end)
const WEB_MARKER = '[[dsh-pure-chat-web-search]]'
// eslint-disable-next-line no-new-func
const mod = new Function('WEB_MARKER', block + '\nreturn { buildMessages, userContentOf };')(WEB_MARKER)
const { buildMessages, userContentOf } = mod

const user = (seq, text, source, surfaceOp = 'append') => ({
  type: 'event',
  event: {
    type: 'user/message',
    seq,
    time: 1000 + seq,
    surfaceOp,
    data: { id: 'm' + seq, content: [{ type: 'text', text }], source: source ?? { kind: 'user' } },
  },
})
const userWithImages = (seq, text, attachments) => ({
  type: 'event',
  event: {
    type: 'user/message',
    seq,
    time: 1000 + seq,
    surfaceOp: 'append',
    data: {
      id: 'm' + seq,
      content: [
        { type: 'text', text },
        ...attachments.map(attachment => ({ type: 'image', attachment })),
      ],
      source: { kind: 'user' },
    },
  },
})
const chunk = (text, type = 'text-delta', index = 0) => ({
  type: 'transient',
  event: {
    type: 'assistant/live-chunk',
    seq: 10.5,
    time: 2000,
    data: { attemptId: 'a1', turn: 1, step: 1, chunk: { type, index, text } },
  },
})
const final = (seq, blocks) => ({
  type: 'event',
  event: {
    type: 'assistant/message',
    seq,
    time: 3000 + seq,
    surfaceOp: 'append',
    data: { turn: 1, step: 1, message: { id: 'am' + seq, content: blocks } },
  },
})

const entries = [
  user(1, '你好'),
  user(2, 'injected', { kind: 'agent-instructions' }),
  user(3, 'replaced', { kind: 'user' }, { op: 'replace', startSeq: 1, endSeq: 1 }),
  chunk('答', 'text-delta', 1),
  chunk('思考', 'reasoning-delta', 0),
  chunk('你好！', 'text-delta', 1),
  final(4, [
    { type: 'text', text: '你好！' },
    { type: 'reasoning', text: '思考' },
    { type: 'tool-call', id: 't1', name: 'read', arguments: '{}' },
  ]),
]
const messages = buildMessages(entries)
const assert = (name, condition) => {
  if (!condition) throw new Error('FAILED: ' + name)
  console.log('ok: ' + name)
}
assert('only the real user prompt survives', messages.filter(m => m.role === 'user').length === 1)
assert('user text', messages[0].text === '你好')
assert('assistant settled text', messages[1].text === '你好！')
assert('assistant reasoning kept', messages[1].reasoning === '思考')
assert('no web badge by default', messages[0].webSearch === false)
assert('no images by default', messages[0].images.length === 0)

const userBlocks = (seq, blocks) => ({
  type: 'event',
  event: {
    type: 'user/message',
    seq,
    time: 1000 + seq,
    surfaceOp: 'append',
    data: { id: 'm' + seq, content: blocks, source: { kind: 'user' } },
  },
})

// Hidden fallback directive is stripped and marks the message as searched.
const directive = buildMessages([
  userBlocks(5, [
    { type: 'text', text: WEB_MARKER + 'search first\n\n' },
    { type: 'text', text: 'real question' },
  ]),
])
assert('directive stripped', directive[0].text === 'real question')
assert('directive marks web search', directive[0].webSearch === true)

// Host-injected search context applies to the next human prompt.
const searchContext = {
  type: 'event',
  event: {
    type: 'user/message',
    seq: 6,
    time: 1100,
    surfaceOp: 'append',
    data: { id: 'm6', content: [{ type: 'text', text: 'search results' }], source: { kind: 'pure-chat-search' } },
  },
}
const searched = buildMessages([searchContext, user(7, 'question')])
assert('search context hidden', searched.length === 1)
assert('search context marks next prompt', searched[0].webSearch === true)

// Durable images are collected on the user row.
const imageRef = { attachmentId: 'att-1', mediaType: 'image/png', bytes: 10, width: 1, height: 1 }
const withImage = buildMessages([userWithImages(8, '', [imageRef])])
assert('image-only message survives', withImage.length === 1)
assert('durable image collected', withImage[0].images.length === 1 && withImage[0].images[0].attachmentId === 'att-1')

// Multi-block streaming text stays ordered.
const multi = buildMessages([user(9, 'q'), chunk('A', 'text-delta', 1), chunk('B', 'text-delta', 2)])
assert('multi-block text order', multi[1].text === 'AB')

// Interruption notice.
const aborted = buildMessages([
  { type: 'event', event: { type: 'turn/start', seq: 20, time: 5000, data: { turn: 1 } } },
  user(21, 'q'),
  { type: 'event', event: { type: 'turn/end', seq: 22, time: 5100, data: { turn: 1, reason: { kind: 'aborted', reason: { kind: 'user' } } } } },
])
assert('aborted notice', aborted[1].role === 'notice' && aborted[1].textKey === 'stopped')

console.log('all projection assertions passed')
