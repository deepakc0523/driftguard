const { sha3_256 } = require('js-sha3')
const { verifySignature } = require('./pcid')
const PcidRecord = require('../models/PcidRecord')

async function classifyField(repoId, fieldPath, liveValue, publicKeyPem) {
  const liveHash = sha3_256(`${fieldPath}:${liveValue}@${repoId}`)

  const pcid = await PcidRecord.findOne({
    repositoryId: repoId,
    'fieldAttestations.fieldPath': fieldPath
  }).sort({ timestamp: -1 })

  if (!pcid) return { driftClass: 'UNAUTHORIZED', pcidRef: null, liveHash }

  const attestedField = pcid.fieldAttestations.find(f => f.fieldPath === fieldPath)
  const storedHash = attestedField?.expectedValueHash
  const sigValid = verifySignature(pcid.fieldAttestations, pcid.signature, publicKeyPem)

  if (!sigValid) return { driftClass: 'SIGNATURE_BROKEN', pcidRef: pcid._id, liveHash }
  if (storedHash === liveHash) return { driftClass: 'AUTHORIZED', pcidRef: pcid._id, liveHash }
  return { driftClass: 'UNAUTHORIZED', pcidRef: null, liveHash }
}

module.exports = { classifyField }
