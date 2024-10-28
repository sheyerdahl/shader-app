import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import SelectedObjects from './Context/SelectedObjects.ts'
import { ThreeDObject } from './WorldLogic/WorldState.ts'

function ProviderElement() {
  const [selectedObjects, SetSelectedObjects] = useState<ThreeDObject[]>([]);

  return (
    <SelectedObjects.Provider value={[selectedObjects, SetSelectedObjects]}>
      <App />
    </SelectedObjects.Provider>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ProviderElement />
  </React.StrictMode>,
)
