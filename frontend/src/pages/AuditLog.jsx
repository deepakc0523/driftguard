import { useEffect, useState, useCallback } from 'react'
import api from '../api'
import { formatDistanceToNow, format } from 'date-fns'
import toast from 'react-hot-toast'

const EVENT_COLORS = {
  DRIFT_DETECTED: 'text-red-400',
  SCAN_COMPLETE: 'text-brand-400',
  BASELINE_CAPTURED: 'text-emerald-400',
  REPO_CONNECTED: 'text-blue-400',
  USER_LOGIN: 'text-gray-400',
  USER_REGISTERED: 'text-gray-400',
  CR_TRANSITION: 'text-amber-400',
  PCID_CREATED: 'text-purple-400',
}

export default function AuditLog() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [ledgerStatus, setLedgerStatus] = useState(null)
  const [verifying, setVerifying] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/audit?limit=200')
      setEntries(data)
    } catch { toast.error('Failed to load audit log') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const verifyLedger = async () => {
    setVerifying(true)
    try {
      const { data } = await api.get('/audit/verify')
      setLedgerStatus(data)
      if (data.valid) toast.success('Ledger integrity verified ✓')
      else toast.error('LEDGER TAMPERED! Chain hash mismatch detected.')
    } catch (e) {
      toast.error(e.response?.data?.error || 'Verification failed (requires admin role)')
    } finally { setVerifying(false) }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Audit Log</h1>
          <p className="text-gray-500 text-sm mt-0.5">Append-only SHA-3 hash-chained ledger · {entries.length} entries</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={verifyLedger} disabled={verifying} className="btn-secondary text-sm flex items-center gap-2">
            {verifying ? '…' : '⊙ Verify Ledger'}
          </button>
          <button onClick={load} className="btn-secondary text-sm">↻</button>
        </div>
      </div>

      {/* Ledger status banner */}
      {ledgerStatus && (
        <div className={`rounded-xl p-4 border text-sm flex items-center gap-3 ${
          ledgerStatus.valid
            ? 'bg-emerald-900/20 border-emerald-700/40 text-emerald-300'
            : 'bg-red-900/20 border-red-700/40 text-red-300'
        }`}>
          <span className={`w-2.5 h-2.5 rounded-full ${ledgerStatus.valid ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`} />
          {ledgerStatus.message}
        </div>
      )}

      {/* Audit table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading audit entries…</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">⊙</div>
            <p className="text-gray-500 font-medium">No audit entries yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="border-b border-gray-800 bg-gray-900/50">
                <tr className="text-xs text-gray-500">
                  <th className="text-left py-3 px-4 font-medium">#</th>
                  <th className="text-left py-3 px-3 font-medium">Event Type</th>
                  <th className="text-left py-3 px-3 font-medium">Actor</th>
                  <th className="text-left py-3 px-3 font-medium">Timestamp</th>
                  <th className="text-left py-3 px-3 font-medium">Hash</th>
                  <th className="text-left py-3 px-3 font-medium">Prev Hash</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, idx) => (
                  <tr key={entry._id} className="table-row group">
                    <td className="py-3 px-4 text-xs text-gray-600">{entries.length - idx}</td>
                    <td className="py-3 px-3">
                      <span className={`text-xs font-medium font-mono ${EVENT_COLORS[entry.eventType] || 'text-gray-400'}`}>
                        {entry.eventType}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs text-gray-400 max-w-[120px] truncate">
                      {entry.actorId || '—'}
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-xs text-gray-400" title={format(new Date(entry.timestamp), 'PPpp')}>
                        {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <code className="hash-badge text-emerald-500/70">{entry.hash?.slice(0, 12)}…</code>
                    </td>
                    <td className="py-3 px-3">
                      <code className="hash-badge text-gray-600">{entry.prevHash?.slice(0, 12)}…</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-700 text-center">
        Each entry is chained to its predecessor via SHA-3 hash. Ledger tampering is cryptographically detectable.
      </p>
    </div>
  )
}
