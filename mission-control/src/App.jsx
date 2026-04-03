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
    <div className="border-b border-slate-800 px-4 py-3 flex items-center justify-between gap-3">
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

        <button onClick={refetch} className="text-xs px-2 py-1 rounded border border-slate-700">
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

function TabStrip({ tab, setTab }) {
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

function ClassicView({ jobsDesc, loading, error, selected, setSelected, tab, setTab }) {
  return (
    <div className="p-4">
      {tab === 'jobs' && (
        <>
          {loading && <div>Loading...</div>}
          {error && <div className="text-red-400">{error}</div>}

          <div className="space-y-2">
            {jobsDesc.map(j => (
              <JobCard
                key={j.jobId}
                job={j}
                selected={selected?.jobId === j.jobId}
                onClick={() => {
                  setSelected(j)
                  setTab('detail')
                }}
              />
            ))}
          </div>
        </>
      )}

      {tab === 'detail' && <JobDetail job={selected} onRunIntake={() => {}} />}
    </div>
  )
}

function OperationsDeckView({
  jobsDesc,
  assigned,
  completed,
  disputed,
  selected,
  setSelected,
  tab,
  setTab,
  ...rest
}) {
  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <MetricCard label="Total" value={jobsDesc.length} />
        <MetricCard label="Assigned" value={assigned.length} />
        <MetricCard label="Done" value={completed.length} />
        <MetricCard label="Disputed" value={disputed.length} />
      </div>

      <TabStrip tab={tab} setTab={setTab} />

      {tab === 'jobs' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="space-y-2 max-h-[68vh] overflow-auto pr-1">
            {jobsDesc.map(j => (
              <JobCard
                key={j.jobId}
                job={j}
                selected={selected?.jobId === j.jobId}
                onClick={() => setSelected(j)}
              />
            ))}
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-2">
            <JobDetail job={selected} onRunIntake={() => {}} />
          </div>
        </div>
      )}

      {tab !== 'jobs' && <SharedTabPanels tab={tab} selected={selected} setSelected={setSelected} {...rest} />}
    </div>
  )
}

function BoardView({ jobsDesc, selected, setSelected, tab, setTab, ...rest }) {
  const columns = useMemo(
    () => ({
      Open: jobsDesc.filter(j => j.status === 'Open'),
      Assigned: jobsDesc.filter(j => j.status === 'Assigned'),
      Completed: jobsDesc.filter(j => j.status === 'Completed'),
      Disputed: jobsDesc.filter(j => j.status === 'Disputed'),
    }),
    [jobsDesc]
  )

  return (
    <div className="p-4 grid grid-cols-1 2xl:grid-cols-[1fr_360px] gap-4 h-[calc(100vh-74px)]">
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 overflow-hidden">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold">Kanban Status Board</div>
          <div className="text-xs text-slate-400">Drag-free snapshot by status</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 h-[calc(100%-2.25rem)] overflow-auto pr-1">
          {Object.entries(columns).map(([name, list]) => (
            <div key={name} className="rounded-lg border border-slate-800 bg-slate-950 p-2 min-h-40">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                {name} · {list.length}
              </div>
              <div className="space-y-2">
                {list.length === 0 && <div className="text-xs text-slate-600">No jobs</div>}
                {list.map(job => (
                  <JobCard
                    key={job.jobId}
                    job={job}
                    selected={selected?.jobId === job.jobId}
                    onClick={() => setSelected(job)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/50 flex flex-col overflow-hidden">
        <div className="border-b border-slate-800 p-3 space-y-3">
          <div className="text-sm font-semibold">Inspector</div>
          <TabStrip tab={tab} setTab={setTab} />
        </div>
        <div className="overflow-auto p-3">
          {tab === 'jobs' ? (
            <JobDetail job={selected} onRunIntake={() => {}} />
          ) : (
            <SharedTabPanels tab={tab} selected={selected} setSelected={setSelected} {...rest} />
          )}
        </div>
      </div>
    </div>
  )
}

function CockpitView({ jobsDesc, assigned, completed, disputed, events, selected, setSelected, tab, setTab, ...rest }) {
  const lead = selected ?? jobsDesc[0] ?? null
  const lastEvents = events.slice(0, 8)

  return (
    <div className="p-4 space-y-4">
      <div className="rounded-2xl border border-blue-900/60 bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 p-5">
        <div className="text-xs uppercase tracking-widest text-blue-300">Command Cockpit</div>
        <div className="mt-2 grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-4">
          <div>
            <div className="text-lg font-semibold">Primary Objective</div>
            <div className="text-sm text-slate-300 mt-1">
              Job #{lead?.jobId ?? '—'} · {lead?.status ?? 'No jobs available'}
            </div>
            <div className="mt-3 max-w-2xl rounded-lg border border-slate-700/60 bg-slate-950/60 p-3">
              <JobDetail job={lead} onRunIntake={() => {}} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 content-start">
            <MetricCard label="Pipeline" value={jobsDesc.length} />
            <MetricCard label="Assigned" value={assigned.length} />
            <MetricCard label="Resolved" value={completed.length} />
            <MetricCard label="Conflicts" value={disputed.length} />
            <img src={empireVisual} alt="Control visual" className="rounded-lg col-span-2 border border-slate-800" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold">Mission Queue</div>
            <TabStrip tab={tab} setTab={setTab} />
          </div>

          {tab === 'jobs' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 max-h-[56vh] overflow-auto pr-1">
              {jobsDesc.map(job => (
                <JobCard
                  key={job.jobId}
                  job={job}
                  selected={lead?.jobId === job.jobId}
                  onClick={() => setSelected(job)}
                />
              ))}
            </div>
          )}

          {tab !== 'jobs' && <SharedTabPanels tab={tab} selected={selected} setSelected={setSelected} {...rest} />}
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
          <div className="text-sm font-semibold mb-2">Recent Signal Log</div>
          <div className="space-y-2 text-xs">
            {lastEvents.length === 0 && <div className="text-slate-500">No events yet.</div>}
            {lastEvents.map((evt, idx) => (
              <div key={`${evt?.txHash ?? 'evt'}-${idx}`} className="rounded border border-slate-800 p-2 bg-slate-950/70">
                <div className="text-slate-300">{evt?.eventName ?? 'Unknown event'}</div>
                <div className="text-slate-500 mt-1 break-all">
                  {evt?.txHash ?? 'No tx hash'}
                </div>
              </div>
            ))}
          </div>
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

      {activeVersion === 'v1' && <ClassicView {...viewProps} />}
      {activeVersion === 'v2' && <OperationsDeckView {...viewProps} />}
      {activeVersion === 'v3' && <BoardView {...viewProps} />}
      {activeVersion === 'v4' && <CockpitView {...viewProps} />}
    </div>
  )
}
