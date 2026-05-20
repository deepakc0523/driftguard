const mongoose = require('mongoose')

const auditSchema = new mongoose.Schema({
  eventType: String,
  payload: mongoose.Schema.Types.Mixed,
  actorId: String,
  prevHash: String,
  hash: String,
  timestamp: { type: Date, default: Date.now }
})

module.exports = mongoose.model('AuditEntry', auditSchema)
