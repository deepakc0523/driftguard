const express = require('express')
const router = express.Router()
const DriftEvent = require('../models/DriftEvent')
const authMiddleware = require('../middleware/auth')

// GET /api/drift — list all drift events (optionally filter by repoId)
router.get('/', authMiddleware(), async (req, res) => {
  try {
    const filter = {}
    if (req.query.repoId) filter.repositoryId = req.query.repoId
    if (req.query.driftClass) filter.driftClass = req.query.driftClass
    if (req.query.severityTier) filter.severityTier = req.query.severityTier
    const events = await DriftEvent.find(filter)
      .sort({ detectedAt: -1 })
      .limit(parseInt(req.query.limit) || 100)
      .populate('repositoryId', 'owner repoName')
      .populate('pcidRef', 'pcidId commitSHA')
    res.json(events)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/drift/stats — dashboard metrics
router.get('/stats', authMiddleware(), async (req, res) => {
  try {
    const total = await DriftEvent.countDocuments()
    const signatureBroken = await DriftEvent.countDocuments({ driftClass: 'SIGNATURE_BROKEN' })
    const unauthorized = await DriftEvent.countDocuments({ driftClass: 'UNAUTHORIZED' })
    const authorized = await DriftEvent.countDocuments({ driftClass: 'AUTHORIZED' })
    const critical = await DriftEvent.countDocuments({ severityTier: 'CRITICAL' })
    const high = await DriftEvent.countDocuments({ severityTier: 'HIGH' })
    res.json({ total, signatureBroken, unauthorized, authorized, critical, high })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/drift/:id — single drift event
router.get('/:id', authMiddleware(), async (req, res) => {
  try {
    const event = await DriftEvent.findById(req.params.id)
      .populate('repositoryId', 'owner repoName branch')
      .populate('pcidRef')
    if (!event) return res.status(404).json({ error: 'Drift event not found' })
    res.json(event)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
