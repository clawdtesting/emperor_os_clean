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
  const leftTabs = ['jobs', 'request', 'wallet', 'prime', 'workflows', 'events', 'visuals', 'test']

  return (
    <div className="p-0 lg:p-4">
      <div className="grid grid-cols-1 lg:grid-cols-[230px_1fr] min-h-[calc(100vh-74px)]">
        <aside className="border-r border-violet-900/40 bg-gradient-to-b from-slate-950 via-violet-950/40 to-slate-950 p-4 space-y-4">
          <div>
            <div className="text-[10px] tracking-[0.28em] text-violet-300 uppercase">v4 Tactical Shell</div>
            <div className="text-sm font-semibold mt-1">Left-Rail Ops Console</div>
          </div>

          <img src={empireVisual} alt="Mission visual" className="rounded-xl border border-violet-900/60" />

          <div className="space-y-2">
            {leftTabs.map(name => (
              <button
                key={name}
                onClick={() => setTab(name)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs uppercase tracking-wide border transition ${
                  tab === name
                    ? 'bg-violet-600/80 text-white border-violet-400'
                    : 'bg-slate-900/60 text-slate-300 border-slate-700 hover:border-violet-700'
                }`}
              >
                {name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <MetricCard label="Total" value={jobsDesc.length} />
            <MetricCard label="Assigned" value={assigned.length} />
            <MetricCard label="Done" value={completed.length} />
            <MetricCard label="Disputed" value={disputed.length} />
          </div>
        </aside>

        <main className="p-4 lg:p-6 bg-slate-950/80">
          {tab === 'jobs' && (
            <div className="grid grid-cols-1 2xl:grid-cols-[1.15fr_1fr] gap-4">
              <div className="rounded-2xl border border-violet-900/40 bg-slate-900/40 p-3">
                <div className="text-sm font-semibold mb-2">Queue Matrix</div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-2 max-h-[72vh] overflow-auto pr-1">
                  {jobsDesc.map(job => (
                    <JobCard
                      key={job.jobId}
                      job={job}
                      selected={lead?.jobId === job.jobId}
                      onClick={() => setSelected(job)}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-violet-800/50 bg-violet-950/20 p-4">
                  <div className="text-xs tracking-widest uppercase text-violet-300">Focused Objective</div>
                  <div className="mt-1 text-sm text-slate-300">
                    Job #{lead?.jobId ?? '—'} · {lead?.status ?? 'No jobs available'}
                  </div>
                  <div className="mt-3 rounded-xl border border-slate-700 bg-slate-950/70 p-3">
                    <JobDetail job={lead} onRunIntake={() => {}} />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-3">
                  <div className="text-sm font-semibold mb-2">Signal Feed</div>
                  <div className="space-y-2 text-xs max-h-52 overflow-auto">
                    {events.slice(0, 6).map((evt, idx) => (
                      <div key={`${evt?.txHash ?? 'evt'}-${idx}`} className="rounded border border-slate-800 p-2 bg-slate-950/70">
                        <div className="text-slate-300">{evt?.eventName ?? 'Unknown event'}</div>
                        <div className="text-slate-500 mt-1 break-all">{evt?.txHash ?? 'No tx hash'}</div>
                      </div>
                    ))}
                    {events.length === 0 && <div className="text-slate-500">No events yet.</div>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab !== 'jobs' && (
            <div className="rounded-2xl border border-violet-900/40 bg-slate-900/40 p-2">
              <SharedTabPanels tab={tab} selected={selected} setSelected={setSelected} {...rest} />
            </div>
          )}
        </main>
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
