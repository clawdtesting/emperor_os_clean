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

const APP_VERSIONS = ['v1', 'v2', 'v3', 'v4']
const TAB_OPTIONS = [
  'jobs',
  'request',
  'wallet',
  'prime',
  'workflows',
  'events',
  'visuals',
  'test',
]

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
  return (
    <div className="border-b border-slate-800 px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
          ⬡
        </div>
        <div>
          <div className="text-sm font-semibold">AGI Alpha Mission Control</div>
          <div className="text-xs text-slate-500">
            Operator console for job execution & validation
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 font-mono hidden md:block">
          {countdown}s
        </span>

        <div className="flex items-center gap-1 rounded-lg border border-slate-700 p-1 bg-slate-900">
          {APP_VERSIONS.map(version => (
            <button
              key={version}
              onClick={() => onSelectVersion(version)}
              className={`text-xs px-2 py-1 rounded ${
                activeVersion === version
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {version}
            </button>
          ))}
        </div>

        <button
          onClick={refetch}
          className="text-xs px-2 py-1 rounded border border-slate-700"
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

function SharedTabPanels({
  tab,
  events,
  wallet,
  jobs,
  jobsDesc,
  assigned,
  completed,
  disputed,
}) {
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

function VersionV1Classic({ jobsDesc, loading, error, selected, setSelected }) {
  return (
    <div className="p-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
      <div>
        {loading && <div className="mb-3 text-sm text-slate-400">Loading...</div>}
        {error && <div className="mb-3 text-sm text-red-400">{error}</div>}

        <div className="space-y-2">
          {jobsDesc.map(job => (
            <JobCard
              key={job.jobId}
              job={job}
              selected={selected?.jobId === job.jobId}
              onClick={() => setSelected(job)}
            />
          ))}
        </div>
      </div>

      <div>
        <JobDetail job={selected} onRunIntake={() => {}} />
      </div>
    </div>
  )
}

function VersionV2MissionDeck({
  jobsDesc,
  assigned,
  completed,
  disputed,
  selected,
  setSelected,
  tab,
  setTab,
  events,
  wallet,
  jobs,
}) {
  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <MetricCard label="Total" value={jobsDesc.length} />
        <MetricCard label="Assigned" value={assigned.length} />
        <MetricCard label="Done" value={completed.length} />
        <MetricCard label="Disputed" value={disputed.length} />
      </div>

      <div className="flex flex-wrap gap-2">
        {TAB_OPTIONS.map(tabName => (
          <button
            key={tabName}
            onClick={() => setTab(tabName)}
            className={`px-3 py-1.5 rounded text-xs border ${
              tab === tabName
                ? 'bg-blue-600 text-white border-blue-500'
                : 'border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {tabName}
          </button>
        ))}
      </div>

      {tab === 'jobs' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="space-y-2">
            {jobsDesc.map(job => (
              <JobCard
                key={job.jobId}
                job={job}
                selected={selected?.jobId === job.jobId}
                onClick={() => setSelected(job)}
              />
            ))}
          </div>
          <JobDetail job={selected} onRunIntake={() => {}} />
        </div>
      )}

      {tab !== 'jobs' && (
        <SharedTabPanels
          tab={tab}
          events={events}
          wallet={wallet}
          jobs={jobs}
          jobsDesc={jobsDesc}
          assigned={assigned}
          completed={completed}
          disputed={disputed}
        />
      )}
    </div>
  )
}

