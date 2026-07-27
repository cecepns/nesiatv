import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { registerSW } from 'virtual:pwa-register'
import App from './App.jsx'
import './index.css'
import { applyTheme, getStoredTheme } from './hooks/useTheme.js'

const hostname = window.location.hostname;
const isLocalhost =
  hostname === 'localhost' || hostname === '127.0.0.1';

const allowedHosts = [
  '02.nesiatv.asia',
  '03.nesiatv.asia',
  'id.nesiatv.net',
  'nesiatv.vercel.app',
  'v1.nesiatvku.com',
  'v2.nesiatv.site',
  'v3.nesiatv.site',
  'v4.nesiatv.site',
  'v5.nesiatv.site',
  'v6.nesiatv.site',
  'v7.nesiatv.site',
  'v8.nesiatv.site',
  'v9.nesiatv.site'
];
const isAllowedHost =
  isLocalhost ||
  allowedHosts.some((h) => hostname === h || hostname.endsWith(`.${h}`)) ||
  /^nesiatv-.+\.vercel\.app$/i.test(hostname);

if (!isAllowedHost) {
  document.body.innerHTML = '<h1>Unauthorized domain</h1>';
  throw new Error('Blocked domain');
}

// Initialize theme before app renders (must match useTheme persistence)
applyTheme(getStoredTheme());

registerSW({
  immediate: true,
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>,
)
