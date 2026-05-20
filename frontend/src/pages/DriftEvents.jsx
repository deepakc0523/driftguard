import { useEffect, useState, useCallback } from 'react'
import api from '../api'
import { DriftClassBadge } from '../components/DriftClassBadge'
import { SeverityBadge } from '../components/SeverityBadge'
import { formatDistanceToNow } from 'date-fns'

const CLASS_FILTERS = ['ALL', 'AUTHORIZED', 'UNAUTHORIZED', 'SIGNATURE_BROKEN']
const SEVERITY_FILTERS = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW']

export default function DriftEvents() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [classFilter, setClassFilter] = useState('ALL')
  const [severityFilter, setSeverityFilter] = useState('ALL')
  const [selected, setSelected] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (classFilter !== 'ALL') params.driftClass = classFilter
      if (severityFilter !== 'ALL') params.severityTier = severityFilter
      const { data } = await api.get('/drift', { params })
      setEvents(data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [classFilter, severityFilter])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Drift Events</h1>
          <p className="text-gray-500 text-sm mt-0.5">{events.length} event{events.length !== 1 ? 's' : ''} found</p>
        </div>
        <button onClick={load} className="btn-secondary text-sm">↻ Refresh</button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Class:</span>
          {CLASS_FILTERS.map(f => (
            <button key={f} onClick={() => setClassFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${classFilter === f ? 'bg-brand-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'}`}>
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Severity:</span>
          {SEVERITY_FILTERS.map(f => (
            <button key={f} onClick={() => setSeverityFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${severityFilter === f ? 'bg-brand-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading drift events…</div>
        ) : events.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">⊞</div>
            <p className="text-gray-500 font-medium">No drift events match your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="border-b border-gray-800 bg-gray-900/50">
                <tr className="text-xs text-gray-500">
                  <th className="text-left py-3 px-4 font-medium">File Path</th>
                  <th className="text-left py-3 px-3 font-medium">Field Path</th>
                  <th className="text-left py-3 px-3 font-medium">Type</th>
                  <th className="text-left py-3 px-3 font-medium">Class</th>
                  <th className="text-left py-3 px-3 font-medium">Severity</th>
                  <th className="text-left py-3 px-3 font-medium">Layer</th>
                  <th className="text-left py-3 px-3 font-medium">Detected</th>
                  <th className="text-left py-3 px-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {events.map(event => (
                  <>
                    <tr key={event._id} className="table-row cursor-pointer" onClick={() => setSelected(selected?._id === event._id ? null : event)}>
                      <td className="py-3 px-4">
                        <span className="text-xs font-mono text-gray-400 truncate max-w-[160px] block">{event.filePath}</span>
                      </td>
                      <td className="py-3 px-3">
                        <code className="text-xs text-brand-300 bg-brand-900/20 px-1.5 py-0.5 rounded">{event.fieldPath}</code>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                          event.driftType === 'MUTATION' ? 'bg-blue-900/40 text-blue-300' :
                          event.driftType === 'ADDITION' ? 'bg-emerald-900/40 text-emerald-300' :
                          'bg-red-900/40 text-red-300'
                        }`}>{event.driftType}</span>
                      </td>
                      <td className="py-3 px-3"><DriftClassBadge driftClass={event.driftClass} /></td>
                      <td className="py-3 px-3"><SeverityBadge tier={event.severityTier} /></td>
                      <td className="py-3 px-3">
                        <span className="text-xs text-gray-500 capitalize">{event.layer}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(event.detectedAt), { addSuffix: true })}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-xs text-gray-600">{selected?._id === event._id ? '▲' : '▼'}</span>
                      </td>
                    </tr>
                    {selected?._id === event._id && (
                      <tr key={`${event._id}-detail`} className="bg-gray-800/30">
                        <td colSpan={8} className="px-4 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                            <div>
                              <p className="text-gray-500 mb-1">Expected Value</p>
                              <code className="text-gray-300 font-mono">{event.expectedValue ?? '—'}</code>
                            </div>
                            <div>
                              <p className="text-gray-500 mb-1">Actual Value</p>
                              <code className="text-gray-300 font-mono">{event.actualValue ?? '—'}</code>
                            </div>
                            <div>
                              <p className="text-gray-500 mb-1">Severity Score</p>
                              <span className="text-gray-300">{event.severityScore?.toFixed(4)}</span>
                            </div>
                            <div>
                              <p className="text-gray-500 mb-1">PCID Reference</p>
                              <span className="text-gray-300">{event.pcidRef ? 'Linked' : 'None'}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
