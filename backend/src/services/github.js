const { Octokit } = require('@octokit/rest')

const CONFIG_EXTENSIONS = ['.yaml', '.yml', '.json', '.env', '.tf']
const CONFIG_NAMES = ['Dockerfile', '.env']

function isConfigFile(path) {
  return CONFIG_EXTENSIONS.some(ext => path.endsWith(ext)) ||
    CONFIG_NAMES.some(name => path.endsWith(name))
}

async function fetchRepoFiles(owner, repo, branch = 'main', token) {
  const octokit = new Octokit({ auth: token })
  const { data: tree } = await octokit.git.getTree({
    owner, repo, tree_sha: branch, recursive: 'true'
  })
  const configFiles = tree.tree.filter(f => f.type === 'blob' && isConfigFile(f.path))
  const files = {}
  for (const file of configFiles) {
    try {
      const { data } = await octokit.repos.getContent({ owner, repo, path: file.path, ref: branch })
      if (data.content) {
        files[file.path] = Buffer.from(data.content, 'base64').toString('utf8')
      }
    } catch (err) {
      console.warn(`Skipping ${file.path}: ${err.message}`)
    }
  }
  return files
}

async function getLatestCommitSHA(owner, repo, branch = 'main', token) {
  const octokit = new Octokit({ auth: token })
  const { data } = await octokit.repos.getBranch({ owner, repo, branch })
  return data.commit.sha
}

module.exports = { fetchRepoFiles, getLatestCommitSHA }
