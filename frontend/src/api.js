// src/api.js  — thin fetch wrappers for all FastAPI endpoints

export const api = {
  async getJobs() {
    const r = await fetch('/api/jobs')
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  },

  async runPipeline(payload) {
    const r = await fetch('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  },

  async getStatus(jobId) {
    const r = await fetch(`/api/status/${jobId}`)
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  },

  async getOutputs() {
    const r = await fetch('/api/outputs')
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  },

  async deleteOutput(path) {
    const enc = path.split('/').map(encodeURIComponent).join('/')
    const r = await fetch(`/api/outputs/${enc}`, { method: 'DELETE' })
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  },

  async previewText(filePath) {
    const r = await fetch(`/api/preview/${filePath}`)
    if (!r.ok) throw new Error(await r.text())
    return r.text()
  },

  streamLogs(jobId, onLine, onDone) {
    const es = new EventSource(`/api/run/${jobId}/stream`)
    es.onmessage = (e) => onLine(JSON.parse(e.data))
    es.addEventListener('done', (e) => {
      onDone(JSON.parse(e.data))
      es.close()
    })
    es.onerror = () => {
      api.getStatus(jobId).then(d => {
        if (d.status !== 'running') { onDone(d.status); es.close() }
      }).catch(() => {})
    }
    return () => es.close()
  },

  async getAppSettings() {
    const r = await fetch('/api/config/app-settings')
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  },

  async saveAppSettings(data) {
    const r = await fetch('/api/config/app-settings', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  },

  async saveGmailCredentials(data) {
    const r = await fetch('/api/config/gmail-credentials', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    })
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  },

  async getProfile() {
    const r = await fetch('/api/config/profile')
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  },

  async saveProfile(data) {
    const r = await fetch('/api/config/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    })
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  },

  async getEmailTemplate() {
    const r = await fetch('/api/config/email-template')
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  },

  async saveEmailTemplate(content) {
    const r = await fetch('/api/config/email-template', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  },

  async getRequiredFields() {
    const r = await fetch('/api/config/required-fields')
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  },

  async getCvTemplate() {
    const r = await fetch('/api/config/cv-template')
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  },

  async saveCvTemplate(content) {
    const r = await fetch('/api/config/cv-template', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  },

  async enhanceCvTemplate(content) {
    const r = await fetch('/api/config/cv-template/enhance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  },

  async previewCvTemplate(payload) {
    const r = await fetch('/api/config/cv-template/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {}),
    })
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  },

  async listCvTemplates() {
    const r = await fetch('/api/config/cv-templates')
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  },

  async setCvTemplatePath(path) {
    const r = await fetch('/api/config/cv-template-path', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    })
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  },

  async importJobs(file) {
    const r = await fetch('/api/jobs/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
      body: file,
    })
    if (!r.ok) {
      const body = await r.json().catch(() => null)
      throw new Error(body?.detail || 'Import failed')
    }
    return r.json()
  },

  exportJobsUrl: '/api/jobs/export',

  async addJob(data) {
    const r = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  },

  async updateJob(excelRow, data) {
    const r = await fetch(`/api/jobs/${excelRow}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  },

  async deleteJob(excelRow) {
    const r = await fetch(`/api/jobs/${excelRow}`, {
      method: 'DELETE',
    })
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  },
  outputUrl: (path) => `/api/outputs/${path}`,
}
