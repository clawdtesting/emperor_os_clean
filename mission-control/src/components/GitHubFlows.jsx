import { useState, useEffect } from 'react'

const REPO      = 'https://github.com/clawdtesting/emperor_os_clean'
const GH_API    = 'https://api.github.com/repos/clawdtesting/emperor_os_clean/actions/workflows'
const RENDER_URL = 'https://emperor-os.onrender.com'

// ── Helpers ───────────────────────────────────────────────────────────────────
function secsUntilNextCron(intervalMin) {
  const now  = new Date()
  const mins = now.getMinutes()
  const secs = now.getSeconds()
  const minsIntoInterval = mins % intervalMin
  return (intervalMin - minsIntoInterval) * 60 - secs
}

function fmtSecs(s) {
  const m = Math.floor(s / 60)
  const r = s % 60
  return m > 0 ? `${m}m ${String(r).padStart(2,'0')}s` : `${r}s`
}

function timeAgo(iso) {
  if (!iso) return '—'
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (diff < 60)  return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`
  return `${Math.floor(diff/3600)}h ago`
}

// ── Run status badge ──────────────────────────────────────────────────────────
function RunBadge({ run }) {
  if (!run) return <span className="text-xs text-slate-600 font-mono">no data</span>

  const { status, conclusion } = run

  if (status === 'in_progress') return (
    <span className="flex items-center gap-1 text-xs font-mono text-blue-400">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse inline-block" />
      running
    </span>
  )
  if (status === 'queued') return (
    <span className="text-xs font-mono text-amber-400">queued</span>
  )
  if (conclusion === 'success') return (
    <span className="flex items-center gap-1 text-xs font-mono text-green-400">
      <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
      success
    </span>
  )
  if (conclusion === 'failure') return (
    <span className="flex items-center gap-1 text-xs font-mono text-red-400">
      <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
      failed
    </span>
  )
  return <span className="text-xs font-mono text-slate-500">{conclusion || status}</span>
}

// ── Cron countdown ────────────────────────────────────────────────────────────
function CronCountdown({ intervalMin, label }) {
  const [secs, setSecs] = useState(() => secsUntilNextCron(intervalMin))

  useEffect(() => {
    const t = setInterval(() => setSecs(secsUntilNextCron(intervalMin)), 1000)
    return () => clearInterval(t)
  }, [intervalMin])

  return (
    <div className="flex items-center justify-between text-xs font-mono">
      <span className="text-slate-600">{label}</span>
      <span className="text-amber-400 tabular-nums">{fmtSecs(secs)}</span>
    </div>
  )
}

// ── Autonomous workflow card ───────────────────────────────────────────────────
function AutonomousCard() {
  const [run, setRun]         = useState(null)
  const [loading, setLoading] = useState(true)
  const [secs, setSecs]       = useState(() => secsUntilNextCron(15))

  useEffect(() => {
    async function fetchRun() {
      try {
        const res  = await fetch(`${GH_API}/autonomous.yml/runs?per_page=1`, {
          headers: { Accept: 'application/vnd.github+json' },
        })
        const data = await res.json()
        setRun(data.workflow_runs?.[0] || null)
      } catch {}
      finally { setLoading(false) }
    }
    fetchRun()
    const t = setInterval(fetchRun, 30000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const t = setInterval(() => setSecs(secsUntilNextCron(15)), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
            <span className="text-xs font-semibold text-slate-200">Autonomous Agent Loop</span>
          </div>
          <div className="text-xs text-slate-500">list_jobs → score → apply → work → submit</div>
        </div>
        <a
          href={`${REPO}/actions/workflows/autonomous.yml`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-slate-600 hover:text-slate-400 shrink-0"
        >
          ↗ runs
        </a>
      </div>

      <div className="space-y-2 border-t border-slate-800 pt-3">
        {/* Last run status */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-600 font-mono">last run</span>
          <div className="flex items-center gap-2">
            {loading ? (
              <span className="text-slate-600 font-mono">loading...</span>
            ) : (
              <>
                <RunBadge run={run} />
                <span className="text-slate-600 font-mono">{timeAgo(run?.updated_at)}</span>
              </>
            )}
          </div>
        </div>

        {/* Next run countdown */}
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-600">next run</span>
          <span className="text-green-400 tabular-nums">{fmtSecs(secs)}</span>
        </div>

        {/* Run link */}
        {run && (
          <a
            href={run.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-xs text-slate-600 hover:text-blue-400 font-mono truncate"
          >
            #{run.run_number} · {run.name}
          </a>
        )}
      </div>
    </div>
  )
}

// ── Keep-alive card ────────────────────────────────────────────────────────────
function KeepAliveCard() {
  const [run, setRun]     = useState(null)
  const [online, setOnline] = useState(null)

  useEffect(() => {
    async function check() {
      try {
        const [ghRes, hRes] = await Promise.all([
          fetch(`${GH_API}/keepalive.yml/runs?per_page=1`, { headers: { Accept: 'application/vnd.github+json' } }),
          fetch(`${RENDER_URL}/health`, { signal: AbortSignal.timeout(5000) }),
        ])
        const gh = await ghRes.json()
        setRun(gh.workflow_runs?.[0] || null)
        setOnline(hRes.ok)
      } catch { setOnline(false) }
    }
    check()
    const t = setInterval(check, 30000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${online === null ? 'bg-slate-600' : online ? 'bg-blue-400 animate-pulse' : 'bg-red-400'}`} />
            <span className="text-xs font-semibold text-slate-200">Keep-Alive Ping</span>
            {online !== null && (
              <span className={`text-xs font-mono ${online ? 'text-blue-400' : 'text-red-400'}`}>
                · render {online ? 'online' : 'offline'}
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500">Pings emperor-os.onrender.com/health</div>
        </div>
        <a
          href={`${REPO}/actions/workflows/keepalive.yml`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-slate-600 hover:text-slate-400 shrink-0"
        >
          ↗ runs
        </a>
      </div>

      <div className="space-y-2 border-t border-slate-800 pt-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-600 font-mono">last ping</span>
          <div className="flex items-center gap-2">
            <RunBadge run={run} />
            <span className="text-slate-600 font-mono">{timeAgo(run?.updated_at)}</span>
          </div>
        </div>
        <CronCountdown intervalMin={12} label="next ping" />
      </div>
    </div>
  )
}

// ── Static manual workflow card ────────────────────────────────────────────────
function ManualCard({ name, label, desc }) {
  const [run, setRun] = useState(null)

  useEffect(() => {
    fetch(`${GH_API}/${name}/runs?per_page=1`, { headers: { Accept: 'application/vnd.github+json' } })
      .then(r => r.json())
      .then(d => setRun(d.workflow_runs?.[0] || null))
      .catch(() => {})
  }, [name])

  return (
    <a
      href={`${REPO}/actions/workflows/${name}`}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-slate-900 rounded-lg border border-slate-800 p-4 hover:border-slate-600 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-200">{label}</span>
          </div>
          <div className="text-xs text-slate-500 mb-2">{desc}</div>
          <code className="text-xs text-slate-600 font-mono">{name}</code>
        </div>
        <div className="text-right shrink-0 space-y-1">
          <div className="text-xs font-mono text-amber-400">manual</div>
          {run && <RunBadge run={run} />}
          {run && <div className="text-xs text-slate-600 font-mono">{timeAgo(run.updated_at)}</div>}
        </div>
      </div>
    </a>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function GitHubFlows() {
  const [agent, setAgent] = useState(null)
  useEffect(() => {
    fetch('/api/agent').then(r => r.json()).then(setAgent).catch(() => {})
  }, [])

  return (
    <div className="space-y-3">
      <AutonomousCard />
      <KeepAliveCard />
      <ManualCard name="test_01.yml" label="Test 01 — Smart Contract Explainer" desc="Simulate full job flow: pin spec → claude → pin deliverable → pin metadata" />
      <ManualCard name="test_02.yml" label="Test 02" desc="Second test job simulation" />

      <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
        <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Agent identity</div>
        <div className="space-y-1 text-xs font-mono text-slate-400">
          <div><span className="text-slate-600">ens   </span> <span className="text-blue-400">{agent?.ens || '—'}</span></div>
          <div><span className="text-slate-600">chain </span> <span>{agent?.chain || 'Base Sepolia'}</span></div>
          <div><span className="text-slate-600">infra </span> <span>{agent?.infra || 'GitHub Actions + Render'}</span></div>
        </div>
      </div>
    </div>
  )
}
