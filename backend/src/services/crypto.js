const crypto = require('crypto')

const ALGO = 'aes-256-gcm'
const KEY_HEX = process.env.ENCRYPTION_KEY // 64-char hex = 32 bytes

function getKey() {
  if (!KEY_HEX || KEY_HEX.length < 64)
    throw new Error('ENCRYPTION_KEY must be a 64-character hex string in .env')
  return Buffer.from(KEY_HEX, 'hex')
}

/**
 * Encrypt a plaintext string → "iv:authTag:ciphertext" (all hex)
 */
function encrypt(plaintext) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
}

/**
 * Decrypt an "iv:authTag:ciphertext" string → plaintext
 */
function decrypt(encoded) {
  const [ivHex, authTagHex, cipherHex] = encoded.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const ciphertext = Buffer.from(cipherHex, 'hex')
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}

module.exports = { encrypt, decrypt }
