const { sha3_256 } = require('js-sha3')
const forge = require('node-forge')
const { v4: uuidv4 } = require('uuid')

function generateKeyPair() {
  const keypair = forge.pki.rsa.generateKeyPair({ bits: 2048 })
  return {
    privateKeyPem: forge.pki.privateKeyToPem(keypair.privateKey),
    publicKeyPem: forge.pki.publicKeyToPem(keypair.publicKey)
  }
}

function hashField(fieldPath, value, repoId) {
  return sha3_256(`${fieldPath}:${value}@${repoId}`)
}

function buildAttestations(normalizedDiff, repoId, layer = 'scm') {
  return Object.entries(normalizedDiff).map(([fieldPath, value]) => ({
    fieldPath,
    expectedValueHash: hashField(fieldPath, value, repoId),
    layer
  }))
}

function signAttestation(fieldAttestations, privateKeyPem) {
  const md = forge.md.sha256.create()
  md.update(JSON.stringify(fieldAttestations), 'utf8')
  const privateKey = forge.pki.privateKeyFromPem(privateKeyPem.replace(/\\n/g, '\n'))
  return forge.util.encode64(privateKey.sign(md))
}

function verifySignature(fieldAttestations, signature, publicKeyPem) {
  try {
    const md = forge.md.sha256.create()
    md.update(JSON.stringify(fieldAttestations), 'utf8')
    const publicKey = forge.pki.publicKeyFromPem(publicKeyPem.replace(/\\n/g, '\n'))
    return publicKey.verify(md.digest().bytes(), forge.util.decode64(signature))
  } catch { return false }
}

function createPcidRecord(repoId, commitSHA, fieldAttestations, signature, publicKeyPem, signerIdentity, signingRole) {
  const unescapedPublic = publicKeyPem.replace(/\\n/g, '\n')
  return {
    pcidId: uuidv4(),
    repositoryId: repoId,
    commitSHA,
    fieldAttestations,
    signerIdentity,
    signingRole,
    signature,
    publicKeyFingerprint: sha3_256(unescapedPublic),
    timestamp: new Date()
  }
}

module.exports = { generateKeyPair, hashField, buildAttestations, signAttestation, verifySignature, createPcidRecord }
