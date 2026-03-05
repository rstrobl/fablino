import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

const params = new URLSearchParams(window.location.search)
const variant = params.get('v') || '1'

async function load() {
  let App: any
  if (variant === '2') {
    await import('./App-v2.css')
    App = (await import('./App-v2.tsx')).default
  } else if (variant === '3') {
    await import('./App-v3.css')
    App = (await import('./App-v3.tsx')).default
  } else {
    await import('./App-v1.css')
    App = (await import('./App-v1.tsx')).default
  }
  
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

load()
