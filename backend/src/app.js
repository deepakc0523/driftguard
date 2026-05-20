require('dotenv').config()
const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')

const app = express()

// Middleware
app.use(cors())
app.use(express.json({ limit: '10mb' }))

// Routes
app.use('/api/auth', require('./routes/auth'))
app.use('/api/auth/github', require('./routes/githubOAuth'))
app.use('/api/repos', require('./routes/repos'))
app.use('/api/drift', require('./routes/drift'))
app.use('/api/change-requests', require('./routes/changeRequests'))
app.use('/api/audit', require('./routes/audit'))
app.use('/api/pcid', require('./routes/pcid'))

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'DriftGuard API',
    timestamp: new Date().toISOString()
  })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` })
})

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: err.message || 'Internal Server Error' })
})

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5001

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas')
    app.listen(PORT, () => {
      console.log(`🚀 DriftGuard API running on http://localhost:${PORT}`)
      console.log(`📋 Health check: http://localhost:${PORT}/api/health`)
    })
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message)
    process.exit(1)
  })

module.exports = app
