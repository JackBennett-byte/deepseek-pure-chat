import fs from 'node:fs'
import path from 'node:path'
const root = 'C:\\Users\\BenJack\\AppData\\Local\\Programs\\DeepSeek Harness\\resources\\app.asar\\dsh\\node_modules\\@deepseek-ai\\dsh-agent\\src'
const walk = (d) => {
  for (const name of fs.readdirSync(d)) {
    const full = path.join(d, name)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) walk(full)
    else if (/\.ts$/.test(name) && stat.size < 500000) {
      const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/)
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('inject(message') || lines[i].includes('inject(') && lines[i].includes('UserMessage')) {
          console.log(path.relative(root, full) + ':' + (i + 1) + ': ' + lines[i].trim().slice(0, 160))
        }
      }
    }
  }
}
walk(root)
