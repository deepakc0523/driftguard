export function ChainStatus({ verified, gapCount = 0 }) {
  if (verified === null || verified === undefined) return null
  if (!verified) return (
    <span className="inline-flex items-center gap-1.5 text-xs text-red-400 font-medium">
      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
      Chain Tampered
    </span>
  )
  if (gapCount > 0) return (
    <span className="inline-flex items-center gap-1.5 text-xs text-amber-400 font-medium">
      <span className="w-2 h-2 rounded-full bg-amber-500" />
      {gapCount} Gap{gapCount > 1 ? 's' : ''} Detected
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
      <span className="w-2 h-2 rounded-full bg-emerald-500" />
      Chain Intact
    </span>
  )
}
