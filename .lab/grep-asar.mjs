import fs from 'node:fs'
import path from 'node:path'

const dir = process.argv[2]
const terms = process.argv.slice(3)
const walk = (d) => {
  for (const name of fs.readdirSync(d)) {
    const full = path.join(d, name)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) walk(full)
    else if (/\.(ts|tsx)$/.test(name) && stat.size < 400 * 1024) {
      const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/)
      for (let i = 0; i < lines.length; i++) {
        if (terms.some(term => lines[i].includes(term))) {
          console.log(path.relative(dir, full) + ':' + (i + 1) + ': ' + lines[i].trim().slice(0, 220))
        }
      }
    }
  }
}
walk(dir)
