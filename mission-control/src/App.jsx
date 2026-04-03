import { useMemo, useState } from 'react'
import { useJobs } from './hooks/useJobs'
import { MetricCard } from './components/MetricCard'
import { JobCard } from './components/JobCard'
import { JobDetail } from './components/JobDetail'
import { EventLog } from './components/EventLog'
import { GitHubFlows } from './components/GitHubFlows'
import { TestTab } from './components/TestTab'
import { WalletPanel } from './components/WalletPanel'
import { JobRequestTab } from './components/JobRequestTab'
import { PrimeContractTab } from './components/PrimeContractTab'
import { useWallet } from './hooks/useWallet'

function compareJobIdDesc(a, b) {
  try {
    const aId = BigInt(String(a.jobId ?? 0))
    const bId = BigInt(String(b.jobId ?? 0))
    if (bId === aId) return 0
    return bId > aId ? 1 : -1
  } catch {
    return Number(b.jobId ?? 0) - Number(a.jobId ?? 0)
  }
}

function Header({ countdown, error, refetch, viewMode, onToggleView }) {
  return (
    <div className="border-b border-slate-800 px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">⬡</div>
        <div>
          <div className="text-sm font-semibold leading-tight">AGI Alpha Mission Control</div>
          <div className="text-xs text-slate-500 leading-tight">Operator console for job requests, applies, and validation</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 font-mono hidden sm:block">{countdown}s</span>
        <button
          onClick={onToggleView}
          className="text-xs px-2 py-1 rounded border border-blue-700/70 text-blue-200 bg-blue-950/40 hover:bg-blue-900/50"
        >
          {viewMode === 'old' ? 'new display' : 'old display'}
        </button>
        <button onClick={refetch} className="text-xs px-2 py-1 rounded border border-slate-700 text-slate-300 hover:bg-slate-800">refresh</button>
        <div className="flex items-center gap-1">
          <div className={`w-1.5 h-1.5 rounded-full ${error ? 'bg-red-500' : 'bg-green-500 animate-pulse'}`} />
          <span className="text-xs text-slate-500">{error ? 'error' : 'live'}</span>
        </div>
      </div>
    </div>
  )
}

