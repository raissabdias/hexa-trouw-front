import { useMemo, useState, type ReactNode } from "react";
import { FileText, MapPin, Truck } from "lucide-react";

export type MenuKey = "invoices" | "locations" | "travel";

type MenuItem = {
  key: MenuKey;
  label: string;
  icon: (props: { className?: string }) => ReactNode;
};

const ITEMS: MenuItem[] = [
  { key: "invoices", label: "Notas Fiscais", icon: FileText },
  { key: "locations", label: "Locais", icon: MapPin },
  { key: "travel", label: "Viagem", icon: Truck },
];

export function MenuLayout(props: {
  defaultActive?: MenuKey;
  views: Record<MenuKey, ReactNode>;
}) {
  const [active, setActive] = useState<MenuKey>(
    props.defaultActive ?? "locations",
  );

  const activeView = useMemo(() => props.views[active], [active, props.views]);

  return (
    <div className={`bg-zinc-50 flex flex-col ${active === "travel" ? "h-screen overflow-hidden" : "min-h-screen"}`}>
      <header className="border-b border-zinc-200 bg-white shrink-0">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Trouw+
              </div>
              <div className="text-lg font-semibold tracking-tight text-zinc-900">
                Travel Hexa
              </div>
            </div>

            <nav className="-mx-2 flex items-center gap-1 overflow-x-auto px-2">
              {ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = item.key === active;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setActive(item.key)}
                    className={[
                      "inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
                      isActive
                        ? "bg-[#2E3191] text-white shadow-sm"
                        : "text-zinc-700 hover:bg-zinc-100",
                    ].join(" ")}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon
                      className={
                        isActive
                          ? "h-4 w-4 text-white"
                          : "h-4 w-4 text-zinc-500"
                      }
                    />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      <main className={`flex-1 flex flex-col min-h-0 py-4 px-4 ${active === "travel" ? "mx-auto w-full max-w-[100vw]" : "mx-auto w-full max-w-7xl"}`}>
        {activeView}
      </main>
    </div>
  );
}

