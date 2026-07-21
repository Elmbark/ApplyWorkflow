import { useState, useEffect, Fragment, useRef } from 'react'
import { Plus, X, Pencil, Trash2, Check, Upload, Download } from 'lucide-react'
import { api } from '../api'

const PER_PAGE = 12
const EMPTY_FORM = { company: '', post: '', to_email: '', keywords: '', description: '' }

export function JobsTable({ onRowClick }) {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)

  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [processingRow, setProcessingRow] = useState(null)
  const [editingRow, setEditingRow] = useState(null)
  const [editForm, setEditForm] = useState(EMPTY_FORM)
  const [importing, setImporting] = useState(false)
  const [notice, setNotice] = useState('')
  const fileInput = useRef(null)

  const load = () => {
    setLoading(true); setError('')
    api.getJobs()
      .then(j => {
        setJobs(j)
        setLoading(false)
        setPage(prev => {
          const total = Math.max(1, Math.ceil(j.length / PER_PAGE))
          return Math.min(prev, total)
        })
      })
      .catch(e => { setError(e.message); setLoading(false) })
  }
  useEffect(() => { load() }, [])

  const totalPages = Math.max(1, Math.ceil(jobs.length / PER_PAGE))
  const slice = jobs.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const updateForm = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setFormError('')
    setAdding(false)
  }

  const submitForm = async () => {
    if (!form.company.trim()) { setFormError('Company is required'); return }
    setSaving(true); setFormError('')
    try {
      await api.addJob(form)
      resetForm()
      setPage(1)
      load()
    } catch (e) {
      setFormError(e.message)
    }
    setSaving(false)
  }

  const startEdit = (row, e) => {
    e.stopPropagation()
    setEditingRow(row.excel_row)
    setEditForm({
      company: row.company || '',
      post: row.post || '',
      to_email: row.to_email || '',
      keywords: row.keywords || '',
      description: row.description || '',
    })
  }

  const updateEditForm = (k, v) => setEditForm(f => ({ ...f, [k]: v }))

  const cancelEdit = () => { setEditingRow(null); setEditForm(EMPTY_FORM) }

  const saveEdit = async (row) => {
    if (!editForm.company.trim()) { setError('Company is required'); return }
    setProcessingRow(row.excel_row)
    try {
      await api.updateJob(row.excel_row, editForm)
      setEditingRow(null)
      load()
    } catch (e2) {
      setError(e2.message)
    } finally {
      setProcessingRow(null)
    }
  }

  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setError('Please choose an .xlsx Excel file')
      return
    }
    setImporting(true); setError(''); setNotice('')
    try {
      const result = await api.importJobs(file)
      setNotice(`${result.imported} ${result.imported === 1 ? 'company' : 'companies'} imported`)
      setPage(1)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setImporting(false)
    }
  }

  const handleDelete = async (row, e) => {
    e.stopPropagation()
    if (!window.confirm(`Delete application for ${row.company}?`)) return

    setProcessingRow(row.excel_row)
    try {
      await api.deleteJob(row.excel_row)
      setPage(prev => {
        if (jobs.length <= 1) return 1
        const newCount = jobs.length - 1
        const total = Math.max(1, Math.ceil(newCount / PER_PAGE))
        return Math.min(prev, total)
      })
      load()
    } catch (e2) {
      setError(e2.message)
    } finally {
      setProcessingRow(null)
    }
  }

  return (
    <div style={s.card}>
      <div style={s.header}>
        <span style={s.title}>Company List</span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input ref={fileInput} type="file" accept=".xlsx" hidden onChange={handleImport} />
          <button style={s.smBtn} disabled={importing} onClick={() => fileInput.current?.click()} title="Append companies from Excel">
            <Upload size={12} /> {importing ? 'Importing…' : 'Import Excel'}
          </button>
          <a style={{ ...s.smBtn, textDecoration: 'none' }} href={api.exportJobsUrl} download>
            <Download size={12} /> Export Excel
          </a>
          <button style={s.smBtn} onClick={() => setAdding(a => !a)}>
            {adding ? <><X size={12} /> Cancel</> : <><Plus size={12} /> Add company</>}
          </button>
          <button style={s.smBtn} onClick={load}>↺ Refresh</button>
        </div>
      </div>

      {notice && <div style={s.notice}>✓ {notice}</div>}

      {adding && (
        <div style={s.form}>
          <div style={s.formGrid}>
            <input style={s.input} placeholder="Company *" value={form.company}
              onChange={e => updateForm('company', e.target.value)} />
            <input style={s.input} placeholder="Role" value={form.post}
              onChange={e => updateForm('post', e.target.value)} />
            <input style={s.input} placeholder="Email" value={form.to_email}
              onChange={e => updateForm('to_email', e.target.value)} />
            <input style={s.input} placeholder="Keywords (comma separated)" value={form.keywords}
              onChange={e => updateForm('keywords', e.target.value)} />
          </div>
          <textarea style={s.textarea} placeholder="Description" value={form.description}
            onChange={e => updateForm('description', e.target.value)} rows={3} />
          <div style={s.formActions}>
            {formError && <span style={s.formError}>⚠ {formError}</span>}
            <button style={{ ...s.saveBtn, opacity: saving ? .6 : 1 }} disabled={saving} onClick={submitForm}>
              {saving ? 'Adding…' : 'Add company'}
            </button>
          </div>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>#</th>
              <th style={s.th}>Company</th>
              <th style={s.th}>Role</th>
              <th style={s.th}>Email</th>
              <th style={s.th}>Keywords</th>
              <th style={{ ...s.th, width: 90, textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} style={s.center}><span style={s.spinner} />Loading…</td></tr>
            )}
            {!loading && error && (
              <tr><td colSpan={6} style={s.center}>⚠ {error}</td></tr>
            )}
            {!loading && !error && jobs.length === 0 && (
              <tr><td colSpan={6} style={s.center}>No rows found in applications.xlsx</td></tr>
            )}
            {!loading && slice.map((r, i) => (
              <Fragment key={r.excel_row ?? i}>
              <tr style={{ ...s.row, cursor: 'pointer' }} onClick={() => { if (editingRow !== r.excel_row) onRowClick?.(r) }}>
                <td style={{ ...s.td, color: '#64748b' }}>{(page - 1) * PER_PAGE + i + 1}</td>
                <td style={{ ...s.td, fontWeight: 600 }}>
                  {editingRow === r.excel_row ? (
                    <input
                      style={s.cellInput}
                      value={editForm.company}
                      onChange={e => updateEditForm('company', e.target.value)}
                      placeholder="Company"
                    />
                  ) : (
                    r.company
                  )}
                </td>
                <td style={s.td}>
                  {editingRow === r.excel_row ? (
                    <input
                      style={s.cellInput}
                      value={editForm.post}
                      onChange={e => updateEditForm('post', e.target.value)}
                      placeholder="Role"
                    />
                  ) : (
                    <span style={s.pill}>{r.post}</span>
                  )}
                </td>
                <td style={{ ...s.td, color: '#94a3b8', fontSize: 12 }}>
                  {editingRow === r.excel_row ? (
                    <input
                      style={s.cellInput}
                      value={editForm.to_email}
                      onChange={e => updateEditForm('to_email', e.target.value)}
                      placeholder="Email"
                    />
                  ) : (
                    r.to_email || '—'
                  )}
                </td>
                <td style={{ ...s.td, color: '#64748b', fontSize: 11, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {editingRow === r.excel_row ? (
                    <input
                      style={s.cellInput}
                      value={editForm.keywords}
                      onChange={e => updateEditForm('keywords', e.target.value)}
                      placeholder="keywords"
                    />
                  ) : (
                    r.keywords || '—'
                  )}
                </td>
                <td style={s.actionCell} onClick={e => e.stopPropagation()}>
                  {editingRow === r.excel_row ? (
                    <>
                      <button
                        type="button"
                        style={{ ...s.iconBtn, background: 'rgba(34,197,94,.12)', borderColor: 'rgba(34,197,94,.35)', color: '#86efac' }}
                        onClick={() => saveEdit(r)}
                        disabled={processingRow === r.excel_row}
                        title="Save"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        type="button"
                        style={s.iconBtn}
                        onClick={cancelEdit}
                        disabled={processingRow === r.excel_row}
                        title="Cancel"
                      >
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        style={s.iconBtn}
                        onClick={e => startEdit(r, e)}
                        disabled={processingRow === r.excel_row}
                        title="Edit row"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        style={{ ...s.iconBtn, ...s.iconBtnDanger, opacity: processingRow === r.excel_row ? .5 : 1 }}
                        onClick={e => handleDelete(r, e)}
                        disabled={processingRow === r.excel_row}
                        title="Delete row"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </td>
              </tr>
              {editingRow === r.excel_row && (
                <tr>
                  <td style={{ ...s.td, color: '#64748b' }}></td>
                  <td colSpan={4} style={{ ...s.td }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 11, color: '#64748b' }}>Description</label>
                      <textarea
                        style={s.textarea}
                        rows={3}
                        value={editForm.description}
                        onChange={e => updateEditForm('description', e.target.value)}
                        placeholder="Description"
                      />
                    </div>
                  </td>
                  <td style={s.actionCell}></td>
                </tr>
              )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div style={s.pagination}>
          <span style={{ fontSize: 12, color: '#64748b' }}>{jobs.length} rows</span>
          <button style={s.pageBtn} disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p2 => (
            <button key={p2} style={{ ...s.pageBtn, ...(p2 === page ? s.pageBtnActive : {}) }} onClick={() => setPage(p2)}>{p2}</button>
          ))}
          <button style={s.pageBtn} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
        </div>
      )}
    </div>
  )
}

const s = {
  card: { background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, overflow: 'hidden' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', background: 'rgba(255,255,255,.04)', borderBottom: '1px solid rgba(255,255,255,.08)' },
  title: { fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.6px' },
  smBtn: { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, padding: '4px 10px', background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 6, color: '#94a3b8', cursor: 'pointer' },
  notice: { padding: '8px 20px', fontSize: 12, color: '#86efac', background: 'rgba(34,197,94,.08)', borderBottom: '1px solid rgba(34,197,94,.15)' },
  form: { padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.02)', display: 'flex', flexDirection: 'column', gap: 10 },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  input: { padding: '8px 10px', background: '#0b0f1a', border: '1px solid rgba(255,255,255,.1)', borderRadius: 7, color: '#e2e8f0', fontSize: 13, fontFamily: 'inherit' },
  textarea: { padding: '8px 10px', background: '#0b0f1a', border: '1px solid rgba(255,255,255,.1)', borderRadius: 7, color: '#e2e8f0', fontSize: 13, fontFamily: 'inherit', resize: 'vertical' },
  formActions: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 },
  formError: { fontSize: 12, color: '#f87171' },
  saveBtn: { padding: '7px 16px', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '8px 14px', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.5px', borderBottom: '1px solid rgba(255,255,255,.08)', whiteSpace: 'nowrap' },
  td: { padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,.04)', color: '#e2e8f0' },
  row: { transition: 'background .1s' },
  actionCell: { padding: '6px 10px', borderBottom: '1px solid rgba(255,255,255,.04)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  iconBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 6, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.05)', color: '#94a3b8', cursor: 'pointer' },
  iconBtnDanger: { color: '#fca5a5', borderColor: 'rgba(248,113,113,.4)' },
  pill: { display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500, background: 'rgba(99,102,241,.15)', color: '#818cf8' },
  cellInput: { width: '100%', padding: '6px 8px', background: '#0b0f1a', border: '1px solid rgba(255,255,255,.1)', borderRadius: 6, color: '#e2e8f0', fontSize: 12, fontFamily: 'inherit' },
  center: { textAlign: 'center', color: '#64748b', padding: '28px 14px' },
  spinner: { display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,.1)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin .7s linear infinite', marginRight: 8, verticalAlign: 'middle' },
  pagination: { display: 'flex', alignItems: 'center', gap: 5, padding: '10px 14px', justifyContent: 'flex-end' },
  pageBtn: { width: 28, height: 28, borderRadius: 5, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.05)', color: '#94a3b8', fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  pageBtnActive: { background: '#6366f1', borderColor: '#6366f1', color: '#fff' },
}
