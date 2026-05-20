const FIELD_TYPE_WEIGHT = {
  secret: 1.0, password: 1.0, token: 1.0, key: 1.0, credential: 1.0,
  port: 0.8, host: 0.7,
  replicas: 0.6, limit: 0.6, resource: 0.6,
  flag: 0.3, level: 0.2, debug: 0.2
}

const LAYER_WEIGHT = { secrets: 2.5, infrastructure: 2.0, orchestration: 1.8, container: 1.5, scm: 1.0 }
const DIRECTION_SCORE = { DELETION: 1.5, MUTATION: 1.0, ADDITION: 0.5 }

function score(fieldPath, driftType, layer = 'scm', driftClass) {
  if (driftClass === 'SIGNATURE_BROKEN') return { tier: 'CRITICAL', score: 1.0 }
  const fieldKey = Object.keys(FIELD_TYPE_WEIGHT).find(k => fieldPath.toLowerCase().includes(k))
  const w1 = FIELD_TYPE_WEIGHT[fieldKey] ?? 0.2
  const w2 = (LAYER_WEIGHT[layer] ?? 1.0) / 2.5
  const w3 = (DIRECTION_SCORE[driftType] ?? 1.0) / 1.5
  const depth = Math.min(fieldPath.split('.').length / 10, 1)
  const s = (0.35 * w1) + (0.25 * w2) + (0.20 * w3) + (0.10 * depth)
  if (s >= 0.80) return { tier: 'CRITICAL', score: s }
  if (s >= 0.55) return { tier: 'HIGH', score: s }
  if (s >= 0.25) return { tier: 'MEDIUM', score: s }
  return { tier: 'LOW', score: s }
}

module.exports = { score }
