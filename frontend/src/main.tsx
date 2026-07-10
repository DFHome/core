import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"

import "./index.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { DevicesProvider } from "@/hooks/use-devices.tsx"
import { UnsavedChangesProvider } from "@/hooks/use-unsaved-changes-guard.tsx"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <DevicesProvider>
          <UnsavedChangesProvider>
            <App />
          </UnsavedChangesProvider>
        </DevicesProvider>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>
)
