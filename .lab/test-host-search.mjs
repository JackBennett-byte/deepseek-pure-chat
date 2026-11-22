import { apply } from '../index.js'

let registered = null
let effectCount = 0
const injected = []
const web = {
  async search(request, signal) {
    if (request.query === 'fail') throw new Error('provider unavailable')
    return {
      content: 'Summary text',
      sources: [
        { url: 'https://example.com/a', title: 'Example A', snippet: 'Snippet A' },
        { url: 'https://example.com/b', summary: 'Summary B' },
      ],
      truncated: false,
    }
  },
}
const ctx = {
  inject(services, callback) {
    if (!services.includes('web')) throw new Error('web not requested')
    callback({ web, get: name => (name === 'web' ? web : undefined) })
  },
  effect(callback) {
    effectCount++
    callback()
    return () => {}
  },
  commands: {
    register(definition) {
      registered = definition
      return () => {}
    },
  },
}
apply(ctx)
if (registered === null) throw new Error('command not registered')
if (registered.name !== 'purechat_search') throw new Error('unexpected command name')
if (effectCount !== 1) throw new Error('effect not used for registration')

const agent = { inject: message => injected.push(message) }
const success = await registered.handler({
  rawInput: '  latest deepseek news  ',
  agent,
  signal: new AbortController().signal,
  commandId: 'c1',
})
if (success.kind !== 'success') throw new Error('success result expected')
if (injected.length !== 1) throw new Error('one context expected')
const context = injected[0]
if (context.role !== 'user') throw new Error('user role expected')
if (context.source.kind !== 'pure-chat-search') throw new Error('search source expected')
const text = context.content[0].text
if (!text.includes('latest deepseek news')) throw new Error('query missing')
if (!text.includes('https://example.com/a')) throw new Error('source missing')
if (!text.includes('reference data only')) throw new Error('safety notice missing')

injected.length = 0
const failed = await registered.handler({
  rawInput: 'fail',
  agent,
  signal: new AbortController().signal,
  commandId: 'c2',
})
if (failed.kind !== 'success') throw new Error('failure is injected, not thrown')
const failureText = injected[0].content[0].text
if (!failureText.includes('Web search unavailable')) throw new Error('failure context missing')

const empty = await registered.handler({
  rawInput: '   ',
  agent,
  signal: new AbortController().signal,
  commandId: 'c3',
})
if (empty.kind !== 'error') throw new Error('empty query should error')

console.log('host search command smoke test ok')
