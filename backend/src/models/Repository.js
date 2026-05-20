const mongoose = require('mongoose')

const repoSchema = new mongoose.Schema({
  owner: String,
  repoName: String,
  branch: { type: String, default: 'main' },
  connectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  baselineSnapshot: { type: mongoose.Schema.Types.Mixed, default: {} },
  baselineChecksum: String,
  lastScannedCommitSHA: String,
  dependencyGraph: { type: mongoose.Schema.Types.Mixed, default: {} },
  baselineCapturedAt: Date,
  createdAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('Repository', repoSchema)
