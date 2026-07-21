import { useState, useRef, useEffect } from 'react'
import { Play, Loader, Building2, ListFilter, FileText, Mail, Terminal, Trash2 } from 'lucide-react'
import { api } from '../api'

export function RunPanel({ onRunComplete }) {
  const [company, setCompany] = useState('')
  const [limit, setLimit] = useState(0)
  const [compilePdf, setCompilePdf] = useState(false)
  const [send, setSend] = useState(false)
  const [running, setRunning] = useState(false)
  const [logs, setLogs] = useState([])
  const [status, setStatus] = useState('idle') // idle | running | done | error
  const logRef = useRef(null)
  const stopSSE = useRef(null)

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [logs])

  const run = async () => {
    setRunning(true)
    setLogs([])
    setStatus('running')
    try {
      const { job_id } = await api.runPipeline({
        company_filter: company,
        limit: Number(limit),
        compile_pdf: compilePdf,
        send,
      })
      stopSSE.current = api.streamLogs(
        job_id,
        (line) => setLogs(l => [...l, { text: line, cls: classifyLine(line) }]),
        (finalStatus) => {
          setStatus(finalStatus)
          setRunning(false)
          onRunComplete?.()
        }
      )
    } catch (e) {
      setLogs(l => [...l, { text: `❌ ${e.message}`, cls: 'error' }])
      setStatus('error')
      setRunning(false)
    }
  }

  const classifyLine = (line) => {
    if (line.includes('ERROR') || line.startsWith('❌')) return 'error'
    if (line.includes('WARN')) return 'warn'
    if (line.startsWith('✅') || line.includes('Done.')) return 'done'
    return 'info'
  }

  const logColors = { info: '#94a3b8', error: '#f87171', warn: '#fbbf24', done: '#4ade80' }
  const badgeColor = { idle: '#64748b', running: '#f59e0b', done: '#22c55e', error: '#ef4444' }

  return (
    <div style={s.card}>
      <div style={s.header}>
        <span style={s.title}><Play size={12} /> Run Applications</span>
        <span style={{ ...s.badge, color: badgeColor[status] }}>● {status}</span>
      </div>
      <div style={s.body}>
        <div style={s.field}>
          <label style={s.label}><Building2 size={13} /> Company</label>
          <input style={s.input} value={company} onChange={e => setCompany(e.target.value)}
            placeholder="All companies" disabled={running} />
        </div>
        <div style={s.field}>
          <label style={s.label}><ListFilter size={13} /> Number to process (0 = all)</label>
          <input style={s.input} type="number" min={0} value={limit}
            onChange={e => setLimit(e.target.value)} disabled={running} />
        </div>
        <div style={s.checkRow}>
          <input type="checkbox" id="chk-pdf" checked={compilePdf}
            onChange={e => setCompilePdf(e.target.checked)} disabled={running} />
          <label htmlFor="chk-pdf" style={s.checkLabel}><FileText size={14} /> Create PDF</label>
        </div>
        <div style={{ ...s.checkRow, marginBottom: 18 }}>
          <input type="checkbox" id="chk-send" checked={send}
            onChange={e => setSend(e.target.checked)} disabled={running} />
          <label htmlFor="chk-send" style={s.checkLabel}><Mail size={14} /> Send emails</label>
        </div>

        <button style={{ ...s.runBtn, opacity: running ? .5 : 1 }} disabled={running} onClick={run}>
          {running ? <Loader size={16} style={{ animation: 'spin .7s linear infinite' }} /> : <Play size={16} />}
          {running ? 'Running…' : 'Start'}
        </button>

        <div style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <label style={s.label}><Terminal size={13} /> Activity</label>
            <button style={s.smBtn} onClick={() => setLogs([])} title="Clear activity"><Trash2 size={12} /> Clear</button>
          </div>
          <div ref={logRef} style={s.terminal}>
            {logs.length === 0
              ? <span style={{ color: '#475569', fontStyle: 'italic' }}>No run started yet.</span>
              : logs.map((l, i) => (
                  <div key={i} style={{ color: logColors[l.cls], lineHeight: 1.7, wordBreak: 'break-all' }}>
                    {l.text}
                  </div>
                ))
            }
          </div>
        </div>
      </div>
    </div>
  )
}

const s = {
  card: { background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, overflow: 'hidden' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', background: 'rgba(255,255,255,.04)', borderBottom: '1px solid rgba(255,255,255,.08)' },
  title: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.6px' },
  badge: { fontSize: 12, fontWeight: 500 },
  body: { padding: 20 },
  field: { marginBottom: 14 },
  label: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, color: '#94a3b8', marginBottom: 5 },
  input: { width: '100%', padding: '8px 12px', background: '#0b0f1a', border: '1px solid rgba(255,255,255,.1)', borderRadius: 7, color: '#e2e8f0', fontSize: 13, fontFamily: 'inherit', outline: 'none' },
  checkRow: { display: 'flex', alignItems: 'center', gap: 9, padding: '6px 0' },
  checkLabel: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#e2e8f0', cursor: 'pointer' },
  runBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '10px 20px', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  smBtn: { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, padding: '3px 9px', background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 5, color: '#94a3b8', cursor: 'pointer' },
  terminal: { background: '#0d1117', borderRadius: 8, fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 11, height: 280, overflowY: 'auto', padding: 12, border: '1px solid rgba(255,255,255,.08)', display: 'flex', flexDirection: 'column', gap: 1 },
}
