import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'
import SecondaryWindow from './SecondaryWindow'

const isSecondary = window.location.hash === '#secondary'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    {isSecondary ? <SecondaryWindow /> : <App />}
  </React.StrictMode>
)
