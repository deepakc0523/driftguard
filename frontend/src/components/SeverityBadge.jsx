export function SeverityBadge({ tier }) {
  const styles = {
    CRITICAL: 'bg-red-950 text-red-300 border border-red-700 animate-pulse-slow',
    HIGH:     'bg-orange-950 text-orange-300 border border-orange-700',
    MEDIUM:   'bg-yellow-950 text-yellow-300 border border-yellow-700',
    LOW:      'bg-blue-950 text-blue-300 border border-blue-800',
  }
  const dots = {
    CRITICAL: '●',
    HIGH: '●',
    MEDIUM: '●',
    LOW: '●',
  }
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-md inline-flex items-center gap-1.5 ${styles[tier] || 'bg-gray-800 text-gray-400'}`}>
      <span className="text-[8px]">{dots[tier]}</span>
      {tier}
    </span>
  )
}
