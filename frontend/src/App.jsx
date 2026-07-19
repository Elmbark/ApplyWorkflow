import { useState, useCallback } from 'react'
import { JobsTable } from './components/JobsTable'
import { RunPanel } from './components/RunPanel'
import { OutputsBrowser } from './components/OutputsBrowser'
import { ConfigButton, ConfigPanel } from './components/ConfigPanel'
import logo from './assets/logo.svg'

export default function App() {
  // When a run completes, bump this counter so OutputsBrowser re-fetches
  const [refreshKey, setRefreshKey] = useState(0)
  const onRunComplete = useCallback(() => setRefreshKey(k => k+1), [])

  const [selectedRow, setSelectedRow] = useState(null)
  const [configOpen, setConfigOpen] = useState(false)  

  return (
    <div style={s.root}>
      {/* Nav */}
      <nav style={s.nav}>
        <div style={s.brand}>
          <img src={logo} alt="Logo" style={{ width: 20, height: 20 }} />
          <span>Apply Workflow</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={s.navNote}>Job Application Automation</span>
          <ConfigButton onClick={() => setConfigOpen(true)} /> 
        </div>
      </nav>

      {/* Grid */}
      <main style={s.grid}>
        {/* Left column */}
        <div style={s.left}>
          <JobsTable onRowClick={setSelectedRow} />
          <OutputsBrowser key={refreshKey} selectedRow={selectedRow} />
        </div>
        {/* Right column — run panel */}
        <div style={s.right}>
          <RunPanel onRunComplete={onRunComplete} />
        </div>
      </main>
      {configOpen && <ConfigPanel onClose={() => setConfigOpen(false)} />} 
    </div>
  )
}

const s = {
  root: { minHeight: '100vh', background: '#0b0f1a', color: '#e2e8f0', fontFamily: "'Inter', sans-serif" },
  nav: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 28px', height: 58,
    background: 'rgba(11,15,26,.85)', backdropFilter: 'blur(16px)',
    borderBottom: '1px solid rgba(255,255,255,.08)',
    position: 'sticky', top: 0, zIndex: 50,
  },
  brand: { display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 16, letterSpacing: '-.3px' },
  navNote: { fontSize: 12, color: '#475569' },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 360px',
    gap: 20,
    padding: '24px 28px',
    maxWidth: 1360,
    margin: '0 auto',
  },
  left: { display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 },
  right: { position: 'sticky', top: 78, alignSelf: 'flex-start' },
}
