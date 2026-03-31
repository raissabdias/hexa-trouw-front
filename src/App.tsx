import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MenuLayout } from "./components/MenuLayout";
import InvoicesIndexPage from "./pages/Invoices";
import LocationsIndexPage from "./pages/Locations";
import TravelIndexPage from "./pages/Travel";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MenuLayout />}>
          <Route path="/" element={<Navigate to="/travel" replace />} />
          <Route path="/travel" element={<TravelIndexPage />} />
          <Route path="/invoices" element={<InvoicesIndexPage />} />
          <Route path="/locations" element={<LocationsIndexPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App