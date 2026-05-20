const express = require('express')
const router = express.Router()
const axios = require('axios')
const User = require('../models/User')
const { encrypt } = require('../services/crypto')
const { appendAuditEntry } = require('../services/audit')

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET
const CALLBACK_URL = 'http://localhost:5001/api/auth/github/callback'
const FRONTEND_URL = 'http://localhost:3000'

/**
 * GET /api/auth/github
 * Redirect the browser to GitHub's OAuth authorization page.
 * The frontend sends the logged-in user's JWT via a `state` param
 * so we can associate the token with the right user on callback.
 */
router.get('/', (req, res) => {
  const { state } = req.query // JWT passed from frontend as state
  if (!state) return res.status(400).json({ error: 'Missing state (JWT)' })

  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: CALLBACK_URL,
    scope: 'repo read:org',
    state,
  })
  res.redirect(`https://github.com/login/oauth/authorize?${params}`)
})

/**
 * GET /api/auth/github/callback
 * GitHub redirects here with `code` + `state` (our JWT).
 * Exchange code → access_token, encrypt it, save to User, redirect to frontend.
 */
router.get('/callback', async (req, res) => {
  const { code, state: jwtToken, error } = req.query

  if (error) {
    return res.redirect(`${FRONTEND_URL}/repositories?github_error=${error}`)
  }

  if (!code || !jwtToken) {
    return res.redirect(`${FRONTEND_URL}/repositories?github_error=missing_params`)
  }

  try {
    // 1. Exchange code for access token
    const { data: tokenData } = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: CALLBACK_URL,
      },
      { headers: { Accept: 'application/json' } }
    )

    if (tokenData.error) {
      console.error('GitHub OAuth error:', tokenData.error_description)
      return res.redirect(`${FRONTEND_URL}/repositories?github_error=${tokenData.error}`)
    }

    const accessToken = tokenData.access_token

    // 2. Verify the JWT state to find the user
    const jwt = require('jsonwebtoken')
    let decoded
    try {
      decoded = jwt.verify(jwtToken, process.env.JWT_SECRET)
    } catch {
      return res.redirect(`${FRONTEND_URL}/repositories?github_error=invalid_state`)
    }

    // 3. Get GitHub username to display
    const { data: ghUser } = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `token ${accessToken}`, 'User-Agent': 'DriftGuard' }
    })

    // 4. Encrypt the token and save to user
    const encryptedToken = encrypt(accessToken)
    await User.findByIdAndUpdate(decoded.userId, {
      githubAccessToken: encryptedToken,
      githubLogin: ghUser.login,
    })

    await appendAuditEntry('GITHUB_OAUTH_CONNECTED', { login: ghUser.login }, decoded.userId)

    // 5. Redirect to frontend with success indicator
    res.redirect(`${FRONTEND_URL}/repositories?github_connected=1&github_login=${ghUser.login}`)
  } catch (err) {
    console.error('GitHub OAuth callback error:', err.message)
    res.redirect(`${FRONTEND_URL}/repositories?github_error=server_error`)
  }
})

/**
 * GET /api/auth/github/status
 * Returns the current user's GitHub connection status.
 */
router.get('/status', require('../middleware/auth')(), async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('githubLogin githubAccessToken')
    res.json({
      connected: !!user?.githubAccessToken,
      login: user?.githubLogin || null,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * DELETE /api/auth/github/disconnect
 * Removes the stored GitHub token from the user.
 */
router.delete('/disconnect', require('../middleware/auth')(), async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.userId, {
      $unset: { githubAccessToken: '', githubLogin: '' }
    })
    await appendAuditEntry('GITHUB_OAUTH_DISCONNECTED', {}, req.user.userId)
    res.json({ message: 'GitHub disconnected' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
