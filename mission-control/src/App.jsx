import { useMemo, useState } from 'react'
import { useJobs } from './hooks/useJobs'
import { useWallet } from './hooks/useWallet'

import { MetricCard } from './components/MetricCard'
import { JobCard } from './components/JobCard'
import { JobDetail } from './components/JobDetail'
import { EventLog } from './components/EventLog'
import { GitHubFlows } from './components/GitHubFlows'
import { TestTab } from './components/TestTab'
import { WalletPanel } from './components/WalletPanel'
import { JobRequestTab } from './components/JobRequestTab'
import { PrimeContractTab } from './components/PrimeContractTab'

import empireVisual from './assets/hero.png'

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

function Header({ countdown, error, refetch, activeVersion, onSelectVersion }) {
  const versions = ['v1', 'v2', 'v3', 'v4']

  return (
    <div className="border-b border-slate-800 px-4 py-3 flex items-center justify-between gap-3 bg-slate-950/90 backdrop-blur">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
          ⬡
        </div>
        <div>
          <div className="text-sm font-semibold">AGI Alpha Mission Control</div>
          <div className="text-xs text-slate-500">Operator console for job execution & validation</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 font-mono hidden md:block">{countdown}s</span>

        <div className="flex items-center gap-1 rounded-lg border border-slate-700 p-1 bg-slate-900">
          {versions.map(v => (
            <button
              key={v}
              onClick={() => onSelectVersion(v)}
              className={`text-xs px-2 py-1 rounded ${
                activeVersion === v
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        <button
          onClick={refetch}
          className="text-xs px-2 py-1 rounded border border-slate-700 hover:bg-slate-800"
        >
          refresh
        </button>

        <div className="flex items-center gap-1">
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              error ? 'bg-red-500' : 'bg-green-500 animate-pulse'
            }`}
          />
          <span className="text-xs text-slate-500">{error ? 'error' : 'live'}</span>
        </div>
      </div>
    </div>
  )
}

function SharedTabPanels({ tab, events, wallet, jobs, jobsDesc, assigned, completed, disputed }) {
  if (tab === 'request') return <JobRequestTab />
  if (tab === 'wallet') return <WalletPanel wallet={wallet} />
  if (tab === 'prime') return <PrimeContractTab wallet={wallet} jobs={jobs} />
  if (tab === 'workflows') return <GitHubFlows />
  if (tab === 'events') return <EventLog events={events} />
  if (tab === 'test') return <TestTab />

  if (tab === 'visuals') {
    return (
      <div className="p-4 space-y-4">
        <img src={empireVisual} alt="Empire visual" className="rounded-lg" />
        <div className="text-xs space-y-1">
          <div>Total: {jobsDesc.length}</div>
          <div>Assigned: {assigned.length}</div>
          <div>Completed: {completed.length}</div>
          <div>Disputed: {disputed.length}</div>
        </div>
      </div>
    )
  }

  return null
}

function Tabs({ tab, setTab }) {
  const tabs = ['jobs', 'request', 'wallet', 'prime', 'workflows', 'events', 'visuals', 'test']

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map(t => (
        <button
          key={t}
          onClick={() => setTab(t)}
          className={`px-3 py-1.5 rounded text-xs border ${
            tab === t
              ? 'bg-blue-600 text-white border-blue-500'
              : 'border-slate-700 text-slate-300 hover:bg-slate-800'
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  )
}

function V1Classic({ jobsDesc, selected, setSelected, tab, setTab, loading, error, viewProps }) {
  return (
    <div className="p-4 space-y-4">
      <div className="text-xs uppercase tracking-widest text-slate-500">V1 · Classic List + Inspector</div>
      <Tabs tab={tab} setTab={setTab} />

      {tab === 'jobs' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="space-y-2">
            {loading && <div>Loading...</div>}
            {error && <div className="text-red-400">{error}</div>}
            {jobsDesc.map(j => (
              <JobCard
                key={j.jobId}
                job={j}
                selected={selected?.jobId === j.jobId}
                onClick={() => {
                  setSelected(j)
                  setTab('jobs')
                }}
              />
            ))}
          </div>
          <JobDetail job={selected} onRunIntake={() => {}} />
        </div>
      )}

      {tab !== 'jobs' && <SharedTabPanels {...viewProps} />}
    </div>
  )
}

function V2Board({ jobsDesc, assigned, completed, disputed, selected, setSelected, tab, setTab, viewProps }) {
  return (
    <div className="p-4 space-y-4">
      <div className="text-xs uppercase tracking-widest text-cyan-300">V2 · Board / Kanban Mode</div>
      <Tabs tab={tab} setTab={setTab} />

      {tab === 'jobs' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <section className="rounded-xl border border-slate-800 p-3 bg-slate-900/40">
            <h2 className="text-sm mb-2 text-yellow-300">Assigned ({assigned.length})</h2>
            <div className="space-y-2 max-h-[65vh] overflow-auto pr-1">
              {assigned.map(job => (
                <JobCard
                  key={job.jobId}
                  job={job}
                  selected={selected?.jobId === job.jobId}
                  onClick={() => setSelected(job)}
                />
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-800 p-3 bg-slate-900/40">
            <h2 className="text-sm mb-2 text-emerald-300">Completed ({completed.length})</h2>
            <div className="space-y-2 max-h-[65vh] overflow-auto pr-1">
              {completed.map(job => (
                <JobCard
                  key={job.jobId}
                  job={job}
                  selected={selected?.jobId === job.jobId}
                  onClick={() => setSelected(job)}
                />
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-800 p-3 bg-slate-900/40">
            <h2 className="text-sm mb-2 text-rose-300">Disputed ({disputed.length})</h2>
            <div className="space-y-2 max-h-[65vh] overflow-auto pr-1">
              {disputed.map(job => (
                <JobCard
                  key={job.jobId}
                  job={job}
                  selected={selected?.jobId === job.jobId}
                  onClick={() => setSelected(job)}
                />
              ))}
            </div>
          </section>

          <section className="lg:col-span-3 rounded-xl border border-cyan-600/30 p-4 bg-slate-950">
            <h3 className="text-xs text-cyan-300 uppercase tracking-widest mb-2">Focused Job</h3>
            <JobDetail job={selected ?? jobsDesc[0]} onRunIntake={() => {}} />
          </section>
        </div>
      )}

      {tab !== 'jobs' && <SharedTabPanels {...viewProps} />}
    </div>
  )
}

function V3Operations({ jobsDesc, assigned, completed, disputed, selected, setSelected, tab, setTab, viewProps }) {
  return (
    <div className="p-4 space-y-4">
      <div className="rounded-2xl border border-indigo-500/40 bg-gradient-to-r from-indigo-950/80 via-slate-900 to-purple-950/80 p-4">
        <div className="text-xs uppercase tracking-widest text-indigo-200">V3 · Operations Deck</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
          <MetricCard label="Total" value={jobsDesc.length} />
          <MetricCard label="Assigned" value={assigned.length} />
          <MetricCard label="Done" value={completed.length} />
          <MetricCard label="Disputed" value={disputed.length} />
        </div>
      </div>

      <Tabs tab={tab} setTab={setTab} />

      {tab === 'jobs' && (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
          <div className="xl:col-span-1 rounded-xl border border-slate-700 bg-slate-900 p-2 space-y-2 max-h-[70vh] overflow-auto">
            {jobsDesc.map(j => (
              <button
                key={j.jobId}
                onClick={() => setSelected(j)}
                className={`w-full text-left rounded-lg p-2 text-xs border ${
                  selected?.jobId === j.jobId
                    ? 'border-indigo-400 bg-indigo-500/20'
                    : 'border-slate-700 hover:bg-slate-800'
                }`}
              >
                <div className="font-semibold">Job #{j.jobId}</div>
                <div className="text-slate-400">{j.status}</div>
              </button>
            ))}
          </div>

          <div className="xl:col-span-3 rounded-xl border border-slate-700 bg-slate-900 p-4">
            <JobDetail job={selected ?? jobsDesc[0]} onRunIntake={() => {}} />
          </div>
        </div>
      )}

      {tab !== 'jobs' && <SharedTabPanels {...viewProps} />}
    </div>
  )
}

function V4Visual({ jobsDesc, selected, setSelected, tab, setTab, viewProps }) {
  return (
    <div className="p-4 space-y-4">
      <div className="text-xs uppercase tracking-widest text-fuchsia-300">V4 · Visual Radar</div>
      <Tabs tab={tab} setTab={setTab} />

      {tab === 'jobs' && (
        <div className="space-y-4">
          <section className="rounded-2xl border border-fuchsia-500/40 p-4 bg-slate-900/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <img src={empireVisual} alt="Empire visual" className="rounded-xl border border-slate-700" />
              <div className="space-y-2">
                <div className="text-sm text-fuchsia-200">Select any job from the radar feed.</div>
                <div className="grid grid-cols-2 gap-2 max-h-72 overflow-auto pr-1">
                  {jobsDesc.map(job => (
                    <button
                      key={job.jobId}
                      onClick={() => setSelected(job)}
                      className={`rounded-lg border px-2 py-2 text-left text-xs ${
                        selected?.jobId === job.jobId
                          ? 'border-fuchsia-400 bg-fuchsia-500/20'
                          : 'border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      <div className="font-semibold">#{job.jobId}</div>
                      <div className="text-slate-400">{job.status}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-700 p-4 bg-slate-950">
            <JobDetail job={selected ?? jobsDesc[0]} onRunIntake={() => {}} />
          </section>
        </div>
      )}

      {tab !== 'jobs' && <SharedTabPanels {...viewProps} />}
    </div>
  )
}

export default function App() {
  const { jobs, loading, error, countdown, events, refetch } = useJobs()
  const wallet = useWallet()

  const [selected, setSelected] = useState(null)
  const [tab, setTab] = useState('jobs')
  const [activeVersion, setActiveVersion] = useState('v2')

  const assigned = useMemo(() => jobs.filter(j => j.status === 'Assigned'), [jobs])
  const completed = useMemo(() => jobs.filter(j => j.status === 'Completed'), [jobs])
  const disputed = useMemo(() => jobs.filter(j => j.status === 'Disputed'), [jobs])
  const jobsDesc = useMemo(() => [...jobs].sort(compareJobIdDesc), [jobs])

  const viewProps = {
    jobs,
    jobsDesc,
    assigned,
    completed,
    disputed,
    loading,
    error,
    selected,
    setSelected,
    tab,
    setTab,
    events,
    wallet,
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <Header
        countdown={countdown}
        error={error}
        refetch={refetch}
        activeVersion={activeVersion}
        onSelectVersion={setActiveVersion}
      />

      {activeVersion === 'v1' && <V1Classic {...viewProps} />}
      {activeVersion === 'v2' && <V2Board {...viewProps} />}
      {activeVersion === 'v3' && <V3Operations {...viewProps} />}
      {activeVersion === 'v4' && <V4Visual {...viewProps} />}
    </div>
  )
}
