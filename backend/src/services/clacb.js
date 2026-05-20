const { sha3_256 } = require('js-sha3')

function computeChainHash(fieldHash, roleProof, upstreamChainHashes = []) {
  const sorted = [...upstreamChainHashes].sort()
  return sha3_256(fieldHash + roleProof + sorted.join(''))
}

function findAuthorizationGaps(changedFiles, dependencyGraph = {}, pcidChainHashes = {}) {
  const gaps = []
  for (const changed of changedFiles) {
    const dependents = dependencyGraph[changed] || []
    for (const dep of dependents) {
      if (!pcidChainHashes[dep]) {
        gaps.push({
          changedFile: changed,
          affectedConsumer: dep,
          reason: `Upstream ${changed} changed but downstream ${dep} has no updated authorization`
        })
      }
    }
  }
  return gaps
}

module.exports = { computeChainHash, findAuthorizationGaps }
