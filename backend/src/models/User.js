const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'developer', 'viewer'], default: 'developer' },
  publicKeyPem: { type: String },
  // GitHub OAuth — token stored AES-256-GCM encrypted
  githubAccessToken: { type: String, default: null },
  githubLogin: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('User', userSchema)
