export function MetricCard({ label, value, color = 'text-slate-100' }) {
  return (
    <div className="bg-slate-900 rounded-lg p-2 sm:p-4 border border-slate-800">
      <div className="text-xs text-slate-500 mb-1 truncate">{label}</div>
      <div className={`text-xl sm:text-2xl font-semibold font-mono ${color}`}>{value}</div>
    </div>
  )
}
