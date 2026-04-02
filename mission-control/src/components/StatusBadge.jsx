const STYLES = {
  Completed:  'bg-green-950 text-green-400 border-green-800',
  Assigned:   'bg-blue-950 text-blue-400 border-blue-800',
  Disputed:   'bg-red-950 text-red-400 border-red-800',
  Open:       'bg-emerald-950 text-emerald-400 border-emerald-800',
  'In Review':'bg-amber-950 text-amber-400 border-amber-800',
}

export function StatusBadge({ status }) {
  const s = STYLES[status] || 'bg-slate-800 text-slate-400 border-slate-700'
  return (
    <span className={`text-xs px-2 py-0.5 rounded border font-mono ${s}`}>
      {status}
    </span>
  )
}
