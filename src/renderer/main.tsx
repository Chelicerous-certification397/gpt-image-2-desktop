import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { ComposerProvider } from './state/useComposer'
import './styles/tokens.css'
import './styles/layout.css'
import './styles/controls.css'
import './styles/results.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ComposerProvider>
      <App />
    </ComposerProvider>
  </StrictMode>,
)
