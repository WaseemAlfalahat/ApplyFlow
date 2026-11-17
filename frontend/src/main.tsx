
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App.tsx'
import ChromeBackground from './ChromeBackground'

import './index.css'
import './monochrome.css'
import './chrome-background.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="applyflow-app-shell">
      <App />
      <ChromeBackground />
    </div>
  </StrictMode>,
)
