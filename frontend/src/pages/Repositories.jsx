import { useEffect, useState, useCallback } from 'react'
import api from '../api'
import toast from 'react-hot-toast'

export default function Repositories() {
  const [repos, setRepos] = useState([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState({})
  const [baselining, setBaselining] = useState({})
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ owner: '', repoName: '', branch: 'main' })
  const [submitting, setSubmitting] = useState(false)
  const [ghStatus, setGhStatus] = useState({ connected: false, login: null })

  const loadStatus = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/github/status')
      setGhStatus(data)
    } catch (e) { console.error('Failed to load GitHub status', e) }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/repos')
      setRepos(data)
      await loadStatus()
    } catch (e) { toast.error('Failed to load repositories') }
    finally { setLoading(false) }
  }, [loadStatus])

  useEffect(() => { load() }, [load])

  const addRepo = async e => {
    e.preventDefault()
    if (!ghStatus.connected) {
      toast.error('Please connect your GitHub account first')
      return
    }
    setSubmitting(true)
    try {
      await api.post('/repos', form)
      toast.success(`${form.owner}/${form.repoName} connected!`)
      setForm({ owner: '', repoName: '', branch: 'main' })
      setShowForm(false)
      load()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to connect repository')
    } finally { setSubmitting(false) }
  }

  const connectGitHub = () => {
    const token = localStorage.getItem('dg_token')
    window.location.href = `/api/auth/github?state=${token}`
  }

  const disconnectGitHub = async () => {
    if (!confirm('Disconnect GitHub account?')) return
    try {
      await api.delete('/auth/github/disconnect')
      toast.success('GitHub disconnected')
      loadStatus()
    } catch { toast.error('Failed to disconnect GitHub') }
  }

  const captureBaseline = async id => {
    setBaselining(p => ({ ...p, [id]: true }))
    try {
      const { data } = await api.post(`/repos/${id}/baseline`)
      toast.success(`Baseline captured — ${data.fields} fields snapshotted`)
      load()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Baseline capture failed')
    } finally { setBaselining(p => ({ ...p, [id]: false })) }
  }

  const runScan = async id => {
    setScanning(p => ({ ...p, [id]: true }))
    try {
      const { data } = await api.post(`/repos/${id}/scan`)
      const { driftEvents, gaps } = data
      if (driftEvents === 0) toast.success('Scan complete — No drift detected!')
      else toast.error(`Scan complete — ${driftEvents} drift event(s) detected! ${gaps.length} CLACB gap(s).`)
    } catch (e) {
      toast.error(e.response?.data?.error || 'Scan failed')
    } finally { setScanning(p => ({ ...p, [id]: false })) }
  }

  const deleteRepo = async id => {
    if (!confirm('Remove this repository?')) return
    try {
      await api.delete(`/repos/${id}`)
      toast.success('Repository removed')
      load()
    } catch { toast.error('Failed to remove repository') }
  }

  const healthDot = (repo) => {
    if (!repo.baselineCapturedAt) return <span className="w-2.5 h-2.5 rounded-full bg-gray-600" title="No baseline" />
    return <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" title="Baseline captured" />
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Repositories</h1>
          <p className="text-gray-500 text-sm mt-0.5">Connect and monitor GitHub repositories</p>
        </div>
        <div className="flex items-center gap-3">
          {ghStatus.connected ? (
            <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 px-3 py-1.5 rounded-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-gray-300 font-medium">{ghStatus.login}</span>
              <button onClick={disconnectGitHub} className="text-gray-500 hover:text-red-400 transition-colors ml-1">✕</button>
            </div>
          ) : (
            <button onClick={connectGitHub} className="bg-white text-black hover:bg-gray-200 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all">
               Connect GitHub
            </button>
          )}
          <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm flex items-center gap-2">
            + Connect Repo
          </button>
        </div>
      </div>

      {/* Add repo form */}
      {showForm && (
        <div className="card border-brand-700/40 animate-slide-up">
          <h2 className="text-base font-semibold text-white mb-4">Connect New Repository</h2>
          <form onSubmit={addRepo} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Owner (GitHub username/org)</label>
              <input className="input" placeholder="e.g. octocat" value={form.owner}
                onChange={e => setForm(p => ({ ...p, owner: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Repository Name</label>
              <input className="input" placeholder="e.g. driftguard-sample" value={form.repoName}
                onChange={e => setForm(p => ({ ...p, repoName: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Branch</label>
              <input className="input" placeholder="main" value={form.branch}
                onChange={e => setForm(p => ({ ...p, branch: e.target.value }))} />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? 'Connecting…' : 'Connect Repository'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Repos list */}
      {loading ? (
        <div className="card text-center py-12 text-gray-500">Loading repositories…</div>
      ) : repos.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-5xl mb-4">⊟</div>
          <p className="text-gray-400 font-medium">No repositories connected yet</p>
          <p className="text-sm text-gray-600 mt-1">Click "Connect Repo" to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {repos.map(repo => (
            <div key={repo._id} className="card flex items-center gap-4 hover:border-gray-700 transition-colors">
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                {healthDot(repo)}
                <div className="min-w-0">
                  <p className="font-semibold text-white text-sm truncate">
                    {repo.owner}/{repo.repoName}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Branch: <span className="text-gray-400">{repo.branch}</span>
                    {repo.baselineCapturedAt && (
                      <> · Baseline: <span className="text-gray-400">{new Date(repo.baselineCapturedAt).toLocaleDateString()}</span></>
                    )}
                    {repo.lastScannedCommitSHA && (
                      <> · SHA: <span className="font-mono text-xs text-gray-500">{repo.lastScannedCommitSHA.slice(0, 8)}</span></>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    const token = localStorage.getItem('dg_token')
                    window.location.href = `http://localhost:5001/api/repos/${repo._id}/install-hook?token=${token}`
                  }}
                  className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                >
                  ⚓ Download Hook
                </button>
                <button
                  onClick={() => captureBaseline(repo._id)}
                  disabled={baselining[repo._id]}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  {baselining[repo._id] ? '…' : '⊟ Baseline'}
                </button>
                <button
                  onClick={() => runScan(repo._id)}
                  disabled={scanning[repo._id]}
                  className="btn-primary text-xs py-1.5 px-3"
                >
                  {scanning[repo._id] ? (
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                      Scanning…
                    </span>
                  ) : '⊗ Run Scan'}
                </button>
                <button onClick={() => deleteRepo(repo._id)} className="btn-danger text-xs py-1.5 px-3">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
