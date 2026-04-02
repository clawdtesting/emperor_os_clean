const PIPELINES = [
  { name: 'intake.lobster.yaml',      status: 'active',  desc: 'fetch → extract → analyze → approve' },
  { name: 'creative.lobster.yaml',    status: 'ready',   desc: 'research → draft → review → approve' },
  { name: 'development.lobster.yaml', status: 'ready',   desc: 'plan → implement → review → approve' },
  { name: 'research.lobster.yaml',    status: 'ready',   desc: 'gather → analyze → approve' },
  { name: 'analysis.lobster.yaml',    status: 'ready',   desc: 'audit → report → approve' },
]

const STATUS_STYLES = {
  active: 'bg-blue-950 text-blue-400 border-blue-800',
  ready:  'bg-green-950 text-green-400 border-green-800',
}

export function PipelineRegistry() {
  return (
    <div className="space-y-0">
      {PIPELINES.map(p => (
        <div key={p.name} className="flex items-start justify-between gap-3 py-2.5 border-b border-slate-800 last:border-0">
          <div>
            <div className="text-xs font-mono text-slate-300">{p.name}</div>
            <div className="text-xs text-slate-600 mt-0.5">{p.desc}</div>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded border shrink-0 ${STATUS_STYLES[p.status]}`}>
            {p.status}
          </span>
        </div>
      ))}
    </div>
  )
}
