const mongoose = require('mongoose')

const pcidSchema = new mongoose.Schema({
  pcidId: { type: String, required: true, unique: true },
  repositoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Repository' },
  commitSHA: String,
  fieldAttestations: [{
    fieldPath: String,
    expectedValueHash: String,
    layer: String
  }],
  signerIdentity: String,
  signingRole: String,
  signature: String,
  publicKeyFingerprint: String,
  clacbChainHash: String,
  timestamp: { type: Date, default: Date.now }
})

module.exports = mongoose.model('PcidRecord', pcidSchema)
