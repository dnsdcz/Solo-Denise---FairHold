import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Buffer } from 'buffer'
import './index.css'
import App from './App.jsx'

// Web3/Stellar SDK Polyfill for Vite
if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || Buffer;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
