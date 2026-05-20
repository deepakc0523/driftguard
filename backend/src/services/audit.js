const { sha3_256 } = require('js-sha3')
const AuditEntry = require('../models/AuditEntry')

async function appendAuditEntry(eventType, payload, actorId) {
  const last = await AuditEntry.findOne().sort({ timestamp: -1 })
  const prevHash = last?.hash ?? 'GENESIS'
  const entry = { eventType, payload, actorId, prevHash, timestamp: new Date() }
  entry.hash = sha3_256(JSON.stringify(entry))
  return await AuditEntry.create(entry)
}

async function verifyLedger() {
  const entries = await AuditEntry.find().sort({ timestamp: 1 })
  for (let i = 1; i < entries.length; i++) {
    if (entries[i].prevHash !== entries[i - 1].hash) return false
  }
  return true
}

module.exports = { appendAuditEntry, verifyLedger }
