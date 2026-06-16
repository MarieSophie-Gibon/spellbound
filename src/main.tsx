import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { GrimoirePopupProvider } from './contexts/GrimoirePopupContext.tsx'
import { GrimoirePopupModal } from './components/grimoire/GrimoirePopupModal.tsx'
import './index.css'

// Création du client React Query
const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <GrimoirePopupProvider>
          <App />
          <GrimoirePopupModal />
        </GrimoirePopupProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
)