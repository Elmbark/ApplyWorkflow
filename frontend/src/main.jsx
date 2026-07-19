import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

const root = document.getElementById('root')

const style = document.createElement('style')
style.textContent = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0b0f1a; }
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,.12); border-radius: 3px; }
  @keyframes spin { to { transform: rotate(360deg); } }
  input[type=checkbox] { accent-color: #6366f1; }
  input:focus { outline: none; border-color: #6366f1 !important; }
  button:disabled { cursor: not-allowed !important; }
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
`
document.head.appendChild(style)

createRoot(root).render(<StrictMode><App /></StrictMode>)
