import { useState, useEffect } from 'react'
import { JobBrief } from './JobDetail'

const BASE = ''

// ── Job card ─────────────────────────────────────────────────────────────────
function JobTestCard({ job, selected, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-lg border p-3 transition-all ${
        selected
          ? 'border-blue-500 bg-blue-950/30'
          : 'border-slate-800 bg-slate-900 hover:border-slate-600'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-slate-200 leading-snug truncate">{job.title}</div>
          <div className="text-xs text-slate-500 mt-1 font-mono">{job.category}</div>
        </div>
        <div className="text-xs font-mono text-amber-400 shrink-0">
          {Number(job.payout).toLocaleString()} <span className="text-slate-600">$AGA</span>
        </div>
      </div>
      {job.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {job.tags.slice(0, 4).map(t => (
            <span key={t} className="text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">{t}</span>
          ))}
        </div>
      )}
      <div className="text-xs text-slate-600 mt-1 font-mono">{job.file}</div>
    </div>
  )
}

// ── Main TestTab ──────────────────────────────────────────────────────────────
export function TestTab() {
  const [jobs, setJobs]               = useState([])
  const [loadingJobs, setLoadingJobs] = useState(true)
  const [selected, setSelected]       = useState(null)
  const [briefSpec, setBriefSpec]     = useState(null)
  const [loadingBrief, setLoadingBrief] = useState(false)
  const [briefError, setBriefError]   = useState(null)

  async function openBrief() {
    if (!selected) return
    setLoadingBrief(true)
    setBriefError(null)
    try {
      const res = await fetch(`${BASE}/api/test-jobs/${selected.file}`)
      if (!res.ok) throw new Error(`Server returned ${res.status}`)
      setBriefSpec(await res.json())
    } catch (e) {
      setBriefError(e.message)
    } finally {
      setLoadingBrief(false)
    }
  }

  useEffect(() => {
    fetch(BASE + '/api/test-jobs')
      .then(r => r.json())
      .then(data => { setJobs(data); if (data[0]) setSelected(data[0]) })
      .catch(() => {})
      .finally(() => setLoadingJobs(false))
  }, [])

  return (
    <div className="space-y-4">
      {briefSpec && <JobBrief spec={briefSpec} onClose={() => setBriefSpec(null)} />}

      {/* ── Job selector ── */}
      <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
        <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Test Jobs</div>
        {loadingJobs && <div className="text-slate-600 text-xs py-4 text-center">Loading...</div>}
        <div className="space-y-2">
          {jobs.map(job => (
            <JobTestCard
              key={job.file}
              job={job}
              selected={selected?.file === job.file}
              onClick={() => setSelected(job)}
            />
          ))}
        </div>
      </div>

      {/* ── Selected job ── */}
      {selected && (
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
          <div className="text-xs text-slate-400 font-semibold mb-1">{selected.title}</div>
          {selected.summary && <p className="text-xs text-slate-600 line-clamp-2 mb-3">{selected.summary}</p>}
          {briefError && (
            <div className="mb-3 text-xs text-red-400 bg-red-950/30 border border-red-900 rounded p-2">{briefError}</div>
          )}
          <button
            onClick={openBrief}
            disabled={loadingBrief}
            className="w-full text-xs py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white transition-colors font-medium"
          >
            {loadingBrief ? 'loading...' : 'view brief'}
          </button>
        </div>
      )}

      {/* ── Execution note ── */}
      <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
        <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Execution</div>
        <div className="text-xs text-slate-400 leading-relaxed">
          Jobs run autonomously via <span className="text-blue-400 font-mono">autonomous.yml</span> every 15 min.
          Trigger manually from the <span className="text-blue-400">Workflows</span> tab or GitHub Actions.
        </div>
      </div>
    </div>
  )
}