import { type ReactNode } from "react";
import { Truck, FileText, MapPin } from "lucide-react";
import { NavLink, Link, Outlet, useLocation } from "react-router-dom";

export type MenuKey = "invoices" | "locations" | "travel";

type MenuItem = {
  key: MenuKey;
  label: string;
  path: string;
  icon: (props: { className?: string }) => ReactNode;
};

const ITEMS: MenuItem[] = [
  { key: "invoices", label: "Notas Fiscais", path: "/invoices", icon: FileText },
  { key: "locations", label: "Locais", path: "/locations", icon: MapPin },
  { key: "travel", label: "Viagens", path: "/travel", icon: Truck },
];

export function MenuLayout() {
  const location = useLocation();
  const isTravelPage = location.pathname === "/travel";

  return (
    <div className={`bg-zinc-50 flex flex-col ${isTravelPage ? "h-screen overflow-hidden" : "min-h-screen"}`}>
      <header className="border-b border-zinc-200 bg-white shadow-sm shrink-0">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link 
              to="/travel" 
              className="group flex flex-col hover:opacity-80 transition-opacity"
            >
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2E3191]/60">
                Trouw+
              </div>
              <div className="text-xl font-extrabold tracking-tight text-[#2E3191] sm:text-2xl">
                Travel Hexa
              </div>
            </Link>

            <nav className="-mx-2 flex items-center gap-1 overflow-x-auto overflow-y-hidden px-2 py-1">
              {ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.key}
                    to={item.path}
                    className={({ isActive }) => [
                      "inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-all duration-200",
                      isActive
                        ? "bg-[#2E3191] text-white shadow-md shadow-[#2E3191]/20 scale-105"
                        : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
                    ].join(" ")}
                  >
                    {({ isActive }) => (
                      <>
                        <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-zinc-400 group-hover:text-zinc-600"}`} />
                        {item.label}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      <main className={`flex-1 flex flex-col min-h-0 py-4 px-4 ${isTravelPage ? "mx-auto w-full max-w-[100vw]" : "mx-auto w-full max-w-7xl"}`}>
        <Outlet />
      </main>
    </div>
  );
}

