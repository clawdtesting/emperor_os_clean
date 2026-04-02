const TYPE_COLORS = {
  fetch:   'text-slate-500',
  new:     'text-green-400',
  analyze: 'text-amber-400',
  error:   'text-red-400',
  intake:  'text-blue-400',
}

export function EventLog({ events }) {
  if (!events.length) return (
    <div className="text-slate-600 text-xs text-center py-6">No events yet</div>
  )
  return (
    <div className="space-y-0 max-h-64 overflow-y-auto">
      {events.map(e => (
        <div key={e.id} className="flex gap-2 py-1.5 border-b border-slate-800/50 last:border-0 text-xs">
          <span className="text-slate-600 font-mono shrink-0 w-24">{e.ts}</span>
          <span className={`font-medium shrink-0 w-12 ${TYPE_COLORS[e.type] || 'text-slate-400'}`}>{e.type}</span>
          <span className="text-slate-400 truncate">{e.msg}</span>
        </div>
      ))}
    </div>
  )
}
