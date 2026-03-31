import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  GoogleMap,
  MarkerF,
  OverlayViewF,
  PolylineF,
  useJsApiLoader,
  MarkerClustererF,
} from "@react-google-maps/api";
import { decodeFlexPolyline as decode } from "../../utils/flexPolyline";
import { api, type ApiResponse } from "../../services/api";

type InvoiceApiItem = {
  id: number;
  number: string;
  series: string | null;
  value: number | null;
  weight: number | null;
  volume: number | null;
  statusDescription: string;
  issuedAt: string | null;
  scheduledDelivery: string | null;
  recipient: {
    name: string;
    address: {
      address: string;
      number: string;
      neighborhood: string;
      zipCode: string;
      city: string;
      state: string;
      latitude: string;
      longitude: string;
    } | null;
  } | null;
};

type TravelPoint = {
  locationId: number;
  sequence: number;
  name: string;
  address: {
    latitude: string;
    longitude: string;
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
};

type TravelApiItem = {
  id: number;
  invoiceQuantity: number;
  locationQuantity: number;
  totalWeight: string;
  totalVolume: string;
  startDate: string;
  endDate: string;
  totalDistance: string;
  totalValue: string;
  origin?: TravelPoint;
  travelPoints?: TravelPoint[];
  color?: string;
  polyline?: string[];
};

const MAPS_LIBRARIES = ["places"];
const DEFAULT_CENTER = { lat: -23.5505, lng: -46.6333 };

const MAP_STYLES = [
  { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
  { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#e5e5e5" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#dadada" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
  { featureType: "transit.line", elementType: "geometry", stylers: [{ color: "#e5e5e5" }] },
  { featureType: "transit.station", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9c9c9" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] }
];

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}



export default function TravelIndexPage() {
  const [viewMode, setViewMode] = useState<"entregas" | "viagens">("entregas");

  const [invoices, setInvoices] = useState<InvoiceApiItem[]>([]);
  const [travels, setTravels] = useState<TravelApiItem[]>([]);
  
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<number[]>([]);
  const [selectedTravelIds, setSelectedTravelIds] = useState<number[]>([]);

  // Routing Modal States
  const [isRoutingModalOpen, setIsRoutingModalOpen] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(8, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [isRouting, setIsRouting] = useState(false);

  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);

  const mapsApiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) ?? "";
  const { isLoaded: isMapsLoaded } = useJsApiLoader({
    id: "locations-google-maps",
    googleMapsApiKey: mapsApiKey,
    libraries: MAPS_LIBRARIES as never,
  });

  // Fetch Invoices
  useEffect(() => {
    if (viewMode !== "entregas") return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await api.get<ApiResponse<InvoiceApiItem[]>, ApiResponse<InvoiceApiItem[]>>("/invoices", {
          params: { page: 1, limit: 250, search: search.trim() || undefined },
        });
        if (cancelled) return;
        setInvoices(data.data ?? []);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Erro ao carregar notas fiscais.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    const timer = setTimeout(() => void load(), 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [search, viewMode]);

  // Fetch Travels
  useEffect(() => {
    if (viewMode !== "viagens") return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await api.get<ApiResponse<TravelApiItem[]>, ApiResponse<TravelApiItem[]>>("/travels", {
          params: { page: 1, limit: 100, search: search.trim() || undefined },
        });
        if (cancelled) return;
        setTravels(data.data ?? []);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Erro ao carregar viagens.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    const timer = setTimeout(() => void load(), 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [search, viewMode]);

  const handleInvoiceRowClick = useCallback((invoice: InvoiceApiItem) => {
    setActiveMarkerId(`inv-${invoice.id}`);
    const latStr = invoice.recipient?.address?.latitude;
    const lngStr = invoice.recipient?.address?.longitude;
    if (latStr && lngStr) {
      const lat = Number(latStr);
      const lng = Number(lngStr);
      if (!Number.isNaN(lat) && !Number.isNaN(lng) && mapRef.current) {
        const bounds = mapRef.current.getBounds();
        const isInViewport = bounds?.contains({ lat, lng });
        if (!isInViewport) {
          mapRef.current.panTo({ lat, lng });
          mapRef.current.setZoom(14);
        }
      }
    }
  }, []);

  const handleTravelRowClick = useCallback((travel: TravelApiItem) => {
    setActiveMarkerId(`tvl-${travel.id}-0`);

    const pts = travel.travelPoints;
    if (pts && pts.length > 0 && mapRef.current) {
      const first = pts[0];
      const lat = Number(first.address.latitude);
      const lng = Number(first.address.longitude);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        const bounds = mapRef.current.getBounds();
        const isInViewport = bounds?.contains({ lat, lng });
        if (!isInViewport) {
          mapRef.current.panTo({ lat, lng });
          mapRef.current.setZoom(12);
        }
      }
    }
  }, []);

  const toggleSelectAllTravels = () => {
    if (selectedTravelIds.length === travels.length) setSelectedTravelIds([]);
    else setSelectedTravelIds(travels.map((t) => t.id));
  };

  const toggleSelectTravel = (id: number) => {
    setSelectedTravelIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  };

  const toggleSelectAllInvoices = () => {
    if (selectedInvoiceIds.length === invoices.length) setSelectedInvoiceIds([]);
    else setSelectedInvoiceIds(invoices.map((inv) => inv.id));
  };

  const toggleSelectInvoice = (id: number) => {
    setSelectedInvoiceIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  };

  const handleCreateTravel = async () => {
    if (selectedInvoiceIds.length === 0) return;

    setIsRouting(true);
    try {
      const payload = {
        invoiceIds: selectedInvoiceIds,
        originPersonId: Number(import.meta.env.VITE_ORIGIN_ID),
        startDate: new Date(startDate).toISOString(),
      };

      const res = await api.post<ApiResponse<{ travelId: number }>, ApiResponse<{ travelId: number }>>("/travels", payload);

      if (res.success) {
        setIsRoutingModalOpen(false);
        setSelectedInvoiceIds([]);
        setViewMode("viagens");
        setSelectedTravelIds([res.data.travelId]);
        setActiveMarkerId(`tvl-${res.data.travelId}-0`);
        setSearch("");
      } else {
        alert(res.message || "Erro ao roteirizar.");
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro desconhecido ao roteirizar.");
    } finally {
      setIsRouting(false);
    }
  };



  const displayInvoiceMarkers = useMemo(() => {
    const coordinateCounts = new Map<string, number>();
    return invoices
      .filter((inv) => {
        const lat = Number(inv.recipient?.address?.latitude);
        const lng = Number(inv.recipient?.address?.longitude);
        return !Number.isNaN(lat) && !Number.isNaN(lng);
      })
      .map((inv) => {
        let lat = Number(inv.recipient?.address?.latitude);
        let lng = Number(inv.recipient?.address?.longitude);
        const key = `${lat},${lng}`;
        const count = coordinateCounts.get(key) || 0;
        if (count > 0) {
          const radius = 0.00015 * Math.ceil(count / 6); 
          const angle = count * (Math.PI / 3);
          lat += radius * Math.cos(angle);
          lng += radius * Math.sin(angle);
        }
        coordinateCounts.set(key, count + 1);
        return { ...inv, displayLat: lat, displayLng: lng };
      });
  }, [invoices]);

  const travelPolylines = useMemo(() => {
    if (viewMode !== "viagens") return [];
    return travels.map((travel) => {
      const isSelected = selectedTravelIds.includes(travel.id);
      let path: { lat: number; lng: number }[] = [];

      if (travel.polyline && travel.polyline.length > 0) {
        try {
          travel.polyline.forEach((encoded) => {
            const decoded = decode(encoded);
            // polyline returns coordinates as [lat, lng] arrays
            path.push(...decoded.polyline.map(([lat, lng]) => ({ lat, lng })));
          });
        } catch (e) {
          console.error(`Erro ao decodificar polilinha da viagem ${travel.id}`, e);
          path = (travel.travelPoints || [])
            .map((p) => ({ lat: Number(p.address.latitude), lng: Number(p.address.longitude) }))
            .filter((p) => !Number.isNaN(p.lat) && !Number.isNaN(p.lng));
        }
      } else {
        path = (travel.travelPoints || [])
          .map((p) => ({ lat: Number(p.address.latitude), lng: Number(p.address.longitude) }))
          .filter((p) => !Number.isNaN(p.lat) && !Number.isNaN(p.lng));
      }

      return { travelId: travel.id, path, isSelected, color: travel.color };
    }).filter((t) => t.path.length > 1);
  }, [travels, selectedTravelIds, viewMode]);

  const travelMarkers = useMemo(() => {
    if (viewMode !== "viagens") return [];
    const markers: Array<{ lat: number, lng: number, travelId: number, point: TravelPoint, isSelected: boolean, color?: string }> = [];
    travels.forEach((t) => {
      const isSelected = selectedTravelIds.includes(t.id);
      (t.travelPoints || []).forEach(p => {
        const lat = Number(p.address.latitude);
        const lng = Number(p.address.longitude);
        if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
          markers.push({ lat, lng, travelId: t.id, point: p, isSelected, color: t.color });
        }
      });
    });
    return markers;
  }, [travels, selectedTravelIds, viewMode]);

  useEffect(() => {
    if (!mapInstance || !window.google) return;
    const bounds = new window.google.maps.LatLngBounds();
    let hasPoints = false;
    
    if (viewMode === "entregas" && displayInvoiceMarkers.length > 0) {
      displayInvoiceMarkers.forEach((inv) => {
        bounds.extend(new window.google.maps.LatLng(inv.displayLat, inv.displayLng));
        hasPoints = true;
      });
    } else if (viewMode === "viagens" && travelMarkers.length > 0) {
      travelMarkers.forEach((m) => {
        bounds.extend(new window.google.maps.LatLng(m.lat, m.lng));
        hasPoints = true;
      });
    }

    if (hasPoints) mapInstance.fitBounds(bounds);
  }, [mapInstance, viewMode, displayInvoiceMarkers.length, travelMarkers.length]);

  const invoiceStats = useMemo(() => {
    if (selectedInvoiceIds.length === 0) return null;
    const selected = invoices.filter(inv => selectedInvoiceIds.includes(inv.id));
    const weight = selected.reduce((acc, inv) => acc + (inv.weight ?? 0), 0);
    const volume = selected.reduce((acc, inv) => acc + (inv.volume ?? 0), 0);
    return { count: selected.length, weight, volume: volume / 1000000 };
  }, [selectedInvoiceIds, invoices]);

  const travelStats = useMemo(() => {
    if (selectedTravelIds.length === 0) return null;
    const selected = travels.filter(t => selectedTravelIds.includes(t.id));
    const weight = selected.reduce((acc, t) => acc + Number(t.totalWeight), 0);
    const volume = selected.reduce((acc, t) => acc + Number(t.totalVolume), 0);
    const invoicesCount = selected.reduce((acc, t) => acc + t.invoiceQuantity, 0);
    return { count: selected.length, invoicesCount, weight, volume };
  }, [selectedTravelIds, travels]);

  return (
    <div className="flex flex-1 flex-col gap-4 min-h-0 relative">
      <div className="flex-1 min-h-0 overflow-hidden relative rounded-lg bg-zinc-100 ring-1 ring-zinc-200">
        
        {/* Toggle View Mode */}
        <div className="absolute top-4 left-4 z-10 bg-white p-1 rounded-full shadow-xl ring-1 ring-zinc-200 flex items-center gap-1">
          <button
            onClick={() => { setViewMode("entregas"); setActiveMarkerId(null); setSearch(""); }}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${viewMode === "entregas" ? "bg-[#2E3191] text-white shadow-md scale-105" : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"}`}
          >
            Entregas
          </button>
          <button
            onClick={() => { setViewMode("viagens"); setActiveMarkerId(null); setSearch(""); }}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${viewMode === "viagens" ? "bg-[#2E3191] text-white shadow-md scale-105" : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"}`}
          >
            Viagens
          </button>
        </div>

        {!mapsApiKey ? (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center text-sm text-zinc-500">
            <p>Mapa indisponível. Defina a variável VITE_GOOGLE_MAPS_API_KEY no arquivo .env.</p>
          </div>
        ) : !isMapsLoaded ? (
          <div className="flex h-full items-center justify-center text-sm text-zinc-500">
            Carregando mapa...
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={{ width: "100%", height: "100%" }}
            center={DEFAULT_CENTER}
            zoom={6}
            onLoad={(map) => { mapRef.current = map; setMapInstance(map); }}
            options={{
              styles: MAP_STYLES,
              streetViewControl: false,
              mapTypeControl: false,
            }}
          >
            {/* INVOICES MAP RENDER */}
            {viewMode === "entregas" && (
              <>
                <MarkerClustererF>
                  {(clusterer) => (
                    <>
                      {displayInvoiceMarkers.filter(inv => !selectedInvoiceIds.includes(inv.id)).map((inv) => (
                        <MarkerF
                          key={`inv-${inv.id}`}
                          position={{ lat: inv.displayLat, lng: inv.displayLng }}
                          clusterer={clusterer}
                          onClick={() => {
                            handleInvoiceRowClick(inv);
                            if (!selectedInvoiceIds.includes(inv.id)) {
                              toggleSelectInvoice(inv.id);
                            }
                          }}
                          icon={{
                            path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
                            fillColor: "#71717a",
                            fillOpacity: 1,
                            strokeWeight: 1.5,
                            strokeColor: "#ffffff",
                            scale: 1.3,
                            anchor: new window.google.maps.Point(12, 24),
                          }}
                          zIndex={1}
                        >
                          {activeMarkerId === `inv-${inv.id}` && (
                            <OverlayViewF position={{ lat: inv.displayLat, lng: inv.displayLng }} mapPaneName="overlayMouseTarget" getPixelPositionOffset={(w, h) => ({ x: -(w / 2), y: -(h + 40) })}>
                              <div className="relative flex w-64 flex-col rounded-xl bg-white shadow-xl ring-1 ring-black/5 p-4">
                                <button onClick={(e) => { e.stopPropagation(); setActiveMarkerId(null); }} className="absolute right-2 top-2 h-6 w-6 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 hover:text-zinc-900">
                                  <span className="sr-only">Fechar</span>
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            <span className="mb-2 inline-flex items-center rounded-full bg-[#2E3191]/10 px-2 py-1 text-xs font-semibold text-[#2E3191] ring-1 ring-[#2E3191]/20 w-max">Nota {inv.number}</span>
                                <h3 className="text-sm font-bold text-zinc-900 line-clamp-2">{inv.recipient?.name?.toUpperCase() || "—"}</h3>
                                <div className="mt-2 text-xs text-zinc-600 border-t border-zinc-100 pt-2">{inv.recipient?.address?.city} / {inv.recipient?.address?.state}</div>
                              </div>
                            </OverlayViewF>
                          )}
                        </MarkerF>
                      ))}
                    </>
                  )}
                </MarkerClustererF>
                {displayInvoiceMarkers.filter(inv => selectedInvoiceIds.includes(inv.id)).map((inv) => (
                  <MarkerF
                    key={`inv-sel-${inv.id}`}
                    position={{ lat: inv.displayLat, lng: inv.displayLng }}
                    onClick={() => {
                      handleInvoiceRowClick(inv);
                      // In case they want to deselect by clicking a selected marker
                      toggleSelectInvoice(inv.id);
                    }}
                    icon={{
                      path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
                      fillColor: "#2E3191",
                      fillOpacity: 0.8,
                      strokeWeight: 2,
                      strokeColor: "#ffffff",
                      scale: 1.5,
                      anchor: new window.google.maps.Point(12, 24),
                    }}
                    zIndex={999}
                  >
                     {activeMarkerId === `inv-${inv.id}` && (
                        <OverlayViewF position={{ lat: inv.displayLat, lng: inv.displayLng }} mapPaneName="overlayMouseTarget" getPixelPositionOffset={(w, h) => ({ x: -(w / 2), y: -(h + 40) })}>
                          <div className="relative flex w-64 flex-col rounded-xl bg-white shadow-xl ring-1 ring-black/5 p-4">
                            <button onClick={(e) => { e.stopPropagation(); setActiveMarkerId(null); }} className="absolute right-2 top-2 h-6 w-6 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 hover:text-zinc-900">
                              <span className="sr-only">Fechar</span>
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                            <span className="mb-2 inline-flex items-center rounded-full bg-[#2E3191]/10 px-2 py-1 text-xs font-semibold text-[#2E3191] ring-1 ring-[#2E3191]/20 w-max">Nota {inv.number}</span>
                            <h3 className="text-sm font-bold text-zinc-900 line-clamp-2">{inv.recipient?.name?.toUpperCase() || "—"}</h3>
                            <div className="mt-2 text-xs text-zinc-600 border-t border-zinc-100 pt-2">{inv.recipient?.address?.city} / {inv.recipient?.address?.state}</div>
                          </div>
                        </OverlayViewF>
                      )}
                  </MarkerF>
                ))}
              </>
            )}

            {/* TRAVELS MAP RENDER */}
            {viewMode === "viagens" && (
              <>
                {travelPolylines.map(poly => (
                  <PolylineF
                    key={`tvl-poly-${poly.travelId}`}
                    path={poly.path}
                    options={{
                      strokeColor: poly.isSelected ? "#2E3191" : poly.color || "#2E3191",
                      strokeOpacity: poly.isSelected ? 1.0 : 0.6,
                      strokeWeight: poly.isSelected ? 5 : 3,
                      zIndex: poly.isSelected ? 2 : 1
                    }}
                    onClick={() => toggleSelectTravel(poly.travelId)}
                  />
                ))}
                {travelMarkers.map((m, idx) => (
                  <MarkerF
                    key={`tvl-mk-${m.travelId}-${idx}`}
                    position={{ lat: m.lat, lng: m.lng }}
                    onClick={() => {
                      setActiveMarkerId(`tvl-${m.travelId}-${idx}`);
                      if (!selectedTravelIds.includes(m.travelId)) {
                        toggleSelectTravel(m.travelId);
                      }
                    }}
                    icon={{
                      path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
                      fillColor: m.color || "#3b82f6",
                      fillOpacity: 1,
                      strokeWeight: m.isSelected ? 2 : 1,
                      strokeColor: m.isSelected ? "#2E3191" : "#ffffff",
                      scale: m.isSelected ? 1.3 : 1.0,
                      anchor: new window.google.maps.Point(12, 24),
                    }}
                    zIndex={m.isSelected ? 999 : 10}
                  >
                    {activeMarkerId === `tvl-${m.travelId}-${idx}` && (
                      <OverlayViewF position={{ lat: m.lat, lng: m.lng }} mapPaneName="overlayMouseTarget" getPixelPositionOffset={(w, h) => ({ x: -(w / 2), y: -(h + 40) })}>
                        <div className="relative flex w-64 flex-col rounded-xl bg-white shadow-xl ring-1 ring-black/5 p-4 z-50">
                          <button onClick={(e) => { e.stopPropagation(); setActiveMarkerId(null); }} className="absolute right-2 top-2 h-6 w-6 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 hover:text-zinc-900">
                            <span className="sr-only">Fechar</span>
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                          <span className="mb-2 inline-flex items-center rounded-full bg-[#2E3191]/10 px-2 py-1 text-xs font-semibold text-[#2E3191] ring-1 ring-[#2E3191]/20 w-max">Viagem #{m.travelId}</span>
                          <h3 className="text-sm font-bold text-zinc-900 line-clamp-2">{m.point.name.toUpperCase()}</h3>
                          <div className="mt-2 text-xs text-zinc-600 border-t border-zinc-100 pt-2">{m.point.address.city} / {m.point.address.state}</div>
                        </div>
                      </OverlayViewF>
                    )}
                  </MarkerF>
                ))}
              </>
            )}
          </GoogleMap>
        )}
      </div>

      {/* TABLE SECTION */}
      <div className="flex flex-1 min-h-0 flex-col overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-zinc-200">
        <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3 shrink-0 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:w-72 shrink-0">
            <h2 className="text-sm font-medium text-zinc-900 whitespace-nowrap">
              {viewMode === "entregas" ? `Entregas Disponíveis (${invoices.length})` : `Viagens Planejadas (${travels.length})`}
            </h2>
          </div>

          <div className="flex-1 flex justify-start sm:justify-center">
            {viewMode === "entregas" && invoiceStats && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3 text-xs font-medium text-[#2E3191] bg-[#2E3191]/10 px-3 py-1.5 rounded-full ring-1 ring-inset ring-[#2E3191]/20">
                  <span>{invoiceStats.count} nota{invoiceStats.count > 1 ? "s" : ""}</span>
                  <span className="w-1 h-1 rounded-full bg-[#2E3191]/30"></span>
                  <span>{invoiceStats.weight.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg</span>
                  <span className="w-1 h-1 rounded-full bg-[#2E3191]/30"></span>
                  <span>{invoiceStats.volume.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} m³</span>
                </div>
                <button
                  onClick={() => setIsRoutingModalOpen(true)}
                  className="rounded-full bg-[#2E3191] px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-[#1E2266] transition-colors"
                >
                  Roteirizar
                </button>
              </div>
            )}
            {viewMode === "viagens" && travelStats && (
              <div className="flex items-center gap-3 text-xs font-medium text-[#2E3191] bg-[#2E3191]/10 px-3 py-1.5 rounded-full ring-1 ring-inset ring-[#2E3191]/20">
                <span>{travelStats.count} viagem(s)</span>
                <span className="w-1 h-1 rounded-full bg-[#2E3191]/30"></span>
                <span>{travelStats.invoicesCount} NFs</span>
                <span className="w-1 h-1 rounded-full bg-[#2E3191]/30"></span>
                <span>{travelStats.weight.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg</span>
              </div>
            )}
          </div>

          <div className="w-full sm:w-72 shrink-0 flex justify-end">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full rounded-md bg-white border border-zinc-300 px-3 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-500 shadow-sm focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-white">
          <table className="w-full divide-y divide-zinc-200">
            <thead className="bg-zinc-50 sticky top-0 z-20 shadow-[0_1px_0_0_#e4e4e7]">
              {viewMode === "entregas" ? (
                <tr>
                  <th className="px-4 py-3 text-left w-10 bg-zinc-100/80 border-b border-zinc-300">
                    <input type="checkbox" checked={invoices.length > 0 && selectedInvoiceIds.length === invoices.length} onChange={toggleSelectAllInvoices} disabled={invoices.length === 0} className="h-4 w-4 rounded border-zinc-300 text-[#2E3191] focus:ring-[#2E3191]/20 accent-[#2E3191] cursor-pointer" />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-zinc-700 bg-zinc-100/80 border-b border-zinc-300">Número</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-zinc-700 bg-zinc-100/80 border-b border-zinc-300">Destinatário</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-zinc-700 bg-zinc-100/80 border-b border-zinc-300">Emissão</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-zinc-700 bg-zinc-100/80 border-b border-zinc-300">Endereço</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-zinc-700 bg-zinc-100/80 border-b border-zinc-300">Cidade/UF</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-zinc-700 bg-zinc-100/80 border-b border-zinc-300">Valor</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-zinc-700 bg-zinc-100/80 border-b border-zinc-300">Peso</th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-zinc-700 bg-zinc-100/80 border-b border-zinc-300">Status</th>
                </tr>
              ) : (
                <tr>

                  <th className="px-4 py-3 text-left w-10 bg-zinc-100/80 border-b border-zinc-300">
                    <input type="checkbox" checked={travels.length > 0 && selectedTravelIds.length === travels.length} onChange={toggleSelectAllTravels} disabled={travels.length === 0} className="h-4 w-4 rounded border-zinc-300 text-[#2E3191] focus:ring-[#2E3191]/20 accent-[#2E3191] cursor-pointer" />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-zinc-700 bg-zinc-100/80 border-b border-zinc-300">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-zinc-700 bg-zinc-100/80 border-b border-zinc-300">Origem</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-zinc-700 bg-zinc-100/80 border-b border-zinc-300">Início</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-zinc-700 bg-zinc-100/80 border-b border-zinc-300">Fim</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-zinc-700 bg-zinc-100/80 border-b border-zinc-300">Qtd NFs</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-zinc-700 bg-zinc-100/80 border-b border-zinc-300">Qtd Pontos</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-zinc-700 bg-zinc-100/80 border-b border-zinc-300">Distância</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-zinc-700 bg-zinc-100/80 border-b border-zinc-300">Valor</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-zinc-700 bg-zinc-100/80 border-b border-zinc-300">Peso</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-zinc-700 bg-zinc-100/80 border-b border-zinc-300">Cubagem</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {loading ? (
                <tr><td colSpan={15} className="px-4 py-10 text-center text-sm text-zinc-500">Carregando...</td></tr>
              ) : error ? (
                <tr><td colSpan={15} className="px-4 py-10 text-center text-sm text-red-500">{error}</td></tr>
              ) : viewMode === "entregas" ? (
                invoices.length === 0 ? <tr><td colSpan={10} className="px-4 py-10 text-center text-sm text-zinc-500">Nenhuma nota fiscal.</td></tr> :
                invoices.map((row) => (
                  <tr key={row.id} onClick={() => handleInvoiceRowClick(row)} className={`cursor-pointer hover:bg-zinc-50 ${selectedInvoiceIds.includes(row.id) ? "bg-[#2E3191]/5" : ""}`}>
                    <td className="px-4 py-3 text-sm" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedInvoiceIds.includes(row.id)}
                        onChange={() => {
                          toggleSelectInvoice(row.id);
                          if (!selectedInvoiceIds.includes(row.id)) {
                            handleInvoiceRowClick(row);
                          }
                        }}
                        className="h-4 w-4 rounded border-zinc-300 text-[#2E3191] focus:ring-[#2E3191]/20 accent-[#2E3191] cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-zinc-900">{row.number || "—"}</td>
                    <td className="px-4 py-3 text-sm text-zinc-700">{row.recipient?.name || "—"}</td>
                    <td className="px-4 py-3 text-sm text-zinc-700">{formatDate(row.issuedAt)}</td>
                    <td className="px-4 py-3 text-sm text-zinc-700">{row.recipient?.address?.address || "—"}</td>
                    <td className="px-4 py-3 text-sm text-zinc-700">{row.recipient?.address?.city}/{row.recipient?.address?.state}</td>
                    <td className="px-4 py-3 text-right text-sm text-[#2E3191]">{row.value?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                    <td className="px-4 py-3 text-right text-sm text-zinc-700">{row.weight?.toLocaleString("pt-BR")} kg</td>
                    <td className="px-4 py-3 text-center text-sm"><span className="inline-flex rounded-full bg-zinc-100 px-2 text-xs">{row.statusDescription}</span></td>
                  </tr>
                ))
              ) : (
                travels.length === 0 ? <tr><td colSpan={12} className="px-4 py-10 text-center text-sm text-zinc-500">Nenhuma viagem encontrada.</td></tr> :
                travels.map((row) => (
                  <tr key={row.id} onClick={() => handleTravelRowClick(row)} className={`cursor-pointer hover:bg-zinc-50 ${selectedTravelIds.includes(row.id) ? "bg-[#2E3191]/5" : ""}`}>
                    <td className="px-4 py-3 text-sm" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedTravelIds.includes(row.id)}
                        onChange={() => {
                          toggleSelectTravel(row.id);
                          if (!selectedTravelIds.includes(row.id)) {
                            handleTravelRowClick(row);
                          }
                        }}
                        className="h-4 w-4 rounded border-zinc-300 text-[#2E3191] focus:ring-[#2E3191]/20 accent-[#2E3191] cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-zinc-900 flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: row.color || '#2E3191' }}></span>
                       #{row.id}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-700">{row.origin?.address?.city ? `${row.origin.address.city}/${row.origin.address.state}` : row.origin?.name || "—"}</td>
                    <td className="px-4 py-3 text-sm text-zinc-700">{formatDate(row.startDate)}</td>
                    <td className="px-4 py-3 text-sm text-zinc-700">{formatDate(row.endDate)}</td>
                    <td className="px-4 py-3 text-right text-sm text-zinc-700">{row.invoiceQuantity}</td>
                    <td className="px-4 py-3 text-right text-sm text-zinc-700">{row.locationQuantity}</td>
                    <td className="px-4 py-3 text-right text-sm text-zinc-700">{(Number(row.totalDistance) / 1000).toLocaleString("pt-BR")} km</td>
                    <td className="px-4 py-3 text-right text-sm text-[#2E3191] font-medium">{Number(row.totalValue).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                    <td className="px-4 py-3 text-right text-sm text-zinc-700">{Number(row.totalWeight).toLocaleString("pt-BR")} kg</td>
                    <td className="px-4 py-3 text-right text-sm text-zinc-700">{Number(row.totalVolume).toLocaleString("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 4 })} m³</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isRoutingModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 ring-1 ring-black/5 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-zinc-900">Configurar Roteirização</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Selecione a data e hora prevista para o início da viagem.
            </p>

            <div className="mt-6">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                Data e Hora de Início
              </label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E3191]/20 focus:border-[#2E3191] transition-all"
              />
            </div>

            <div className="mt-8 flex items-center justify-end gap-3">
              <button
                disabled={isRouting}
                onClick={() => setIsRoutingModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                disabled={isRouting}
                onClick={() => void handleCreateTravel()}
                className="rounded-xl bg-[#2E3191] px-6 py-2 text-sm font-bold text-white shadow-lg hover:bg-[#1E2266] transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isRouting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processando...
                  </>
                ) : "Confirmar Viagem"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
