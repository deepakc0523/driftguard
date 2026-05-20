const yaml = require('js-yaml')
const { sha256 } = require('js-sha256')

function normalize(content, filename) {
  let parsed
  try {
    if (filename.endsWith('.yaml') || filename.endsWith('.yml'))
      parsed = yaml.load(content)
    else if (filename.endsWith('.json'))
      parsed = JSON.parse(content)
    else if (filename.includes('.env') || filename === '.env')
      parsed = parseEnv(content)
    else if (filename.endsWith('Dockerfile') || filename === 'Dockerfile')
      parsed = parseDockerfile(content)
    else return {}
  } catch { return {} }
  return flatten(parsed)
}

function flatten(obj, prefix = '') {
  if (!obj || typeof obj !== 'object') return {}
  return Object.entries(obj).reduce((acc, [k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k
    if (v !== null && typeof v === 'object' && !Array.isArray(v))
      Object.assign(acc, flatten(v, path))
    else
      acc[path] = String(v ?? '__null__')
    return acc
  }, {})
}

function parseEnv(content) {
  return Object.fromEntries(
    content.split('\n')
      .filter(l => l.includes('=') && !l.startsWith('#') && l.trim())
      .map(l => {
        const idx = l.indexOf('=')
        return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()]
      })
  )
}

function parseDockerfile(content) {
  const result = {}
  content.split('\n').forEach(line => {
    const parts = line.trim().split(/\s+/)
    const cmd = parts[0]
    if (['FROM', 'ENV', 'EXPOSE', 'WORKDIR', 'CMD', 'ENTRYPOINT'].includes(cmd))
      result[cmd] = parts.slice(1).join(' ')
  })
  return result
}

function checksumOf(normalized) {
  return sha256(JSON.stringify(Object.entries(normalized).sort()))
}

module.exports = { normalize, checksumOf }
