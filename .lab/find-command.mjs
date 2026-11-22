import fs from 'node:fs'
const file = 'C:\\Users\\BenJack\\AppData\\Local\\Programs\\DeepSeek Harness\\resources\\app.asar\\dsh\\node_modules\\@deepseek-ai\\dsh-api-session-controller\\src\\client\\sessions\\session.ts'
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/)
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('command(') || lines[i].includes('matched')) {
    console.log((i + 1) + ': ' + lines[i].trim())
  }
}