function ClassicMissionControl(props) {
  const { loading, error, jobsDesc, assigned, completed, disputed, selected, setTab, tab, handleSelectJob, events, wallet, jobs } = props

  return (
    <div className="px-4 py-3">
      <div className="grid grid-cols-4 gap-2 mb-4">
        <MetricCard label="Total" value={loading ? '—' : jobsDesc.length} />
        <MetricCard label="Assigned" value={loading ? '—' : assigned.length} color="text-blue-400" />
        <MetricCard label="Done" value={loading ? '—' : completed.length} color="text-green-400" />
        <MetricCard label="Disputed" value={loading ? '—' : disputed.length} color="text-red-400" />
      </div>

      <div className="flex gap-1 mb-4 border-b border-slate-800 overflow-x-auto">
        {['jobs', selected ? 'detail' : null, 'request', 'wallet', 'prime', 'workflows', 'events', 'test'].filter(Boolean).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-xs capitalize transition-colors border-b-2 -mb-px whitespace-nowrap ${
              tab === t ? 'text-white border-blue-500' : 'text-slate-500 border-transparent hover:text-slate-300'
            }`}
          >
            {t}
            {t === 'jobs' && assigned.length > 0 && (
              <span className="ml-1 bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5">{assigned.length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'jobs' && (
        <div className="space-y-2">
          {loading && <div className="text-slate-600 text-xs text-center py-8">Loading...</div>}
          {error && <div className="text-red-400 text-xs p-3 bg-red-950/30 rounded-lg border border-red-900">{error}</div>}
          {jobsDesc.map(j => (
            <JobCard key={j.jobId} job={j} selected={selected?.jobId === j.jobId} onClick={() => handleSelectJob(j)} />
          ))}
        </div>
      )}

      {tab === 'detail' && (
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
          <button onClick={() => setTab('jobs')} className="text-xs text-slate-500 mb-3 flex items-center gap-1 hover:text-slate-300">← back to jobs</button>
          <JobDetail job={selected} onRunIntake={() => {}} />
        </div>
      )}

      {tab === 'request' && <JobRequestTab />}
      {tab === 'wallet' && <WalletPanel wallet={wallet} />}
      {tab === 'prime' && <PrimeContractTab wallet={wallet} jobs={jobs} />}
      {tab === 'workflows' && <GitHubFlows />}

      {tab === 'events' && (
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Event log</div>
          <EventLog events={events} />
        </div>
      )}

      {tab === 'test' && <TestTab />}
    </div>
  )
}

function ProMissionControl(props) {
  const { loading, error, jobsDesc, assigned, completed, disputed, selected, setTab, tab, handleSelectJob, events, wallet, jobs } = props

  const oldTabs = [
    ['queue', 'jobs'],
    ['request', 'request'],
    ['wallet', 'wallet'],
    ['prime', 'prime'],
    ['workflows', 'workflows'],
    ['events', 'events'],
  ]

  return (
    <div className="px-4 py-4 space-y-4">
      <section className="rounded-xl border border-slate-800 bg-gradient-to-r from-slate-900 to-slate-950 p-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-blue-300">Command Overview</p>
            <h2 className="text-lg font-semibold text-white">Mission Control Professional View</h2>
            <p className="text-xs text-slate-400">Focused pipeline visibility with quick operator actions.</p>
          </div>
          <div className="text-xs text-slate-400">
            Active queue: <span className="text-white font-semibold">{loading ? '—' : assigned.length}</span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <MetricCard label="Total Jobs" value={loading ? '—' : jobsDesc.length} />
        <MetricCard label="In Progress" value={loading ? '—' : assigned.length} color="text-blue-400" />
        <MetricCard label="Completed" value={loading ? '—' : completed.length} color="text-emerald-400" />
        <MetricCard label="Disputes" value={loading ? '—' : disputed.length} color="text-rose-400" />
      </div>

      <div className="flex flex-wrap gap-2">
        {oldTabs.map(([label, tabValue]) => (
          <button
            key={tabValue}
            onClick={() => setTab(tabValue)}
            className={`px-3 py-1.5 rounded-full text-xs border transition-colors capitalize ${
              tab === tabValue
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'jobs' && (
        <section className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Job Queue</h3>
              <span className="text-xs text-slate-400">{jobsDesc.length} total</span>
            </div>
            {loading && <div className="text-slate-600 text-xs text-center py-8">Loading queue…</div>}
            {error && <div className="text-red-400 text-xs p-3 bg-red-950/30 rounded-lg border border-red-900 mb-2">{error}</div>}
            <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
              {jobsDesc.map(j => (
                <JobCard key={j.jobId} job={j} selected={selected?.jobId === j.jobId} onClick={() => handleSelectJob(j)} />
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Selected Job Brief</h3>
            <JobDetail job={selected} onRunIntake={() => {}} />
          </div>
        </section>
      )}

      {tab === 'request' && <JobRequestTab />}
      {tab === 'wallet' && <WalletPanel wallet={wallet} />}
      {tab === 'prime' && <PrimeContractTab wallet={wallet} jobs={jobs} />}
      {tab === 'workflows' && <GitHubFlows />}
      {tab === 'events' && (
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Event log</div>
          <EventLog events={events} />
        </div>
      )}
    </div>
  )
}

export default function App() {
  const { jobs, loading, error, countdown, events, refetch } = useJobs()
  const [selected, setSelected] = useState(null)
  const [tab, setTab] = useState('jobs')
  const [viewMode, setViewMode] = useState('new')
  const wallet = useWallet()

  const assigned = useMemo(() => jobs.filter(j => j.status === 'Assigned'), [jobs])
  const completed = useMemo(() => jobs.filter(j => j.status === 'Completed'), [jobs])
  const disputed = useMemo(() => jobs.filter(j => j.status === 'Disputed'), [jobs])
  const jobsDesc = useMemo(() => [...jobs].sort(compareJobIdDesc), [jobs])

  function handleSelectJob(job) {
    setSelected(job)
    if (viewMode === 'old' && window.innerWidth < 768) setTab('detail')
    if (viewMode === 'new') setTab('jobs')
  }

  const viewProps = {
    loading,
    error,
    jobsDesc,
    assigned,
    completed,
    disputed,
    selected,
    setTab,
    tab,
    handleSelectJob,
    events,
    wallet,
    jobs,
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <Header
        countdown={countdown}
        error={error}
        refetch={refetch}
        viewMode={viewMode}
        onToggleView={() => setViewMode(prev => (prev === 'old' ? 'new' : 'old'))}
      />

      {viewMode === 'old' ? <ClassicMissionControl {...viewProps} /> : <ProMissionControl {...viewProps} />}
    </div>
  )
}
