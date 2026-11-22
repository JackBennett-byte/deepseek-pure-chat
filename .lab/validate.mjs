import fs from 'node:fs'
import path from 'node:path'

const root = 'D:\\harness\\插件'
for (const rel of ['package.json', 'locale\\zh.json', 'locale\\en.json']) {
  JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'))
  console.log('json ok: ' + rel)
}
for (const rel of ['icon.svg', 'docs\\preview.svg']) {
  const text = fs.readFileSync(path.join(root, rel), 'utf8')
  if (!text.trimStart().startsWith('<svg') || !text.trimEnd().endsWith('</svg>')) throw new Error('bad svg: ' + rel)
  console.log('svg ok: ' + rel + ' (' + Buffer.byteLength(text, 'utf8') + ' bytes)')
}
for (const rel of ['docs\\DETAIL.md', 'docs\\DETAIL.zh.md']) {
  const text = fs.readFileSync(path.join(root, rel), 'utf8')
  const lines = text.trim().split(/\r?\n/)
  if (lines.length !== 1 || !/^!\[[^\]]+\]\([^)]+\.svg\)$/.test(lines[0])) throw new Error('detail not one image line: ' + rel)
  console.log('detail ok: ' + rel)
}
console.log('version: ' + JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version)
