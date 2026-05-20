export function DriftClassBadge({ driftClass }) {
  const styles = {
    AUTHORIZED: 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50',
    UNAUTHORIZED: 'bg-red-900/60 text-red-300 border border-red-700/50',
    SIGNATURE_BROKEN: 'bg-amber-900/60 text-amber-300 border border-amber-700/50'
  }
  const labels = {
    AUTHORIZED: '✓ Authorized',
    UNAUTHORIZED: '✗ Unauthorized',
    SIGNATURE_BROKEN: '⚠ Sig-Broken'
  }
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${styles[driftClass] || 'bg-gray-800 text-gray-400'}`}>
      {labels[driftClass] || driftClass}
    </span>
  )
}
