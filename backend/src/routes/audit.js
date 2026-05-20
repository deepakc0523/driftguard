const express = require('express')
const router = express.Router()
const AuditEntry = require('../models/AuditEntry')
const { verifyLedger } = require('../services/audit')
const authMiddleware = require('../middleware/auth')

// GET /api/audit — list audit entries
router.get('/', authMiddleware(), async (req, res) => {
  try {
    const entries = await AuditEntry.find()
      .sort({ timestamp: -1 })
      .limit(parseInt(req.query.limit) || 200)
    res.json(entries)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/audit/verify — verify ledger integrity
router.get('/verify', authMiddleware(['admin']), async (req, res) => {
  try {
    const valid = await verifyLedger()
    res.json({ valid, message: valid ? 'Ledger integrity verified ✓' : 'LEDGER TAMPERED — chain hash mismatch!' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
