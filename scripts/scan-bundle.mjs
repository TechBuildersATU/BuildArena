// Fails if the built bundle contains the NVIDIA key prefix or the key's variable name
// (document §12.8 "Secret management"). Usage: node scripts/scan-bundle.mjs [dir]
import { readdirSync, readFileSync } from 'node:fs'
import { extname, join } from 'node:path'

const FORBIDDEN = ['nvapi-', 'NVIDIA_API_KEY']
const TEXT_EXTENSIONS = new Set([
  '.js',
  '.mjs',
  '.css',
  '.html',
  '.json',
  '.webmanifest',
  '.map',
  '.txt',
  '.svg',
])
const root = process.argv[2] ?? 'dist'

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(path)
    else if (TEXT_EXTENSIONS.has(extname(entry.name))) yield path
  }
}

let scanned = 0
const hits = []
for (const file of walk(root)) {
  scanned++
  const content = readFileSync(file, 'utf8')
  for (const needle of FORBIDDEN) if (content.includes(needle)) hits.push(`${file}: ${needle}`)
}

if (hits.length > 0) {
  console.error(`Secret scan FAILED — forbidden strings in the bundle:\n${hits.join('\n')}`)
  process.exit(1)
}
console.log(`Secret scan passed: ${scanned} files in ${root}/, no forbidden strings.`)
