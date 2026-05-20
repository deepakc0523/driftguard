const jwt = require('jsonwebtoken')

module.exports = (roles = []) => (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1] || req.query.token
  if (!token) return res.status(401).json({ error: 'No token' })
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    if (roles.length && !roles.includes(decoded.role))
      return res.status(403).json({ error: 'Forbidden' })
    req.user = decoded
    req.token = token
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}
