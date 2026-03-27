import { MenuLayout } from "./components/MenuLayout";
import InvoicesIndexPage from "./pages/Invoices";
import LocationsIndexPage from "./pages/Locations";
import TravelIndexPage from "./pages/Travel";

function App() {
  return (
    <MenuLayout
      defaultActive="travel"
      views={{
        invoices: <InvoicesIndexPage />,
        locations: <LocationsIndexPage />,
        travel: <TravelIndexPage />,
      }}
    />
  )
}

export default App