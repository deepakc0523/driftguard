const express = require('express')
const router = express.Router()
const ChangeRequest = require('../models/ChangeRequest')
const { appendAuditEntry } = require('../services/audit')
const authMiddleware = require('../middleware/auth')

// GET /api/change-requests — list CRs
router.get('/', authMiddleware(), async (req, res) => {
  try {
    const filter = {}
    if (req.query.state) filter.state = req.query.state
    if (req.query.repoId) filter.repositoryId = req.query.repoId
    const crs = await ChangeRequest.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(req.query.limit) || 100)
      .populate('driftEventId')
      .populate('repositoryId', 'owner repoName')
    res.json(crs)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/change-requests/stats — pending count etc
router.get('/stats', authMiddleware(), async (req, res) => {
  try {
    const pending = await ChangeRequest.countDocuments({ state: { $in: ['DETECTED', 'SUBMITTED', 'UNDER_REVIEW'] } })
    const approved = await ChangeRequest.countDocuments({ state: 'APPROVED' })
    const rejected = await ChangeRequest.countDocuments({ state: 'REJECTED' })
    const resolved = await ChangeRequest.countDocuments({ state: 'RESOLVED' })
    res.json({ pending, approved, rejected, resolved })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/change-requests/:id
router.get('/:id', authMiddleware(), async (req, res) => {
  try {
    const cr = await ChangeRequest.findById(req.params.id)
      .populate('driftEventId')
      .populate('repositoryId', 'owner repoName')
    if (!cr) return res.status(404).json({ error: 'Change request not found' })
    res.json(cr)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/change-requests/:id/transition — advance state
router.patch('/:id/transition', authMiddleware(), async (req, res) => {
  try {
    const { to, note } = req.body
    const VALID_TRANSITIONS = {
      DETECTED: ['SUBMITTED'],
      SUBMITTED: ['UNDER_REVIEW'],
      UNDER_REVIEW: ['APPROVED', 'REJECTED'],
      APPROVED: ['RESOLVED'],
      REJECTED: ['SUBMITTED']
    }
    const cr = await ChangeRequest.findById(req.params.id)
    if (!cr) return res.status(404).json({ error: 'Change request not found' })
    const allowed = VALID_TRANSITIONS[cr.state] || []
    if (!allowed.includes(to))
      return res.status(400).json({ error: `Cannot transition from ${cr.state} to ${to}` })
    const from = cr.state
    cr.state = to
    cr.stateHistory.push({ from, to, actor: req.user.email, note: note || '', timestamp: new Date() })
    if (to === 'APPROVED') cr.approvedBy = req.user.email
    if (to === 'REJECTED') cr.rejectedBy = req.user.email
    if (note) cr.remediationNote = note
    await cr.save()
    await appendAuditEntry('CR_TRANSITION', { crId: cr._id, from, to, note }, req.user.userId)
    res.json(cr)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
