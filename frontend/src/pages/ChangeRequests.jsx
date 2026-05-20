import { useEffect, useState, useCallback } from 'react'
import api from '../api'
import { DriftClassBadge } from '../components/DriftClassBadge'
import { SeverityBadge } from '../components/SeverityBadge'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

const STATE_COLORS = {
  DETECTED: 'bg-gray-800 text-gray-300 border-gray-700',
  SUBMITTED: 'bg-blue-900/40 text-blue-300 border-blue-700/50',
  UNDER_REVIEW: 'bg-amber-900/40 text-amber-300 border-amber-700/50',
  APPROVED: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50',
  REJECTED: 'bg-red-900/40 text-red-300 border-red-700/50',
  RESOLVED: 'bg-brand-900/40 text-brand-300 border-brand-700/50',
}

const TRANSITIONS = {
  DETECTED: ['SUBMITTED'],
  SUBMITTED: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED'],
  APPROVED: ['RESOLVED'],
  REJECTED: ['SUBMITTED'],
}

export default function ChangeRequests() {
  const [crs, setCrs] = useState([])
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState({})
  const [transitioning, setTransitioning] = useState({})
  const [stateFilter, setStateFilter] = useState('ALL')
  const { user } = useAuth()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (stateFilter !== 'ALL') params.state = stateFilter
      const { data } = await api.get('/change-requests', { params })
      setCrs(data)
    } catch { toast.error('Failed to load change requests') }
    finally { setLoading(false) }
  }, [stateFilter])

  useEffect(() => { load() }, [load])

  const transition = async (id, to) => {
    setTransitioning(p => ({ ...p, [id]: to }))
    try {
      await api.patch(`/change-requests/${id}/transition`, { to, note: note[id] || '' })
      toast.success(`Changed to ${to}`)
      setNote(p => ({ ...p, [id]: '' }))
      load()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Transition failed')
    } finally { setTransitioning(p => ({ ...p, [id]: null })) }
  }

  const FILTER_STATES = ['ALL', 'DETECTED', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'RESOLVED']

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Change Requests</h1>
          <p className="text-gray-500 text-sm mt-0.5">Governance workflow for detected drift events</p>
        </div>
        <button onClick={load} className="btn-secondary text-sm">↻ Refresh</button>
      </div>

      {/* State filter pills */}
      <div className="flex flex-wrap gap-2">
        {FILTER_STATES.map(s => (
          <button key={s} onClick={() => setStateFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all border ${stateFilter === s ? 'bg-brand-600 text-white border-brand-600' : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-gray-200'}`}>
            {s}
          </button>
        ))}
      </div>

      {/* CR list */}
      {loading ? (
        <div className="card text-center py-12 text-gray-500">Loading change requests…</div>
      ) : crs.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-4xl mb-3">⊘</div>
          <p className="text-gray-500 font-medium">No change requests found</p>
          <p className="text-sm text-gray-600 mt-1">Run a scan to generate change requests automatically</p>
        </div>
      ) : (
        <div className="space-y-3">
          {crs.map(cr => {
            const drift = cr.driftEventId
            const available = TRANSITIONS[cr.state] || []
            return (
              <div key={cr._id} className="card hover:border-gray-700 transition-colors">
                <div className="flex items-start gap-4">
                  {/* Left: state badge + info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap mb-2">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-md border ${STATE_COLORS[cr.state]}`}>
                        {cr.state.replace('_', ' ')}
                      </span>
                      {drift && <DriftClassBadge driftClass={drift.driftClass} />}
                      {drift && <SeverityBadge tier={drift.severityTier} />}
                    </div>
                    {drift && (
                      <div className="text-sm mb-1">
                        <code className="text-brand-300 bg-brand-900/20 px-1.5 py-0.5 rounded text-xs">{drift.fieldPath}</code>
                        <span className="text-gray-600 text-xs ml-2">{drift.filePath}</span>
                      </div>
                    )}
                    <p className="text-xs text-gray-500">
                      Created {formatDistanceToNow(new Date(cr.createdAt), { addSuffix: true })}
                      {cr.approvedBy && <> · Approved by <span className="text-gray-400">{cr.approvedBy}</span></>}
                      {cr.rejectedBy && <> · Rejected by <span className="text-gray-400">{cr.rejectedBy}</span></>}
                    </p>
                    {cr.remediationNote && (
                      <p className="text-xs text-gray-400 mt-1.5 italic">"{cr.remediationNote}"</p>
                    )}
                  </div>

                  {/* Right: actions */}
                  {available.length > 0 && (
                    <div className="flex flex-col gap-2 shrink-0 min-w-[200px]">
                      <input
                        className="input text-xs py-1.5"
                        placeholder="Remediation note (optional)"
                        value={note[cr._id] || ''}
                        onChange={e => setNote(p => ({ ...p, [cr._id]: e.target.value }))}
                      />
                      <div className="flex gap-2">
                        {available.map(to => (
                          <button key={to}
                            onClick={() => transition(cr._id, to)}
                            disabled={transitioning[cr._id] === to}
                            className={`text-xs py-1.5 px-3 rounded-lg font-medium transition-all flex-1 ${
                              to === 'APPROVED' || to === 'RESOLVED' ? 'btn-success' :
                              to === 'REJECTED' ? 'btn-danger' : 'btn-secondary'
                            }`}>
                            {transitioning[cr._id] === to ? '…' : to}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* State history */}
                {cr.stateHistory?.length > 1 && (
                  <div className="mt-3 pt-3 border-t border-gray-800">
                    <p className="text-xs text-gray-600 mb-2">History</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {cr.stateHistory.map((h, i) => (
                        <span key={i} className="text-xs text-gray-500 flex items-center gap-1">
                          {h.from && <><span>{h.from}</span><span className="text-gray-700">→</span></>}
                          <span className="text-gray-400">{h.to}</span>
                          {h.actor && <span className="text-gray-600">({h.actor.split('@')[0]})</span>}
                          {i < cr.stateHistory.length - 1 && <span className="text-gray-800 mx-1">·</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
