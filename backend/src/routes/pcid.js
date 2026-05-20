const express = require('express')
const router = express.Router()
const PcidRecord = require('../models/PcidRecord')
const { normalize } = require('../services/cnp')
const { hashField, signAttestation, createPcidRecord } = require('../services/pcid')
const authMiddleware = require('../middleware/auth')
const { appendAuditEntry } = require('../services/audit')

// POST /api/pcid/sign
router.post('/sign', authMiddleware(), async (req, res) => {
  try {
    const { repoId, commitSHA, files } = req.body
    if (!repoId || !files) return res.status(400).json({ error: 'repoId and files are required' })

    const fieldAttestations = []
    for (const [filePath, content] of Object.entries(files)) {
      const normalized = normalize(content, filePath)
      for (const [fieldPath, value] of Object.entries(normalized)) {
        fieldAttestations.push({
          fieldPath,
          expectedValueHash: hashField(fieldPath, value, repoId),
          layer: filePath.includes('k8s') || filePath.includes('deploy') ? 'orchestration'
            : filePath.includes('terraform') || filePath.endsWith('.tf') ? 'infrastructure'
            : filePath === 'Dockerfile' ? 'container'
            : filePath.includes('.env') ? 'secrets' : 'scm'
        })
      }
    }

    const privateKeyPem = process.env.PRIVATE_KEY_PEM
    const publicKeyPem = process.env.PUBLIC_KEY_PEM
    if (!privateKeyPem || privateKeyPem === 'REPLACE_WITH_GENERATED_PRIVATE_KEY')
      return res.status(500).json({ error: 'PRIVATE_KEY_PEM not configured in .env' })

    const signature = signAttestation(fieldAttestations, privateKeyPem)
    const pcidData = createPcidRecord(
      repoId, commitSHA || 'manual', fieldAttestations, signature, publicKeyPem,
      req.user.email, req.user.role
    )
    const pcid = await PcidRecord.create(pcidData)
    await appendAuditEntry('PCID_CREATED', { pcidId: pcid.pcidId, commitSHA }, req.user.userId)

    res.status(201).json({ pcidId: pcid.pcidId })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/pcid/:repoId — get stats for the PCID registry panel
router.get('/:repoId', authMiddleware(), async (req, res) => {
  try {
    const pcids = await PcidRecord.find({ repositoryId: req.params.repoId }).sort({ timestamp: -1 })
    const { verifySignature } = require('../services/pcid')

    let validFields = 0
    let brokenFields = 0

    pcids.forEach(p => {
      const isValid = verifySignature(p.fieldAttestations, p.signature, p.publicKeyPem)
      if (isValid) validFields += p.fieldAttestations.length
      else brokenFields += p.fieldAttestations.length
    })

    res.json({
      totalRecords: pcids.length,
      validFields,
      brokenFields,
      recent: pcids.slice(0, 5).map(p => ({
        pcidId: p.pcidId,
        signerIdentity: p.signerIdentity,
        fieldCount: p.fieldAttestations.length,
        timestamp: p.timestamp,
        sigValid: verifySignature(p.fieldAttestations, p.signature, p.publicKeyPem)
      }))
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
