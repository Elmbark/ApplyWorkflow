import { useState, useEffect } from 'react'
import { Settings, X, Plus, Trash2, Save, User, Mail, FileCode, AlertTriangle } from 'lucide-react'
import { api } from '../api'

const DEFAULT_PROFILE = {
  name: "Nidhal Elmbarki",
  phone: "+216 55 008 016",
  email: "elmbarkinidhal@gmail.com",
  github: "Elmbark",
  linkedin: "ElmbarkiNidhal",
  personal_site: "ElmbarkiNidhal.io",
  location: "Sfax, Tunisia",
}

export function ConfigButton({ onClick }) {
  return (
    <button style={s.gearBtn} onClick={onClick} title="Configuration">
      <Settings size={16} />
    </button>
  )
}

export function ConfigPanel({ onClose }) {
  const [tab, setTab] = useState('profile')
  const [profile, setProfile] = useState([])
  const [template, setTemplate] = useState('')
  const [cvTemplate, setCvTemplate] = useState('')
  const [required, setRequired] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [cvList, setCvList] = useState([])
  const [cvPath, setCvPath] = useState('')
  const [previewPath, setPreviewPath] = useState('')
  const [previewOpen, setPreviewOpen] = useState(true)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewKey, setPreviewKey] = useState(0)

  useEffect(() => {
    Promise.all([
      api.getProfile(),
      api.getEmailTemplate(),
      api.getCvTemplate(),
      api.getRequiredFields(),
      api.listCvTemplates()
    ])
      .then(([p, t, cv, req, list]) => {
        const source = Object.keys(p).length > 0 ? p : DEFAULT_PROFILE
        setProfile(Object.entries(source).map(([key, value]) => ({ key, value })))
        setTemplate(t.content)
        setCvTemplate(cv.content)
        setRequired(req.fields)
        setCvList(list.items || [])
        setCvPath(list.current || '')
        setLoading(false)
      })
      .catch(e => { setMsg(`⚠ ${e.message}`); setLoading(false) })
  }, [])

  const flash = (text) => { setMsg(text); setTimeout(() => setMsg(''), 2000) }

  // which required fields are missing or blank right now
  const filledKeys = new Set(profile.filter(f => f.value.trim()).map(f => f.key.trim()))
  const missing = required.filter(f => !filledKeys.has(f))

  const saveProfile = async () => {
    setSaving(true)
    try {
      const data = Object.fromEntries(
        profile.filter(f => f.key.trim()).map(f => [f.key.trim(), f.value])
      )
      await api.saveProfile(data)
      flash('✅ Profile saved')
    } catch (e) { flash(`⚠ ${e.message}`) }
    setSaving(false)
  }

  const saveTemplate = async () => {
    setSaving(true)
    try {
      await api.saveEmailTemplate(template)
      const req = await api.getRequiredFields()
      setRequired(req.fields)
      flash('✅ Template saved')
    } catch (e) { flash(`⚠ ${e.message}`) }
    setSaving(false)
  }

  const saveCvTemplate = async () => {
    setSaving(true)
    try {
      await api.saveCvTemplate(cvTemplate)
      const req = await api.getRequiredFields()
      setRequired(req.fields)
      flash('CV template saved')
      if (previewPath) { await previewCv() }
    } catch (e) { flash(`⚠ ${e.message}`) }
    setSaving(false)
  }

  const changeCvTemplatePath = async (newPath) => {
    try {
      await api.setCvTemplatePath(newPath)
      setCvPath(newPath)
      const cv = await api.getCvTemplate()
      setCvTemplate(cv.content)
      const list = await api.listCvTemplates()
      setCvList(list.items || [])
      flash('✅ CV template selected')
    } catch (e) {
      flash(`⚠ ${e.message}`)
    }
  }

  const enhanceCv = async () => {
    setSaving(true)
    try {
      const res = await api.enhanceCvTemplate(cvTemplate)
      setCvTemplate(res.content)
      flash('Template enhanced by AI')
      if (previewPath) { await previewCv() }
    } catch (e) { flash(`⚠ ${e.message}`) }
    setSaving(false)
  }

  const previewCv = async () => {
    setPreviewLoading(true)
    try {
      // Save current edits first so the preview uses latest content
      await api.saveCvTemplate(cvTemplate)
      const res = await api.previewCvTemplate({})
      setPreviewPath(res.path)
      setPreviewKey(k => k + 1)
      setPreviewOpen(true)
      flash('📄 Preview compiled')
    } catch (e) { flash(`⚠ ${e.message}`) }
    setPreviewLoading(false)
  }

  const updateField = (i, key, value) =>
    setProfile(p => p.map((f, idx) => idx === i ? { key, value } : f))
  const removeField = (i) => setProfile(p => p.filter((_, idx) => idx !== i))
  const addField = () => setProfile(p => [...p, { key: '', value: '' }])
  const addMissingField = (key) => setProfile(p => [...p, { key, value: '' }])

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.header}>
          <div style={s.tabs}>
            <button style={{ ...s.tab, ...(tab === 'profile' ? s.tabActive : {}) }} onClick={() => setTab('profile')}>
              <User size={14} /> Profile
              {missing.length > 0 && <span style={s.badge}>{missing.length}</span>}
            </button>
            <button style={{ ...s.tab, ...(tab === 'cv' ? s.tabActive : {}) }} onClick={() => setTab('cv')}>
              <FileCode size={14} /> CV Template
            </button>
            <button style={{ ...s.tab, ...(tab === 'template' ? s.tabActive : {}) }} onClick={() => setTab('template')}>
              <Mail size={14} /> Email Template
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {msg && <span style={s.msg}>{msg}</span>}
            <button style={s.closeBtn} onClick={onClose}><X size={16} /></button>
          </div>
        </div>

        {!loading && missing.length > 0 && (tab === 'profile' || tab === 'cv') && (
          <div style={s.warnBanner}>
            <AlertTriangle size={15} style={{ flexShrink: 0 }} />
            <span>
              Your templates reference {missing.length === 1 ? 'a field' : 'fields'} that {missing.length === 1 ? "isn't" : "aren't"} set:{' '}
              {missing.map((f, i) => (
                <span key={f}>
                  <code style={s.missingCode}>{f}</code>
                  {i < missing.length - 1 ? ', ' : ''}
                </span>
              ))}
              . These will appear blank or unreplaced in generated CVs/emails.
            </span>
            <button style={s.fixBtn} onClick={() => { missing.forEach(addMissingField); setTab('profile') }}>
              Add missing fields
            </button>
          </div>
        )}

        <div style={s.body}>
          {loading && <div style={s.muted}>Loading…</div>}

          {!loading && tab === 'profile' && (
            <>
              <div style={s.fieldList}>
                {profile.map((f, i) => {
                  const isRequired = required.includes(f.key.trim())
                  const isEmpty = !f.value.trim()
                  return (
                    <div key={i} style={s.fieldRow}>
                      <input
                        style={{ ...s.keyInput, ...(isRequired && isEmpty ? s.inputWarn : {}) }}
                        placeholder="key (e.g. name)"
                        value={f.key} onChange={e => updateField(i, e.target.value, f.value)} />
                      <input
                        style={{ ...s.valInput, ...(isRequired && isEmpty ? s.inputWarn : {}) }}
                        placeholder="value"
                        value={f.value} onChange={e => updateField(i, f.key, e.target.value)} />
                      {isRequired && <span style={s.reqTag} title="Used in templates">required</span>}
                      <button style={s.iconBtn} onClick={() => removeField(i)}><Trash2 size={13} /></button>
                    </div>
                  )
                })}
                {profile.length === 0 && <div style={s.muted}>No profile fields yet.</div>}
              </div>
              <div style={s.actions}>
                <button style={s.addBtn} onClick={addField}><Plus size={14} /> Add field</button>
                <button style={s.saveBtn} disabled={saving} onClick={saveProfile}>
                  <Save size={14} /> {saving ? 'Saving…' : 'Save profile'}
                </button>
              </div>
              <p style={s.hint}>
                These become <code>{'{{ key }}'}</code> placeholders in your CV template.
              </p>
            </>
          )}

          {!loading && tab === 'cv' && (
            <>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <label style={{ color: '#94a3b8', fontSize: 12 }}>Choose template:</label>
                <select
                  style={s.select}
                  value={cvPath}
                  onChange={(e) => changeCvTemplatePath(e.target.value)}
                >
                  {cvList.length === 0 && <option value="">No .typ files in templates/</option>}
                  {cvList.map(it => (
                    <option key={it.path} value={it.path}>{it.name}</option>
                  ))}
                </select>
              </div>
              <textarea style={s.textarea} value={cvTemplate} onChange={e => setCvTemplate(e.target.value)}
                spellCheck={false} placeholder="#let name = ..." />
              <div style={{ ...s.actions, gap: 8, justifyContent: 'flex-start', flexWrap: 'wrap' }}>
                <button style={s.saveBtn} disabled={saving} onClick={saveCvTemplate}>
                  <Save size={14} /> {saving ? 'Saving…' : 'Save CV template'}
                </button>
                <button style={s.ghostBtn} disabled={saving} onClick={enhanceCv}>
                  Enhance with AI
                </button>
                <button style={s.ghostBtn} disabled={saving || previewLoading} onClick={previewCv}>
                  {previewLoading ? 'Compiling…' : 'Preview (compile)'}
                </button>
                {previewPath && (
                  <button style={s.ghostBtn} onClick={() => setPreviewOpen(o => !o)}>
                    {previewOpen ? 'Hide preview' : 'Show preview'}
                  </button>
                )}
              </div>
              {previewPath && previewOpen && (
                <div style={s.previewWrap}>
                  {previewLoading && <div style={s.previewOverlay}>Compiling…</div>}
                  <iframe
                    key={previewKey}
                    src={api.outputUrl(previewPath)}
                    style={s.previewFrame}
                    title="CV Preview"
                  />
                </div>
              )}
              <p style={s.hint}>
                This is the Typst source the AI edits per-application (keywords are woven into the skills section). Use <code>{'{{ field }}'}</code> for profile placeholders (e.g. <code>{'{{ name }}'}</code>) — filled in automatically after generation.
              </p>
            </>
          )}

          {!loading && tab === 'template' && (
            <>
              <textarea style={s.textarea} value={template} onChange={e => setTemplate(e.target.value)}
                spellCheck={false} placeholder="<html>…</html>" />
              <div style={s.actions}>
                <button style={s.saveBtn} disabled={saving} onClick={saveTemplate}>
                  <Save size={14} /> {saving ? 'Saving…' : 'Save template'}
                </button>
              </div>
              <p style={s.hint}>
                Available placeholders: <code>{'{name} {company} {post} {contact_lines} {opening_line} {closing_line}'}</code>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const s = {
  gearBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 7, color: '#94a3b8', cursor: 'pointer' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modal: { background: '#111827', border: '1px solid rgba(255,255,255,.12)', borderRadius: 14, width: '94vw', maxWidth: 900, maxHeight: '95vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,.6)' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.03)', flexShrink: 0, flexWrap: 'wrap', gap: 8 },
  tabs: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  tab: { display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: 'transparent', border: '1px solid transparent', borderRadius: 7, color: '#94a3b8', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' },
  tabActive: { background: 'rgba(99,102,241,.15)', borderColor: 'rgba(99,102,241,.3)', color: '#818cf8' },
  badge: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 16, height: 16, padding: '0 4px', background: '#f59e0b', color: '#1a1200', borderRadius: 8, fontSize: 10, fontWeight: 700 },
  msg: { fontSize: 12, color: '#94a3b8' },
  closeBtn: { padding: '6px 10px', background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 7, color: '#94a3b8', cursor: 'pointer' },
  warnBanner: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(245,158,11,.1)', borderBottom: '1px solid rgba(245,158,11,.25)', color: '#fbbf24', fontSize: 12.5, lineHeight: 1.5 },
  missingCode: { background: 'rgba(245,158,11,.18)', padding: '1px 5px', borderRadius: 4, fontSize: 11.5 },
  fixBtn: { flexShrink: 0, padding: '5px 10px', background: 'rgba(245,158,11,.2)', border: '1px solid rgba(245,158,11,.4)', borderRadius: 6, color: '#fbbf24', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
  body: { padding: 18, overflowY: 'auto', flex: 1 },
  muted: { color: '#64748b', fontSize: 13, fontStyle: 'italic', padding: '8px 0' },
  fieldList: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 },
  fieldRow: { display: 'flex', gap: 8, alignItems: 'center' },
  keyInput: { width: 200, padding: '10px 12px', background: '#0b0f1a', border: '1px solid rgba(255,255,255,.1)', borderRadius: 7, color: '#e2e8f0', fontSize: 14, fontFamily: 'inherit' },
  valInput: { flex: 1, padding: '10px 12px', background: '#0b0f1a', border: '1px solid rgba(255,255,255,.1)', borderRadius: 7, color: '#e2e8f0', fontSize: 14, fontFamily: 'inherit' },
  inputWarn: { borderColor: 'rgba(245,158,11,.6)', boxShadow: '0 0 0 1px rgba(245,158,11,.2)' },
  reqTag: { flexShrink: 0, fontSize: 10, fontWeight: 600, color: '#fbbf24', background: 'rgba(245,158,11,.12)', padding: '3px 6px', borderRadius: 4, whiteSpace: 'nowrap' },
  iconBtn: { display: 'inline-flex', alignItems: 'center', padding: '0 9px', background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 7, color: '#94a3b8', cursor: 'pointer' },
  actions: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  addBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 7, color: '#94a3b8', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' },
  saveBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  textarea: { width: '100%', height: 520, padding: 14, background: '#0d1117', border: '1px solid rgba(255,255,255,.08)', borderRadius: 8, color: '#e2e8f0', fontFamily: "'JetBrains Mono','Fira Code',monospace", fontSize: 13, lineHeight: 1.7, resize: 'vertical' },
  hint: { fontSize: 12, color: '#64748b', marginTop: 10 },
  select: { padding: '8px 12px', background: '#0b0f1a', border: '1px solid rgba(255,255,255,.1)', borderRadius: 7, color: '#e2e8f0', fontSize: 14, fontFamily: 'inherit' },
  ghostBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 7, color: '#94a3b8', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' },
  linkBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'rgba(99,102,241,.15)', border: '1px solid rgba(99,102,241,.3)', borderRadius: 7, color: '#818cf8', fontSize: 13, textDecoration: 'none' },
  previewWrap: { position: 'relative', marginTop: 10, border: '1px solid rgba(255,255,255,.08)', borderRadius: 8, overflow: 'hidden', background: '#0b0f1a' },
  previewFrame: { width: '100%', height: 600, border: 'none', background: '#fff' },
  previewOverlay: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13, background: 'rgba(0,0,0,.35)', backdropFilter: 'blur(2px)' },
}