const mongoose = require('mongoose')

const crSchema = new mongoose.Schema({
  driftEventId: { type: mongoose.Schema.Types.ObjectId, ref: 'DriftEvent' },
  repositoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Repository' },
  state: {
    type: String,
    enum: ['DETECTED', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'RESOLVED'],
    default: 'DETECTED'
  },
  stateHistory: [{
    from: String,
    to: String,
    actor: String,
    note: String,
    timestamp: { type: Date, default: Date.now }
  }],
  submittedBy: String,
  approvedBy: String,
  rejectedBy: String,
  remediationNote: String,
  createdAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('ChangeRequest', crSchema)
