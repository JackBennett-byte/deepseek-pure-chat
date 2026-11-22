import fs from 'node:fs'

const source = fs.readFileSync('D:\\harness\\插件\\client.js', 'utf8')
let captured = null
const window = { __ModuleLoader__: { load(entry) { captured = entry } } }
const React = {
  createElement(...args) { return args },
  memo(fn) { return fn },
  Component: class Component { constructor(props) { this.props = props } },
  Fragment: 'fragment',
  useState() { return [false, () => {}] },
  useRef() { return { current: null } },
  useEffect() {},
  useCallback(fn) { return fn },
  useSyncExternalStore(subscribe, get) { return get() },
  useMemo(fn) { return fn() },
}
const require = (name) => {
  if (name === 'react') return React
  throw new Error('unexpected require: ' + name)
}
const fn = new Function('window', 'require', source)
fn(window, require)
if (captured === null) throw new Error('module did not register')
const mod = captured.factory(require)
let registered = null
const ctx = {
  effect(callback) { return callback() },
  locale: {
    register() { return () => {} },
    bind() { return (key) => key },
    getSnapshot() { return { active: 'zh' } },
    subscribe() { return () => {} },
  },
  slots: {
    inject(owner, callback) { return callback() },
    register(options, component) { registered = { options, component }; return () => {} },
  },
  sessions: {},
  get() { return undefined },
}
mod.apply(ctx)
if (registered === null) throw new Error('shell.overlay registration missing')
console.log('module smoke test ok:', registered.options)
