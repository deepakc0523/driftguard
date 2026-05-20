import { useEffect, useState, useCallback } from 'react'
import api from '../api'
import { DriftClassBadge } from '../components/DriftClassBadge'
import { SeverityBadge } from '../components/SeverityBadge'
import { ChainStatus } from '../components/ChainStatus'
import { formatDistanceToNow } from 'date-fns'

function MetricCard({ label, value, sub, color = 'brand', icon }) {
  const colorMap = {
    brand: 'from-brand-900/30 to-brand-800/10 border-brand-700/30 text-brand-400',
    red: 'from-red-900/30 to-red-800/10 border-red-700/30 text-red-400',
    amber: 'from-amber-900/30 to-amber-800/10 border-amber-700/30 text-amber-400',
    emerald: 'from-emerald-900/30 to-emerald-800/10 border-emerald-700/30 text-emerald-400',
  }
  return (
    <div className={`rounded-xl p-5 bg-gradient-to-br border ${colorMap[color]} transition-all hover:scale-[1.01] duration-200`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
          <p className={`text-3xl font-bold mt-1.5 ${colorMap[color].split(' ').pop()}`}>{value}</p>
          {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
        </div>
        <div className={`text-2xl opacity-60`}>{icon}</div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [driftStats, setDriftStats] = useState(null)
  const [crStats, setCrStats] = useState(null)
  const [pcidStats, setPcidStats] = useState({ total: 0, valid: 0, broken: 0 })
  const [recentPcids, setRecentPcids] = useState([])
  const [recentDrifts, setRecentDrifts] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data: repos } = await api.get('/repos')
      
      const statsPromises = repos.map(r => api.get(`/pcid/${r._id}`))
      const dsPromise = api.get('/drift/stats')
      const csPromise = api.get('/change-requests/stats')
      const drPromise = api.get('/drift?limit=10')

      const [pStats, ds, cs, dr] = await Promise.all([
        Promise.all(statsPromises),
        dsPromise,
        csPromise,
        drPromise
      ])

      const globalPcid = pStats.reduce((acc, curr) => ({
        total: acc.total + curr.data.totalRecords,
        valid: acc.valid + curr.data.validFields,
        broken: acc.broken + curr.data.brokenFields
      }), { total: 0, valid: 0, broken: 0 })

      const allRecent = pStats
        .flatMap(p => p.data.recent)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 5)

      setPcidStats(globalPcid)
      setRecentPcids(allRecent)
      setDriftStats(ds.data)
      setCrStats(cs.data)
      setRecentDrifts(dr.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-3 text-gray-400">
        <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        Loading dashboard…
      </div>
    </div>
  )

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Real-time configuration drift overview</p>
        </div>
        <button onClick={load} className="btn-secondary text-sm flex items-center gap-2">
          ↻ Refresh
        </button>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          label="Total Drift Events"
          value={driftStats?.total ?? 0}
          sub={`${driftStats?.critical ?? 0} critical`}
          color="brand"
          icon="⊗"
        />
        <MetricCard
          label="Registry Health"
          value={`${pcidStats.total} Records`}
          sub={`${pcidStats.valid} valid attestations`}
          color="emerald"
          icon="🛡️"
        />
        <MetricCard
          label="Broken Signatures"
          value={pcidStats.broken}
          sub="PCID verification failures"
          color="red"
          icon="⚠"
        />
        <MetricCard
          label="Pending Approvals"
          value={crStats?.pending ?? 0}
          sub={`${crStats?.approved ?? 0} resolved`}
          color="amber"
          icon="⊘"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Live drift feed */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">Recent Drift Events</h2>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-gray-500">Live</span>
            </div>
          </div>

          {recentDrifts.length === 0 ? (
            <div className="text-center py-12 text-gray-600">
              <div className="text-4xl mb-3">⊞</div>
              <p className="font-medium text-gray-500">No drift events yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm min-w-[400px]">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-800">
                    <th className="text-left pb-3 pl-2 font-medium">Field</th>
                    <th className="text-left pb-3 font-medium">Class</th>
                    <th className="text-right pb-3 pr-2 font-medium">Detected</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDrifts.slice(0, 6).map(event => (
                    <tr key={event._id} className="table-row">
                      <td className="py-3 pl-2">
                        <code className="text-xs text-brand-300 bg-brand-900/20 px-1.5 py-0.5 rounded truncate max-w-[120px] block">
                          {event.fieldPath}
                        </code>
                      </td>
                      <td className="py-3"><DriftClassBadge driftClass={event.driftClass} /></td>
                      <td className="py-3 pr-2 text-right text-xs text-gray-500">
                        {formatDistanceToNow(new Date(event.detectedAt), { addSuffix: true })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* PCID Registry Panel */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">PCID Registry</h2>
            <span className="text-xs text-brand-400 font-mono">INTENT VERIFICATION</span>
          </div>

          {recentPcids.length === 0 ? (
            <div className="text-center py-12 text-gray-600">
              <div className="text-4xl mb-3">⚓</div>
              <p className="font-medium text-gray-500">No PCID records yet</p>
              <p className="text-sm mt-1">Install the pre-commit hook to sign changes</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm min-w-[400px]">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-800">
                    <th className="text-left pb-3 pl-2 font-medium">PCID ID</th>
                    <th className="text-left pb-3 font-medium">Signer</th>
                    <th className="text-center pb-3 font-medium">Fields</th>
                    <th className="text-center pb-3 font-medium">Sig</th>
                    <th className="text-right pb-3 pr-2 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPcids.map(p => (
                    <tr key={p.pcidId} className="table-row">
                      <td className="py-3 pl-2">
                        <code className="text-xs text-gray-500 font-mono">{p.pcidId.slice(0, 8)}</code>
                      </td>
                      <td className="py-3 text-xs text-gray-300">
                        {p.signerIdentity.split('@')[0]}
                      </td>
                      <td className="py-3 text-center text-xs text-gray-400">
                        {p.fieldCount}
                      </td>
                      <td className="py-3 text-center">
                        {p.sigValid ? 
                          <span className="text-emerald-500">✓</span> : 
                          <span className="text-red-500">✗</span>
                        }
                      </td>
                      <td className="py-3 pr-2 text-right text-xs text-gray-500">
                        {formatDistanceToNow(new Date(p.timestamp), { addSuffix: true })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
