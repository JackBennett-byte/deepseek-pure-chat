import fs from 'node:fs'
import path from 'node:path'
const base = 'C:\\Users\\BenJack\\AppData\\Local\\Programs\\DeepSeek Harness\\resources\\app.asar\\dsh\\node_modules\\@deepseek-ai\\dsh-agent\\src'
for (const name of fs.readdirSync(base)) {
  const full = path.join(base, name)
  const stat = fs.statSync(full)
  console.log((stat.isDirectory() ? '[d] ' : stat.size + ' ') + name)
}
