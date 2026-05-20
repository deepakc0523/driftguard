const express = require('express')
const router = express.Router()
const Repository = require('../models/Repository')
const DriftEvent = require('../models/DriftEvent')
const ChangeRequest = require('../models/ChangeRequest')
const PcidRecord = require('../models/PcidRecord')
const { fetchRepoFiles, getLatestCommitSHA } = require('../services/github')
const { normalize, checksumOf } = require('../services/cnp')
const { classifyField } = require('../services/dide')
const { findAuthorizationGaps } = require('../services/clacb')
const { score } = require('../services/cscs')
const { appendAuditEntry } = require('../services/audit')
const { buildAttestations, signAttestation, createPcidRecord } = require('../services/pcid')
const { sha3_256 } = require('js-sha3')
const authMiddleware = require('../middleware/auth')
const User = require('../models/User')
const { decrypt } = require('../services/crypto')

async function getRepoToken(userId) {
  const user = await User.findById(userId).select('githubAccessToken')
  if (!user || !user.githubAccessToken) throw new Error('GitHub not connected. Please connect GitHub via OAuth first.')
  return decrypt(user.githubAccessToken)
}

// GET /api/repos — list all repos
router.get('/', authMiddleware(), async (req, res) => {
  try {
    const repos = await Repository.find({ connectedBy: req.user.userId })
    res.json(repos)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/repos — add a new repo
router.post('/', authMiddleware(), async (req, res) => {
  try {
    const { owner, repoName, branch } = req.body
    if (!owner || !repoName)
      return res.status(400).json({ error: 'owner and repoName are required' })
    const repo = await Repository.create({
      owner, repoName,
      branch: branch || 'main',
      connectedBy: req.user.userId
    })
    await appendAuditEntry('REPO_CONNECTED', { owner, repoName }, req.user.userId)
    res.status(201).json(repo)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/repos/:id
router.delete('/:id', authMiddleware(), async (req, res) => {
  try {
    await Repository.findByIdAndDelete(req.params.id)
    res.json({ message: 'Repository removed' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/repos/:id/baseline — capture baseline snapshot
router.post('/:id/baseline', authMiddleware(), async (req, res) => {
  let repo
  try {
    repo = await Repository.findById(req.params.id)
    if (!repo) return res.status(404).json({ error: 'Repo not found' })
    
    console.log(`[Baseline] Fetching for ${repo.owner}/${repo.repoName} (${repo.branch})`)
    const githubToken = await getRepoToken(req.user.userId)
    console.log(`[Baseline] Token decrypted successfully`)
    
    const rawFiles = await fetchRepoFiles(repo.owner, repo.repoName, repo.branch, githubToken)
    console.log(`[Baseline] Fetched ${Object.keys(rawFiles).length} files`)
    
    const snapshot = {}
    for (const [path, content] of Object.entries(rawFiles)) {
      const normalized = normalize(content, path)
      for (const [field, val] of Object.entries(normalized))
        snapshot[`${path}::${field}`] = val
    }
    console.log(`[Baseline] Snapshot created with ${Object.keys(snapshot).length} entries`)
    
    repo.baselineSnapshot = snapshot
    repo.baselineChecksum = checksumOf(snapshot)
    repo.baselineCapturedAt = new Date()
    
    try {
      repo.lastScannedCommitSHA = await getLatestCommitSHA(repo.owner, repo.repoName, repo.branch, githubToken)
      console.log(`[Baseline] Latest SHA: ${repo.lastScannedCommitSHA}`)
    } catch (e) {
      console.warn('Failed to get latest commit SHA, using branch name as placeholder')
      repo.lastScannedCommitSHA = repo.branch
    }

    // Fix 2: Auto-build dependency graph
    const dependencyGraph = {}
    const upstreamFiles = []
    const downstreamFiles = []

    for (const [path, content] of Object.entries(rawFiles)) {
      const isUpstream = /DB_|SECRET|PASSWORD|API_KEY|TOKEN/i.test(content)
      const isDownstream = path.includes('k8s/') || path.includes('deploy') || 
                           path.endsWith('.yaml') || path.endsWith('.yml') ||
                           path === 'Dockerfile' || path.endsWith('.tf')

      if (isUpstream) upstreamFiles.push(path)
      if (isDownstream) downstreamFiles.push(path)
    }

    // Every upstream file is a dependency for every downstream file in this simple auto-builder
    for (const up of upstreamFiles) {
      const deps = downstreamFiles.filter(down => down !== up)
      if (deps.length > 0) dependencyGraph[up] = deps
    }

    repo.dependencyGraph = dependencyGraph
    await repo.save()
    console.log(`[Baseline] Repository saved successfully`)
    
    await appendAuditEntry('BASELINE_CAPTURED', { repoId: repo._id, fields: Object.keys(snapshot).length, dependencies: upstreamFiles.length }, req.user.userId)
    res.json({ message: 'Baseline captured', fields: Object.keys(snapshot).length, checksum: repo.baselineChecksum, dependencies: upstreamFiles.length })
  } catch (err) {
    console.error('Baseline Error:', err)
    if (err.status === 404 && repo) {
      return res.status(404).json({ error: `Repository or branch not found on GitHub. Please check if '${repo.owner}/${repo.repoName}' with branch '${repo.branch}' is correct.` })
    }
    res.status(500).json({ error: err.message })
  }
})

// POST /api/repos/:id/pcid — create a PCID record (simulate authorized commit)
router.post('/:id/pcid', authMiddleware(), async (req, res) => {
  try {
    const repo = await Repository.findById(req.params.id)
    if (!repo) return res.status(404).json({ error: 'Repo not found' })
    const { commitSHA, fieldChanges, layer } = req.body
    const privateKeyPem = process.env.PRIVATE_KEY_PEM
    const publicKeyPem = process.env.PUBLIC_KEY_PEM
    if (!privateKeyPem || privateKeyPem === 'REPLACE_WITH_GENERATED_PRIVATE_KEY')
      return res.status(500).json({ error: 'PRIVATE_KEY_PEM not configured in .env' })
    const attestations = buildAttestations(fieldChanges, repo._id.toString(), layer || 'scm')
    const signature = signAttestation(attestations, privateKeyPem)
    const record = createPcidRecord(
      repo._id, commitSHA || 'manual', attestations, signature, publicKeyPem,
      req.user.email, req.user.role
    )
    const saved = await PcidRecord.create(record)
    await appendAuditEntry('PCID_CREATED', { pcidId: record.pcidId, commitSHA }, req.user.userId)
    res.status(201).json(saved)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/repos/:id/scan — run full drift detection pipeline
router.post('/:id/scan', authMiddleware(), async (req, res) => {
  try {
    const repo = await Repository.findById(req.params.id)
    if (!repo) return res.status(404).json({ error: 'Repo not found' })

    const publicKeyPem = process.env.PUBLIC_KEY_PEM
    if (!publicKeyPem || publicKeyPem === 'REPLACE_WITH_GENERATED_PUBLIC_KEY')
      return res.status(500).json({ error: 'PUBLIC_KEY_PEM not configured in .env' })

    if (!repo.baselineSnapshot || Object.keys(repo.baselineSnapshot).length === 0)
      return res.status(400).json({ error: 'No baseline captured. Run /baseline first.' })

    const githubToken = await getRepoToken(req.user.userId)

    // Stage 2: CNP — fetch + normalize
    const rawFiles = await fetchRepoFiles(repo.owner, repo.repoName, repo.branch, githubToken)
    const currentSnapshot = {}
    for (const [path, content] of Object.entries(rawFiles)) {
      const normalized = normalize(content, path)
      for (const [field, val] of Object.entries(normalized))
        currentSnapshot[`${path}::${field}`] = val
    }

    const baseline = repo.baselineSnapshot || {}
    const driftEvents = []
    const changedFiles = new Set()

    const allKeys = new Set([...Object.keys(baseline), ...Object.keys(currentSnapshot)])
    for (const key of allKeys) {
      const [filePath, fieldPath] = key.split('::')
      const expected = baseline[key]
      const actual = currentSnapshot[key]
      if (expected === actual) continue

      const driftType = !expected ? 'ADDITION' : !actual ? 'DELETION' : 'MUTATION'
      changedFiles.add(filePath)

      // Stage 3: DIDE classify
      const { driftClass, pcidRef, liveHash } = await classifyField(
        repo._id, fieldPath, actual ?? '', publicKeyPem
      )

      // Layer detection
      const layer = filePath.includes('k8s') || filePath.includes('deploy') ? 'orchestration'
        : filePath.includes('terraform') || filePath.endsWith('.tf') ? 'infrastructure'
        : filePath.endsWith('Dockerfile') || filePath === 'Dockerfile' ? 'container'
        : filePath.includes('.env') ? 'secrets' : 'scm'

      // Stage 4: CSCS severity
      const { tier, score: sScore } = score(fieldPath, driftType, layer, driftClass)

      const event = await DriftEvent.create({
        repositoryId: repo._id, filePath, fieldPath,
        driftType, driftClass,
        expectedValue: expected ?? null,
        actualValue: actual ?? null,
        expectedHash: expected ? sha3_256(`${fieldPath}:${expected}@${repo._id}`) : null,
        actualHash: liveHash,
        pcidRef: pcidRef ?? undefined,
        severityTier: tier,
        severityScore: parseFloat(sScore.toFixed(4)),
        layer
      })

      await ChangeRequest.create({
        driftEventId: event._id,
        repositoryId: repo._id,
        state: 'DETECTED',
        stateHistory: [{ from: null, to: 'DETECTED', actor: 'system', timestamp: new Date() }]
      })

      await appendAuditEntry('DRIFT_DETECTED', {
        driftEventId: event._id, fieldPath, driftClass, tier
      }, 'system')

      driftEvents.push(event)
    }

    // Fix 3: CLACB gap detection
    const dependencyGraph = repo.dependencyGraph || {}
    const pcidChainHashes = {} 
    const gaps = findAuthorizationGaps([...changedFiles], dependencyGraph, pcidChainHashes)

    for (const gap of gaps) {
      const gapEvent = await DriftEvent.create({
        repositoryId: repo._id,
        filePath: gap.affectedConsumer,
        fieldPath: 'cross-layer-authorization-gap',
        driftType: 'MUTATION',
        driftClass: 'UNAUTHORIZED',
        expectedValue: 'Authorized chain hash present',
        actualValue: 'No chain hash — upstream changed without downstream update',
        severityTier: 'HIGH',
        severityScore: 0.75,
        layer: 'clacb',
        detectedAt: new Date()
      })

      await ChangeRequest.create({
        driftEventId: gapEvent._id,
        repositoryId: repo._id,
        state: 'DETECTED',
        stateHistory: [{ from: null, to: 'DETECTED', actor: 'system', timestamp: new Date() }]
      })

      driftEvents.push(gapEvent)
    }

    // Update last scanned commit
    try {
      repo.lastScannedCommitSHA = await getLatestCommitSHA(repo.owner, repo.repoName, repo.branch, githubToken)
    } catch {}
    await repo.save()

    await appendAuditEntry('SCAN_COMPLETE', {
      repoId: repo._id, driftCount: driftEvents.length, gaps: gaps.length
    }, req.user.userId)

    res.json({ driftEvents: driftEvents.length, gaps: gaps.length, events: driftEvents })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/repos/:id/install-hook — download pre-commit hook script
router.get('/:id/install-hook', authMiddleware(), async (req, res) => {
  try {
    const repo = await Repository.findById(req.params.id)
    if (!repo) return res.status(404).json({ error: 'Repo not found' })

    const jwtToken = req.token // Use token from middleware

    const script = `#!/bin/bash
REPO_ID="${repo._id}"
API_URL="http://localhost:5001/api/pcid/sign"
JWT_TOKEN="${jwtToken}"
COMMIT_SHA=$(git rev-parse HEAD 2>/dev/null || echo "pre-commit")
FILES="{}"

for file in $(git diff --cached --name-only); do
  if [[ $file == *.yaml ]] || [[ $file == *.yml ]] || [[ $file == *.json ]] || [[ $file == *.env* ]] || [[ $file == *Dockerfile* ]] || [[ $file == *.tf ]]; then
    content=$(git show ":$file" 2>/dev/null)
    # Using python to securely JSON-encode the content safely
    FILES=$(echo $FILES | node -e "
      const d=require('fs').readFileSync(0,'utf8');
      const f=JSON.parse(d||'{}');
      const content = require('fs').readFileSync(1,'utf8');
      f['$file'] = content;
      process.stdout.write(JSON.stringify(f));
    " 0<<<"$FILES" 1<<<"$content")
  fi
done

if [ "$FILES" != "{}" ]; then
  curl -s -X POST $API_URL \\
    -H "Content-Type: application/json" \\
    -H "Authorization: Bearer $JWT_TOKEN" \\
    -d "{\\"repoId\\":\\"$REPO_ID\\",\\"commitSHA\\":\\"$COMMIT_SHA\\",\\"files\\":$FILES}"
  echo "PCID attestation created"
fi
`
    res.setHeader('Content-Type', 'application/x-sh')
    res.setHeader('Content-Disposition', `attachment; filename="pre-commit"`)
    res.send(script)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
