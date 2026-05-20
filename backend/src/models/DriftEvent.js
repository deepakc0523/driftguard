const mongoose = require('mongoose')

const driftSchema = new mongoose.Schema({
  repositoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Repository' },
  filePath: String,
  fieldPath: String,
  driftType: { type: String, enum: ['MUTATION', 'ADDITION', 'DELETION'] },
  driftClass: { type: String, enum: ['AUTHORIZED', 'UNAUTHORIZED', 'SIGNATURE_BROKEN'] },
  expectedValue: String,
  actualValue: String,
  expectedHash: String,
  actualHash: String,
  pcidRef: { type: mongoose.Schema.Types.ObjectId, ref: 'PcidRecord', default: null },
  severityTier: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
  severityScore: Number,
  layer: String,
  detectedAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('DriftEvent', driftSchema)
