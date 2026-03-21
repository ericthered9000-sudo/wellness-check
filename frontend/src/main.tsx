import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './contexts/ThemeContext'

createRoot(document.getElementById('root')!).render(
 <StrictMode>
 <ThemeProvider>
 <App />
 </ThemeProvider>
 </StrictMode>,
)

// Service worker registration is handled by vite-plugin-pwa
// auto-deploy test Sat Mar 21 08:50:03 AM CDT 2026
