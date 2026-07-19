import { useState, useEffect, useRef } from 'react'
import { FileText, Download, Eye, Folder, ChevronRight, ChevronDown, Trash } from 'lucide-react'
import { api } from '../api'

function parseEmail(raw) {
  const lines = raw.split('\n')
  let to = '', subject = '', bodyStart = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('TO:')) to = lines[i].slice(3).trim()
    else if (lines[i].startsWith('SUBJECT:')) subject = lines[i].slice(8).trim()
    else if (lines[i].startsWith('───') || lines[i].startsWith('---')) { bodyStart = i + 1; break }
  }
  const html = bodyStart >= 0 ? lines.slice(bodyStart).join('\n') : raw
  return { to, subject, html }
}

export function PreviewModal({ file, onClose }) {
  const [emailData, setEmailData] = useState(null)
  const [loading, setLoading] = useState(true)
  const isEmail = file?.name?.endsWith('.txt')
  const isPdf = file?.name?.endsWith('.pdf')

  useEffect(() => {
    if (!file) return
    if (isEmail) {
      setLoading(true)
      api.previewText(file.path).then(raw => {
        setEmailData(parseEmail(raw))
        setLoading(false)
      }).catch(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [file])

  if (!file) return null

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div>
            <div style={styles.modalTitle}>{file.name}</div>
            {isEmail && emailData && (
              <div style={styles.modalMeta}>
                <span style={styles.metaTag}>To: {emailData.to}</span>
                <span style={styles.metaTag}>Subject: {emailData.subject}</span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <a href={api.outputUrl(file.path)} download style={styles.dlBtn}>
              <Download size={14} /> Download
            </a>
            <button style={styles.closeBtn} onClick={onClose}>✕</button>
          </div>
        </div>
        <div style={styles.modalBody}>
          {loading && <div style={styles.center}>Loading…</div>}
          {!loading && isPdf && (
            <iframe
              src={api.outputUrl(file.path)}
              style={{ width: '100%', height: '100%', border: 'none', borderRadius: 8 }}
              title="PDF Preview"
            />
          )}
          {!loading && isEmail && emailData && (
            <iframe
              srcDoc={emailData.html}
              sandbox="allow-same-origin"
              style={{ width: '100%', height: '100%', border: 'none', borderRadius: 8, background: '#fff' }}
              title="Email Preview"
            />
          )}
          {!loading && !isPdf && !isEmail && (
            <div style={styles.center}>Preview not available for this file type.</div>
          )}
        </div>
      </div>
    </div>
  )
}

function FileNode({ node, onPreview, onDeleteDir, isHighlighted }) {
  const [open, setOpen] = useState(Boolean(isHighlighted))

  useEffect(() => {
    if (isHighlighted) setOpen(true)
  }, [isHighlighted])
  
  const containerStyle = {
    marginBottom: 6,
    padding: isHighlighted ? '4px 6px' : 0,
    background: isHighlighted ? 'rgba(99,102,241,.15)' : 'transparent',
    border: isHighlighted ? '1px solid rgba(99,102,241,.3)' : '1px solid transparent',
    borderRadius: 8,
    transition: 'all 0.3s ease'
  }

  if (node.type === 'dir') {
    return (
      <div id={"dir-" + node.name} style={containerStyle}>
        <div style={{ ...styles.dirRow, justifyContent: 'space-between' }}>
          <div onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <Folder size={14} style={{ color: '#f59e0b' }} />
            <span style={{ fontWeight: 600 }}>{node.name}</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              style={styles.iconBtn}
              title="Delete this folder"
              onClick={(e) => { e.stopPropagation(); onDeleteDir?.(node) }}
            >
              <Trash size={13} />
            </button>
          </div>
        </div>
        {open && node.children?.length > 0 && (
          <div style={{ paddingLeft: 20, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {node.children.map(c => <FileNode key={c.path} node={c} onPreview={onPreview} onDeleteDir={onDeleteDir} />)}
          </div>
        )}
      </div>
    )
  }
  const canPreview = node.name.endsWith('.pdf') || node.name.endsWith('.txt')
  return (
    <div style={styles.fileRow}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8', fontSize: 13 }}>
        <FileText size={13} style={{ color: node.name.endsWith('.pdf') ? '#f87171' : '#64748b' }} />
        {node.name}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {canPreview && (
          <button style={styles.iconBtn} onClick={() => onPreview(node)} title="Preview">
            <Eye size={13} />
          </button>
        )}
        <a href={api.outputUrl(node.path)} download style={styles.iconBtn} title="Download">
          <Download size={13} />
        </a>
      </div>
    </div>
  )
}

function safeName(s) {
  if (!s) return ''
  return s.replace(/[^\w-]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '')
}

export function OutputsBrowser({ selectedRow }) {
  const [tree, setTree] = useState([])
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    api.getOutputs().then(t => { setTree(t); setLoading(false) }).catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const highlightName = selectedRow ? `${safeName(selectedRow.company)}_${safeName(selectedRow.post)}` : null
  const fuzzyHighlight = selectedRow ? safeName(selectedRow.company) : null

  const handleDeleteDir = async (dirNode) => {
    if (!dirNode?.path) return
    const ok = confirm(`Delete folder "${dirNode.name}" and all its files? This cannot be undone.`)
    if (!ok) return
    try {
      await api.deleteOutput(dirNode.path)
      load()
    } catch (e) {
      alert(`Failed to delete: ${e}`)
    }
  }

  // Scroll to highlighted node when selectedRow changes
  useEffect(() => {
    if (!selectedRow || tree.length === 0) return
    
    // Find matching directory name
    let targetName = null
    for (const node of tree) {
      if (node.type === 'dir') {
        if (node.name === highlightName || node.name.startsWith(fuzzyHighlight)) {
          targetName = node.name
          break
        }
      }
    }

    if (targetName) {
      const el = document.getElementById("dir-" + targetName)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [selectedRow, tree, highlightName, fuzzyHighlight])


  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <span style={styles.cardTitle}>Output Files</span>
        <button style={styles.smBtn} onClick={load}>↺ Refresh</button>
      </div>
      <div style={{ padding: '16px 20px', minHeight: 120 }}>
        {loading && <div style={styles.muted}>Loading…</div>}
        {!loading && tree.length === 0 && <div style={styles.muted}>No outputs yet — run the pipeline first.</div>}
        {!loading && tree.map(n => {
          const isHighlighted = n.type === 'dir' && (n.name === highlightName || (fuzzyHighlight && n.name.startsWith(fuzzyHighlight)))
          return <FileNode key={n.path} node={n} onPreview={setPreview} onDeleteDir={handleDeleteDir} isHighlighted={isHighlighted} />
        })}
      </div>
      <PreviewModal file={preview} onClose={() => setPreview(null)} />
    </div>
  )
}

const styles = {
  card: { background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, overflow: 'hidden' },
  cardHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', background: 'rgba(255,255,255,.04)', borderBottom: '1px solid rgba(255,255,255,.08)' },
  cardTitle: { fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.6px' },
  smBtn: { fontSize: 12, padding: '4px 10px', background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 6, color: '#94a3b8', cursor: 'pointer' },
  dirRow: { display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', borderRadius: 6, cursor: 'pointer', color: '#e2e8f0', fontSize: 13, userSelect: 'none' },
  fileRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', borderRadius: 6, fontSize: 13 },
  iconBtn: { display: 'inline-flex', alignItems: 'center', padding: '3px 7px', background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 5, color: '#94a3b8', cursor: 'pointer', textDecoration: 'none', fontSize: 12 },
  muted: { color: '#64748b', fontSize: 13, fontStyle: 'italic' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modal: { background: '#111827', border: '1px solid rgba(255,255,255,.12)', borderRadius: 14, width: '90vw', maxWidth: 960, height: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,.6)' },
  modalHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.03)', flexShrink: 0 },
  modalTitle: { fontWeight: 600, fontSize: 14, color: '#e2e8f0', marginBottom: 6 },
  modalMeta: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  metaTag: { fontSize: 11, padding: '2px 8px', background: 'rgba(99,102,241,.15)', color: '#818cf8', borderRadius: 4 },
  modalBody: { flex: 1, overflow: 'hidden', padding: 16 },
  dlBtn: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: 'rgba(99,102,241,.2)', border: '1px solid rgba(99,102,241,.4)', borderRadius: 7, color: '#818cf8', fontSize: 12, textDecoration: 'none', cursor: 'pointer' },
  closeBtn: { padding: '6px 10px', background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 7, color: '#94a3b8', cursor: 'pointer', fontSize: 14 },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' },
}
