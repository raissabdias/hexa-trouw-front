import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MenuLayout } from "./components/MenuLayout";
import InvoicesIndexPage from "./pages/Invoices";
import LocationsIndexPage from "./pages/Locations";
import TravelIndexPage from "./pages/Travel";

import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import LoginPage from "./pages/Login";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          <Route element={<ProtectedRoute />}>
            <Route element={<MenuLayout />}>
              <Route path="/" element={<Navigate to="/travel" replace />} />
              <Route path="/travel" element={<TravelIndexPage />} />
              <Route path="/invoices" element={<InvoicesIndexPage />} />
              <Route path="/locations" element={<LocationsIndexPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App