function VersionV3OpsCenter({
  jobsDesc,
  assigned,
  completed,
  disputed,
  selected,
  setSelected,
  events,
  wallet,
  jobs,
}) {
  const newestEvents = useMemo(() => events.slice(0, 8), [events])

  return (
    <div className="p-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <aside className="lg:col-span-3 rounded-xl border border-cyan-900/40 bg-cyan-950/20 p-4 space-y-3">
          <div className="text-xs uppercase tracking-widest text-cyan-300">Ops Rail</div>
          <MetricCard label="Total Jobs" value={jobsDesc.length} />
          <MetricCard label="Active Assignments" value={assigned.length} />
          <MetricCard label="Resolved" value={completed.length} />
          <MetricCard label="Escalations" value={disputed.length} />
          <div className="text-xs text-slate-400 pt-2 border-t border-slate-800">
            Visual mode focused on active operations and telemetry.
          </div>
        </aside>

        <section className="lg:col-span-5 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Live Queue</h2>
            <span className="text-xs text-slate-500">Tap a job to inspect</span>
          </div>

          <div className="space-y-2 max-h-[70vh] overflow-auto pr-1">
            {jobsDesc.map(job => (
              <JobCard
                key={job.jobId}
                job={job}
                selected={selected?.jobId === job.jobId}
                onClick={() => setSelected(job)}
              />
            ))}
          </div>
        </section>

        <section className="lg:col-span-4 space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <h2 className="text-sm font-semibold mb-3">Focused Job</h2>
            <JobDetail job={selected} onRunIntake={() => {}} />
          </div>

          <div className="rounded-xl border border-purple-900/40 bg-purple-950/20 p-4">
            <h2 className="text-sm font-semibold mb-3">Telemetry Pulse</h2>
            <div className="space-y-2 text-xs">
              {newestEvents.length === 0 && (
                <div className="text-slate-500">No recent events recorded.</div>
              )}
              {newestEvents.map((eventItem, idx) => (
                <div key={`${eventItem.txHash ?? 'ev'}-${idx}`} className="border-l border-purple-700/50 pl-2">
                  {eventItem.type || eventItem.message || JSON.stringify(eventItem)}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <h3 className="text-sm font-semibold mb-3">Wallet Snapshot</h3>
          <WalletPanel wallet={wallet} />
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <h3 className="text-sm font-semibold mb-3">Contract Command</h3>
          <PrimeContractTab wallet={wallet} jobs={jobs} />
        </div>
      </div>
    </div>
  )
}

function VersionV4Kanban({ jobsDesc, selected, setSelected, events }) {
  const columns = useMemo(() => {
    const statusMap = {
      Open: jobsDesc.filter(job => job.status === 'Open'),
      Assigned: jobsDesc.filter(job => job.status === 'Assigned'),
      Completed: jobsDesc.filter(job => job.status === 'Completed'),
      Disputed: jobsDesc.filter(job => job.status === 'Disputed'),
    }

    return Object.entries(statusMap)
  }, [jobsDesc])

  return (
    <div className="p-4 space-y-4">
      <div className="rounded-xl border border-amber-800/40 bg-amber-950/20 p-4">
        <h2 className="text-sm font-semibold text-amber-200">War-Room Board</h2>
        <p className="text-xs text-amber-400 mt-1">
          Status-driven kanban view to track flow and surface blockers quickly.
        </p>
      </div>

      <div className="grid grid-cols-1 2xl:grid-cols-4 gap-4">
        {columns.map(([status, statusJobs]) => (
          <div key={status} className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">{status}</h3>
              <span className="text-xs text-slate-500">{statusJobs.length}</span>
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-auto pr-1">
              {statusJobs.map(job => (
                <JobCard
                  key={job.jobId}
                  job={job}
                  selected={selected?.jobId === job.jobId}
                  onClick={() => setSelected(job)}
                />
              ))}
              {statusJobs.length === 0 && (
                <div className="text-xs text-slate-500 py-3 text-center border border-dashed border-slate-800 rounded">
                  No jobs
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <h3 className="text-sm font-semibold mb-3">Selected Job</h3>
          <JobDetail job={selected} onRunIntake={() => {}} />
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <h3 className="text-sm font-semibold mb-3">Recent Event Stream</h3>
          <EventLog events={events} />
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const { jobs, loading, error, countdown, events, refetch } = useJobs()
  const wallet = useWallet()

  const [selected, setSelected] = useState(null)
  const [tab, setTab] = useState('jobs')
  const [activeVersion, setActiveVersion] = useState('v2')

  const assigned = useMemo(() => jobs.filter(job => job.status === 'Assigned'), [jobs])
  const completed = useMemo(() => jobs.filter(job => job.status === 'Completed'), [jobs])
  const disputed = useMemo(() => jobs.filter(job => job.status === 'Disputed'), [jobs])

  const jobsDesc = useMemo(() => [...jobs].sort(compareJobIdDesc), [jobs])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <Header
        countdown={countdown}
        error={error}
        refetch={refetch}
        activeVersion={activeVersion}
        onSelectVersion={setActiveVersion}
      />

      {activeVersion === 'v1' && (
        <VersionV1Classic
          jobsDesc={jobsDesc}
          loading={loading}
          error={error}
          selected={selected}
          setSelected={setSelected}
        />
      )}

      {activeVersion === 'v2' && (
        <VersionV2MissionDeck
          jobsDesc={jobsDesc}
          assigned={assigned}
          completed={completed}
          disputed={disputed}
          selected={selected}
          setSelected={setSelected}
          tab={tab}
          setTab={setTab}
          events={events}
          wallet={wallet}
          jobs={jobs}
        />
      )}

      {activeVersion === 'v3' && (
        <VersionV3OpsCenter
          jobsDesc={jobsDesc}
          assigned={assigned}
          completed={completed}
          disputed={disputed}
          selected={selected}
          setSelected={setSelected}
          events={events}
          wallet={wallet}
          jobs={jobs}
        />
      )}

      {activeVersion === 'v4' && (
        <VersionV4Kanban
          jobsDesc={jobsDesc}
          selected={selected}
          setSelected={setSelected}
          events={events}
        />
      )}
    </div>
  )
}
