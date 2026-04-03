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

/* ========================= Utils ========================= */

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

/* ========================= Header ========================= */

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
          <span className="text-xs text-slate-500">
            {error ? 'error' : 'live'}
          </span>
        </div>
      </div>
    </div>
  )
}

/* ====================== Shared Panels ===================== */

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

/* ========================== Views ========================= */

function ClassicView(props) {
  const {
    jobsDesc,
    loading,
    error,
    selected,
    setSelected,
    tab,
    setTab,
  } = props

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

      {tab === 'detail' && (
        <JobDetail job={selected} onRunIntake={() => {}} />
      )}
    </div>
  )
}

/* ========================= Main App ======================= */

export default function App() {
  const { jobs, loading, error, countdown, events, refetch } = useJobs()
  const wallet = useWallet()

  const [selected, setSelected] = useState(null)
  const [tab, setTab] = useState('jobs')
  const [activeVersion, setActiveVersion] = useState('v2')

  const assigned = useMemo(
    () => jobs.filter(j => j.status === 'Assigned'),
    [jobs]
  )

  const completed = useMemo(
    () => jobs.filter(j => j.status === 'Completed'),
    [jobs]
  )

  const disputed = useMemo(
    () => jobs.filter(j => j.status === 'Disputed'),
    [jobs]
  )

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

      {activeVersion !== 'v1' && (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-4 gap-2">
            <MetricCard label="Total" value={jobsDesc.length} />
            <MetricCard label="Assigned" value={assigned.length} />
            <MetricCard label="Done" value={completed.length} />
            <MetricCard label="Disputed" value={disputed.length} />
          </div>

          <div className="flex flex-wrap gap-2">
            {['jobs', 'request', 'wallet', 'prime', 'workflows', 'events', 'visuals', 'test'].map(t => (
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

          {tab === 'jobs' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="space-y-2">
                {jobsDesc.map(j => (
                  <JobCard
                    key={j.jobId}
                    job={j}
                    selected={selected?.jobId === j.jobId}
                    onClick={() => setSelected(j)}
                  />
                ))}
              </div>

              <div>
                <JobDetail job={selected} onRunIntake={() => {}} />
              </div>
            </div>
          )}

          {tab !== 'jobs' && <SharedTabPanels {...viewProps} />}
        </div>
      )}
    </div>
  )
}
