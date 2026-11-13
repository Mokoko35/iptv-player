import './tracing'
import './console-capture'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { installShareSync } from './lib/share'
import './index.css'
import { startHost } from './iptv/host'
import { applyTheme } from './iptv/themes'
import { loadPrefs } from './iptv/prefs'
import { applyDocumentLang } from './iptv/i18n'

startHost() // inside the C# app: connect to it and make the page see-through
applyTheme(loadPrefs().theme) // before the first paint, so there is no flash of the wrong colors
applyDocumentLang()
installShareSync()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
