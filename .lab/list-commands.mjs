import fs from 'node:fs'
import path from 'node:path'
const root = 'C:\\Users\\BenJack\\AppData\\Local\\Programs\\DeepSeek Harness\\resources\\app.asar\\dsh\\node_modules\\@deepseek-ai'
for (const pkg of ['dsh-commands', 'dsh-command-compact', 'dsh-web', 'dsh-tool-web']) {
  console.log('== ' + pkg)
  const base = path.join(root, pkg, 'src')
  if (!fs.existsSync(base)) { console.log('  (no src)'); continue }
  const walk = (dir, depth) => {
    if (depth > 2) return
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name)
      const stat = fs.statSync(full)
      if (stat.isDirectory()) walk(full, depth + 1)
      else console.log('  ' + stat.size + ' ' + path.relative(base, full))
    }
  }
  walk(base, 0)
}
