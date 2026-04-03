diff --git a/mission-control/src/App.jsx b/mission-control/src/App.jsx
index 8c165d65b0b81abd7d40802c47d9a79d8e9cb194..7ef73e09793e01330dbcea98b1af2489099491b7 100644
--- a/mission-control/src/App.jsx
+++ b/mission-control/src/App.jsx
@@ -1,122 +1,353 @@
-import { useState } from 'react'
+import { useMemo, useState } from 'react'
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
+import empireVisual from './assets/hero.png'
 
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
 
-export default function App() {
-  const { jobs, loading, error, countdown, events, refetch } = useJobs()
-  const [selected, setSelected] = useState(null)
-  const [tab, setTab] = useState('jobs')
-  const wallet = useWallet()
-
-  const assigned  = jobs.filter(j => j.status === 'Assigned')
-  const completed = jobs.filter(j => j.status === 'Completed')
-  const disputed  = jobs.filter(j => j.status === 'Disputed')
-  const jobsDesc  = [...jobs].sort(compareJobIdDesc)
-
-  function handleSelectJob(job) {
-    setSelected(job)
-    if (window.innerWidth < 768) setTab('detail')
-  }
+function Header({ countdown, error, refetch, activeVersion, onSelectVersion }) {
+  const versions = ['v1', 'v2', 'v3', 'v4']
 
   return (
-    <div className="min-h-screen bg-slate-950 text-slate-200">
-      <div className="border-b border-slate-800 px-4 py-3 flex items-center justify-between">
-        <div className="flex items-center gap-2">
-          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">⬡</div>
-          <div>
-            <div className="text-sm font-semibold leading-tight">AGI Alpha Mission Control</div>
-            <div className="text-xs text-slate-500 leading-tight">Operator console for job requests, applies, and validation</div>
-          </div>
-        </div>
-        <div className="flex items-center gap-2">
-          <span className="text-xs text-slate-500 font-mono hidden sm:block">{countdown}s</span>
-          <button onClick={refetch} className="text-xs px-2 py-1 rounded border border-slate-700 text-slate-300 hover:bg-slate-800">refresh</button>
-          <div className="flex items-center gap-1">
-            <div className={`w-1.5 h-1.5 rounded-full ${error ? 'bg-red-500' : 'bg-green-500 animate-pulse'}`} />
-            <span className="text-xs text-slate-500">{error ? 'error' : 'live'}</span>
-          </div>
+    <div className="border-b border-slate-800 px-4 py-3 flex items-center justify-between gap-3">
+      <div className="flex items-center gap-2 min-w-0">
+        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">⬡</div>
+        <div className="min-w-0">
+          <div className="text-sm font-semibold leading-tight truncate">AGI Alpha Mission Control</div>
+          <div className="text-xs text-slate-500 leading-tight truncate">Operator console for job requests, applies, and validation</div>
         </div>
       </div>
 
-      <div className="px-4 py-3">
-        <div className="grid grid-cols-4 gap-2 mb-4">
-          <MetricCard label="Total" value={loading ? '—' : jobsDesc.length} />
-          <MetricCard label="Assigned" value={loading ? '—' : assigned.length} color="text-blue-400" />
-          <MetricCard label="Done" value={loading ? '—' : completed.length} color="text-green-400" />
-          <MetricCard label="Disputed" value={loading ? '—' : disputed.length} color="text-red-400" />
+      <div className="flex items-center gap-2 shrink-0">
+        <span className="text-xs text-slate-500 font-mono hidden xl:block">{countdown}s</span>
+        <div className="hidden md:flex items-center gap-1 rounded-lg border border-slate-700 p-1 bg-slate-900/90">
+          {versions.map(version => (
+            <button
+              key={version}
+              onClick={() => onSelectVersion(version)}
+              className={`text-xs px-2 py-1 rounded ${activeVersion === version ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
+            >
+              {version}
+            </button>
+          ))}
         </div>
+        <button onClick={refetch} className="text-xs px-2 py-1 rounded border border-slate-700 text-slate-300 hover:bg-slate-800">refresh</button>
+        <div className="flex items-center gap-1">
+          <div className={`w-1.5 h-1.5 rounded-full ${error ? 'bg-red-500' : 'bg-green-500 animate-pulse'}`} />
+          <span className="text-xs text-slate-500">{error ? 'error' : 'live'}</span>
+        </div>
+      </div>
 
-        <div className="flex gap-1 mb-4 border-b border-slate-800">
-          {['jobs', selected ? 'detail' : null, 'request', 'wallet', 'prime', 'workflows', 'events', 'test'].filter(Boolean).map(t => (
+      <div className="md:hidden absolute top-14 left-0 right-0 px-4">
+        <div className="flex items-center gap-1 rounded-lg border border-slate-700 p-1 bg-slate-900/95 overflow-x-auto">
+          {versions.map(version => (
             <button
-              key={t}
-              onClick={() => setTab(t)}
-              className={`px-3 py-2 text-xs capitalize transition-colors border-b-2 -mb-px ${
-                tab === t ? 'text-white border-blue-500' : 'text-slate-500 border-transparent hover:text-slate-300'
-              }`}
+              key={version}
+              onClick={() => onSelectVersion(version)}
+              className={`text-xs px-2 py-1 rounded whitespace-nowrap ${activeVersion === version ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
             >
-              {t}
-              {t === 'jobs' && assigned.length > 0 && (
-                <span className="ml-1 bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5">{assigned.length}</span>
-              )}
+              {version}
             </button>
           ))}
         </div>
+      </div>
+    </div>
+  )
+}
 
-        {tab === 'jobs' && (
-          <div className="space-y-2">
-            {loading && <div className="text-slate-600 text-xs text-center py-8">Loading...</div>}
-            {error && <div className="text-red-400 text-xs p-3 bg-red-950/30 rounded-lg border border-red-900">{error}</div>}
-            {jobsDesc.map(j => (
-              <JobCard key={j.jobId} job={j} selected={selected?.jobId === j.jobId} onClick={() => handleSelectJob(j)} />
+function VisualsTab({ jobsDesc, assigned, completed, disputed }) {
+  return (
+    <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-4">
+      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
+        <div className="flex items-center justify-between mb-3">
+          <h3 className="text-sm font-semibold text-white">Empire_OS Visual Map</h3>
+          <span className="text-xs text-slate-400">Live layout preview</span>
+        </div>
+        <div className="rounded-lg border border-slate-700 bg-slate-950/80 p-2">
+          <img src={empireVisual} alt="Empire OS visual" className="w-full h-auto rounded-md object-cover" />
+        </div>
+      </div>
+
+      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
+        <h3 className="text-sm font-semibold text-white mb-3">Fleet Snapshot</h3>
+        <div className="space-y-2 text-xs">
+          <div className="flex justify-between border-b border-slate-800 pb-2"><span className="text-slate-400">Total Jobs</span><span className="text-white">{jobsDesc.length}</span></div>
+          <div className="flex justify-between border-b border-slate-800 pb-2"><span className="text-slate-400">Assigned</span><span className="text-blue-300">{assigned.length}</span></div>
+          <div className="flex justify-between border-b border-slate-800 pb-2"><span className="text-slate-400">Completed</span><span className="text-emerald-300">{completed.length}</span></div>
+          <div className="flex justify-between"><span className="text-slate-400">Disputed</span><span className="text-rose-300">{disputed.length}</span></div>
+        </div>
+      </div>
+    </div>
+  )
+}
+
+function SharedTabPanels({ tab, events, wallet, jobs, jobsDesc, assigned, completed, disputed }) {
+  if (tab === 'request') return <JobRequestTab />
+  if (tab === 'wallet') return <WalletPanel wallet={wallet} />
+  if (tab === 'prime') return <PrimeContractTab wallet={wallet} jobs={jobs} />
+  if (tab === 'workflows') return <GitHubFlows />
+  if (tab === 'events') {
+    return (
+      <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
+        <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Event log</div>
+        <EventLog events={events} />
+      </div>
+    )
+  }
+  if (tab === 'visuals') {
+    return <VisualsTab jobsDesc={jobsDesc} assigned={assigned} completed={completed} disputed={disputed} />
+  }
+  return null
+}
+
+function ClassicMissionControl(props) {
+  const { loading, error, jobsDesc, assigned, completed, disputed, selected, setTab, tab, handleSelectJob, events, wallet, jobs } = props
+
+  return (
+    <div className="px-4 py-3 mt-8 md:mt-0">
+      <div className="grid grid-cols-4 gap-2 mb-4">
+        <MetricCard label="Total" value={loading ? '—' : jobsDesc.length} />
+        <MetricCard label="Assigned" value={loading ? '—' : assigned.length} color="text-blue-400" />
+        <MetricCard label="Done" value={loading ? '—' : completed.length} color="text-green-400" />
+        <MetricCard label="Disputed" value={loading ? '—' : disputed.length} color="text-red-400" />
+      </div>
+
+      <div className="flex gap-1 mb-4 border-b border-slate-800 overflow-x-auto">
+        {['jobs', selected ? 'detail' : null, 'request', 'wallet', 'prime', 'workflows', 'events', 'test'].filter(Boolean).map(t => (
+          <button
+            key={t}
+            onClick={() => setTab(t)}
+            className={`px-3 py-2 text-xs capitalize transition-colors border-b-2 -mb-px whitespace-nowrap ${
+              tab === t ? 'text-white border-blue-500' : 'text-slate-500 border-transparent hover:text-slate-300'
+            }`}
+          >
+            {t}
+          </button>
+        ))}
+      </div>
+
+      {tab === 'jobs' && (
+        <div className="space-y-2">
+          {loading && <div className="text-slate-600 text-xs text-center py-8">Loading...</div>}
+          {error && <div className="text-red-400 text-xs p-3 bg-red-950/30 rounded-lg border border-red-900">{error}</div>}
+          {jobsDesc.map(j => (
+            <JobCard key={j.jobId} job={j} selected={selected?.jobId === j.jobId} onClick={() => handleSelectJob(j)} />
+          ))}
+        </div>
+      )}
+
+      {tab === 'detail' && (
+        <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
+          <button onClick={() => setTab('jobs')} className="text-xs text-slate-500 mb-3 flex items-center gap-1 hover:text-slate-300">← back to jobs</button>
+          <JobDetail job={selected} onRunIntake={() => {}} />
+        </div>
+      )}
+
+      {tab === 'test' && <TestTab />}
+      <SharedTabPanels tab={tab} events={events} wallet={wallet} jobs={jobs} jobsDesc={jobsDesc} assigned={assigned} completed={completed} disputed={disputed} />
+    </div>
+  )
+}
+
+function CompactMissionControl(props) {
+  const { loading, error, jobsDesc, assigned, completed, disputed, selected, setTab, tab, handleSelectJob, events, wallet, jobs } = props
+  const menuTabs = ['jobs', 'request', 'wallet', 'prime', 'workflows', 'events', 'visuals']
+
+  return (
+    <div className="p-3 md:p-4 mt-8 md:mt-0">
+      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-3">
+        <aside className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 h-fit lg:sticky lg:top-4">
+          <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500 mb-2">Mission Menu</div>
+          <div className="space-y-1">
+            {menuTabs.map(item => (
+              <button key={item} onClick={() => setTab(item)} className={`w-full text-left px-3 py-2 rounded-lg text-xs ${tab === item ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
+                {item}
+              </button>
             ))}
           </div>
-        )}
+        </aside>
 
-        {tab === 'detail' && (
-          <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
-            <button onClick={() => setTab('jobs')} className="text-xs text-slate-500 mb-3 flex items-center gap-1 hover:text-slate-300">← back to jobs</button>
-            <JobDetail job={selected} onRunIntake={() => {}} />
-          </div>
-        )}
+        <main className="space-y-3">
+          <section className="grid grid-cols-2 xl:grid-cols-4 gap-2">
+            <MetricCard label="Total" value={loading ? '—' : jobsDesc.length} />
+            <MetricCard label="Assigned" value={loading ? '—' : assigned.length} color="text-blue-400" />
+            <MetricCard label="Done" value={loading ? '—' : completed.length} color="text-emerald-400" />
+            <MetricCard label="Disputed" value={loading ? '—' : disputed.length} color="text-rose-400" />
+          </section>
+
+          {tab === 'jobs' && (
+            <section className="grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr] gap-3">
+              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
+                <div className="space-y-2 max-h-[62vh] overflow-y-auto pr-1">
+                  {jobsDesc.map(j => <JobCard key={j.jobId} job={j} selected={selected?.jobId === j.jobId} onClick={() => handleSelectJob(j)} />)}
+                </div>
+              </div>
+              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
+                {loading && <div className="text-slate-600 text-xs text-center py-8">Loading queue…</div>}
+                {error && <div className="text-red-400 text-xs p-3 bg-red-950/30 rounded-lg border border-red-900 mb-2">{error}</div>}
+                <JobDetail job={selected} onRunIntake={() => {}} />
+              </div>
+            </section>
+          )}
+
+          <SharedTabPanels tab={tab} events={events} wallet={wallet} jobs={jobs} jobsDesc={jobsDesc} assigned={assigned} completed={completed} disputed={disputed} />
+        </main>
+      </div>
+    </div>
+  )
+}
 
+function ProMissionControl(props) {
+  const { loading, error, jobsDesc, assigned, completed, disputed, selected, setTab, tab, handleSelectJob, events, wallet, jobs } = props
+  const tabs = ['jobs', 'request', 'wallet', 'prime', 'workflows', 'events', 'visuals']
 
-        {tab === 'request' && <JobRequestTab />}
+  return (
+    <div className="px-4 py-4 space-y-4 mt-8 md:mt-0">
+      <section className="rounded-xl border border-slate-800 bg-gradient-to-r from-slate-900 to-slate-950 p-4">
+        <p className="text-xs uppercase tracking-[0.2em] text-blue-300">Command Overview</p>
+        <h2 className="text-lg font-semibold text-white">Mission Control Professional View</h2>
+      </section>
 
-        {tab === 'wallet' && <WalletPanel wallet={wallet} />}
-        {tab === 'prime' && <PrimeContractTab wallet={wallet} jobs={jobs} />}
+      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
+        <MetricCard label="Total Jobs" value={loading ? '—' : jobsDesc.length} />
+        <MetricCard label="In Progress" value={loading ? '—' : assigned.length} color="text-blue-400" />
+        <MetricCard label="Completed" value={loading ? '—' : completed.length} color="text-emerald-400" />
+        <MetricCard label="Disputes" value={loading ? '—' : disputed.length} color="text-rose-400" />
+      </div>
 
-        {tab === 'workflows' && <GitHubFlows />}
+      <div className="flex flex-wrap gap-2">
+        {tabs.map(tabValue => (
+          <button key={tabValue} onClick={() => setTab(tabValue)} className={`px-3 py-1.5 rounded-full text-xs border ${tab === tabValue ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'}`}>
+            {tabValue}
+          </button>
+        ))}
+      </div>
 
-        {tab === 'events' && (
-          <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
-            <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Event log</div>
-            <EventLog events={events} />
+      {tab === 'jobs' && (
+        <section className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-4">
+          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-2 max-h-[65vh] overflow-y-auto">
+            {error && <div className="text-red-400 text-xs p-3 bg-red-950/30 rounded-lg border border-red-900">{error}</div>}
+            {jobsDesc.map(j => <JobCard key={j.jobId} job={j} selected={selected?.jobId === j.jobId} onClick={() => handleSelectJob(j)} />)}
           </div>
-        )}
+          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
+            <JobDetail job={selected} onRunIntake={() => {}} />
+          </div>
+        </section>
+      )}
 
-        {tab === 'test' && <TestTab />}
+      <SharedTabPanels tab={tab} events={events} wallet={wallet} jobs={jobs} jobsDesc={jobsDesc} assigned={assigned} completed={completed} disputed={disputed} />
+    </div>
+  )
+}
+
+function BoardMissionControl(props) {
+  const { jobsDesc, selected, handleSelectJob, assigned, completed, disputed, setTab, tab, events, wallet, jobs } = props
+  const other = jobsDesc.filter(j => !['Assigned', 'Completed', 'Disputed'].includes(j.status))
+  const columns = [
+    { label: 'Assigned', items: assigned },
+    { label: 'Completed', items: completed },
+    { label: 'Disputed', items: disputed },
+    { label: 'Other', items: other },
+  ]
+
+  if (tab !== 'jobs') {
+    return (
+      <div className="px-4 py-4 mt-8 md:mt-0 space-y-3">
+        <div className="flex gap-2 flex-wrap">
+          {['jobs', 'request', 'wallet', 'prime', 'workflows', 'events', 'visuals'].map(item => (
+            <button key={item} onClick={() => setTab(item)} className={`px-3 py-1 text-xs rounded border ${tab === item ? 'bg-blue-600 border-blue-500 text-white' : 'border-slate-700 text-slate-300'}`}>{item}</button>
+          ))}
+        </div>
+        <SharedTabPanels tab={tab} events={events} wallet={wallet} jobs={jobs} jobsDesc={jobsDesc} assigned={assigned} completed={completed} disputed={disputed} />
       </div>
+    )
+  }
+
+  return (
+    <div className="px-3 py-4 mt-8 md:mt-0">
+      <div className="grid grid-cols-1 lg:grid-cols-4 gap-2">
+        {columns.map(col => (
+          <div key={col.label} className="rounded-xl border border-slate-800 bg-slate-900/70 p-2">
+            <div className="text-xs text-slate-300 mb-2 flex justify-between"><span>{col.label}</span><span>{col.items.length}</span></div>
+            <div className="space-y-2 max-h-[70vh] overflow-y-auto">
+              {col.items.map(j => <JobCard key={j.jobId} job={j} selected={selected?.jobId === j.jobId} onClick={() => handleSelectJob(j)} />)}
+            </div>
+          </div>
+        ))}
+      </div>
+    </div>
+  )
+}
+
+export default function App() {
+  const { jobs, loading, error, countdown, events, refetch } = useJobs()
+  const [selected, setSelected] = useState(null)
+  const [tab, setTab] = useState('jobs')
+  const [activeVersion, setActiveVersion] = useState('v2')
+  const wallet = useWallet()
+
+  const assigned = useMemo(() => jobs.filter(j => j.status === 'Assigned'), [jobs])
+  const completed = useMemo(() => jobs.filter(j => j.status === 'Completed'), [jobs])
+  const disputed = useMemo(() => jobs.filter(j => j.status === 'Disputed'), [jobs])
+  const jobsDesc = useMemo(() => [...jobs].sort(compareJobIdDesc), [jobs])
+
+  function handleSelectJob(job) {
+    setSelected(job)
+    if (activeVersion === 'v1' && window.innerWidth < 768) setTab('detail')
+    if (activeVersion !== 'v1') setTab('jobs')
+  }
+
+  const viewProps = {
+    loading,
+    error,
+    jobsDesc,
+    assigned,
+    completed,
+    disputed,
+    selected,
+    setTab,
+    tab,
+    handleSelectJob,
+    events,
+    wallet,
+    jobs,
+  }
+
+  const viewByVersion = {
+    v1: <ClassicMissionControl {...viewProps} />,
+    v2: <CompactMissionControl {...viewProps} />,
+    v3: <ProMissionControl {...viewProps} />,
+    v4: <BoardMissionControl {...viewProps} />,
+  }
+
+  return (
+    <div className="min-h-screen bg-slate-950 text-slate-200 relative">
+      <Header
+        countdown={countdown}
+        error={error}
+        refetch={refetch}
+        activeVersion={activeVersion}
+        onSelectVersion={setActiveVersion}
+      />
+      {viewByVersion[activeVersion]}
     </div>
   )
 }
