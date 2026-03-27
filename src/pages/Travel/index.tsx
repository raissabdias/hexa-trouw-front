import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  GoogleMap,
  MarkerF,
  OverlayViewF,
  useJsApiLoader,
  MarkerClustererF,
} from "@react-google-maps/api";
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
  });
}

function formatCep(value: string | undefined): string {
  if (!value) return "—";
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length < 8) return value;
  return digits.replace(/^(\d{5})(\d{3})$/, "$1-$2");
}

export default function TravelIndexPage() {
  const [invoices, setInvoices] = useState<InvoiceApiItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const [activeMarkerId, setActiveMarkerId] = useState<number | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);

  const mapsApiKey =
    (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) ?? "";
  const { isLoaded: isMapsLoaded } = useJsApiLoader({
    id: "locations-google-maps",
    googleMapsApiKey: mapsApiKey,
    libraries: MAPS_LIBRARIES as never,
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await api.get<
          ApiResponse<InvoiceApiItem[]>,
          ApiResponse<InvoiceApiItem[]>
        >("/invoices", {
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

    const timer = setTimeout(() => {
      void load();
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search]);

  const handleRowClick = useCallback((invoice: InvoiceApiItem) => {
    setActiveMarkerId(invoice.id);
    const latStr = invoice.recipient?.address?.latitude;
    const lngStr = invoice.recipient?.address?.longitude;

    if (latStr && lngStr) {
      const lat = Number(latStr);
      const lng = Number(lngStr);
      if (!Number.isNaN(lat) && !Number.isNaN(lng) && mapRef.current) {
        mapRef.current.panTo({ lat, lng });
        mapRef.current.setZoom(14);
      }
    }
  }, []);

  const toggleSelectAll = () => {
    if (selectedIds.length === invoices.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(invoices.map((inv) => inv.id));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const displayMarkers = useMemo(() => {
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
          // Deslocamento em espiral (Jittering) de ~15 metros (0.00015 lat/lng) para afastar pinos perfeitamente sobrepostos
          const radius = 0.00015 * Math.ceil(count / 6); 
          const angle = count * (Math.PI / 3); // 60 graus
          lat += radius * Math.cos(angle);
          lng += radius * Math.sin(angle);
        }
        
        coordinateCounts.set(key, count + 1);
        
        return { ...inv, displayLat: lat, displayLng: lng };
      });
  }, [invoices]);

  useEffect(() => {
    if (mapInstance && displayMarkers.length > 0 && window.google) {
      const bounds = new window.google.maps.LatLngBounds();
      displayMarkers.forEach((inv) => {
        bounds.extend(new window.google.maps.LatLng(inv.displayLat, inv.displayLng));
      });
      mapInstance.fitBounds(bounds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapInstance, invoices.length]);

  const selectionStats = useMemo(() => {
    if (selectedIds.length === 0) return null;
    
    const selected = invoices.filter(inv => selectedIds.includes(inv.id));
    
    const weight = selected.reduce((acc, inv) => acc + (inv.weight ?? 0), 0);
    const volume = selected.reduce((acc, inv) => acc + (inv.volume ?? 0), 0);
    
    return {
      count: selectedIds.length,
      weight,
      volume: volume / 1000000
    };
  }, [selectedIds, invoices]);

  return (
    <div className="flex flex-1 flex-col gap-4 min-h-0">
      {/* MAPA - TOP HALF */}
      <div className="flex-1 min-h-0 overflow-hidden rounded-lg bg-zinc-100 ring-1 ring-zinc-200">
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
            <MarkerClustererF>
              {(clusterer) => (
                <>
                  {displayMarkers.filter(inv => !selectedIds.includes(inv.id)).map((inv) => {
                    const lat = inv.displayLat;
                    const lng = inv.displayLng;

                    return (
                      <MarkerF
                        key={inv.id}
                        position={{ lat, lng }}
                        clusterer={clusterer}
                        onClick={() => handleRowClick(inv)}
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
                        {activeMarkerId === inv.id && (
                          <OverlayViewF
                            position={{ lat, lng }}
                            mapPaneName="overlayMouseTarget"
                            getPixelPositionOffset={(width, height) => ({
                              x: -(width / 2),
                              y: -(height + 40),
                            })}
                          >
                            <div className="relative flex w-64 flex-col rounded-xl bg-white shadow-xl ring-1 ring-black/5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMarkerId(null);
                                }}
                                className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 focus:outline-none transition-colors"
                              >
                                <span className="sr-only">Fechar</span>
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>

                              <div className="p-4">
                                <span className="mb-2 inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                                  Nota {inv.number}
                                </span>
                                <h3 className="text-sm font-bold text-zinc-900 line-clamp-2 mt-1">
                                  {inv.recipient?.name?.toUpperCase() || "—"}
                                </h3>
                                
                                <div className="mt-3 flex flex-col gap-1.5 border-t border-zinc-100 pt-3">
                                  <div className="flex items-start gap-2 text-xs text-zinc-600">
                                    <svg className="h-4 w-4 shrink-0 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span className="leading-tight">
                                      {inv.recipient?.address?.city} / {inv.recipient?.address?.state}
                                    </span>
                                  </div>
                                  
                                  <div className="mt-2 flex items-center justify-between font-medium">
                                    <span className="text-xs text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md">
                                      Peso: {inv.weight != null ? inv.weight.toLocaleString('pt-BR') : "—"}kg
                                    </span>
                                    <span className="text-sm text-emerald-600">
                                      {inv.value?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-b border-r border-black/5 bg-white" />
                            </div>
                          </OverlayViewF>
                        )}
                      </MarkerF>
                    );
                  })}
                </>
              )}
            </MarkerClustererF>
            
            {/* PINOS SELECIONADOS NO TOPO SEM SER ABSORVIDOS: */}
            {displayMarkers.filter(inv => selectedIds.includes(inv.id)).map((inv) => {
              const lat = inv.displayLat;
              const lng = inv.displayLng;

              return (
                <MarkerF
                  key={`selected-${inv.id}`}
                  position={{ lat, lng }}
                  onClick={() => handleRowClick(inv)}
                  icon={{
                    path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
                    fillColor: "#059669",
                    fillOpacity: 1,
                    strokeWeight: 2,
                    strokeColor: "#ffffff",
                    scale: 1.5,
                    anchor: new window.google.maps.Point(12, 24),
                  }}
                  zIndex={999}
                >
                  {activeMarkerId === inv.id && (
                    <OverlayViewF
                      position={{ lat, lng }}
                      mapPaneName="overlayMouseTarget"
                      getPixelPositionOffset={(width, height) => ({
                        x: -(width / 2),
                        y: -(height + 40),
                      })}
                    >
                      <div className="relative flex w-64 flex-col rounded-xl bg-white shadow-xl ring-1 ring-black/5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMarkerId(null);
                          }}
                          className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 focus:outline-none transition-colors"
                        >
                          <span className="sr-only">Fechar</span>
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>

                        <div className="p-4">
                          <span className="mb-2 inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                            Nota {inv.number}
                          </span>
                          <h3 className="text-sm font-bold text-zinc-900 line-clamp-2 mt-1">
                            {inv.recipient?.name?.toUpperCase() || "—"}
                          </h3>
                          
                          <div className="mt-3 flex flex-col gap-1.5 border-t border-zinc-100 pt-3">
                            <div className="flex items-start gap-2 text-xs text-zinc-600">
                              <svg className="h-4 w-4 shrink-0 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <span className="leading-tight">
                                {inv.recipient?.address?.city} / {inv.recipient?.address?.state}
                              </span>
                            </div>
                            
                            <div className="mt-2 flex items-center justify-between font-medium">
                              <span className="text-xs text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md">
                                Peso: {inv.weight != null ? inv.weight.toLocaleString('pt-BR') : "—"}kg
                              </span>
                              <span className="text-sm text-emerald-600">
                                {inv.value?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-b border-r border-black/5 bg-white" />
                      </div>
                    </OverlayViewF>
                  )}
                </MarkerF>
              );
            })}
          </GoogleMap>
        )}
      </div>

      {/* TABELA - BOTTOM HALF */}
      <div className="flex flex-1 min-h-0 flex-col overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-zinc-200">
        <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3 shrink-0 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:w-72 shrink-0">
            <h2 className="text-sm font-medium text-zinc-900 whitespace-nowrap">
              Entregas Disponíveis ({invoices.length})
            </h2>
          </div>

          <div className="flex-1 flex justify-start sm:justify-center">
            {selectionStats && (
              <div className="flex items-center gap-3 text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full ring-1 ring-inset ring-emerald-600/20">
                <span>{selectionStats.count} nota{selectionStats.count > 1 ? "s" : ""}</span>
                <span className="w-1 h-1 rounded-full bg-emerald-300"></span>
                <span>{selectionStats.weight.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg</span>
                <span className="w-1 h-1 rounded-full bg-emerald-300"></span>
                <span>{selectionStats.volume.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} m³</span>
              </div>
            )}
          </div>

          <div className="w-full sm:w-72 shrink-0 flex justify-end">
            <label htmlFor="search-travel-invoices" className="sr-only">
              Buscar notas
            </label>
            <input
              id="search-travel-invoices"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por número, destinatário..."
              className="w-full rounded-md bg-white border border-zinc-300 px-3 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-500 shadow-sm focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="min-w-max divide-y divide-zinc-200">
            <thead className="bg-zinc-50 sticky top-0 z-10 shadow-[0_1px_0_0_#e4e4e7]">
              <tr>
                <th className="px-4 py-3 text-left w-10 bg-zinc-50">
                  <input
                    type="checkbox"
                    checked={invoices.length > 0 && selectedIds.length === invoices.length}
                    onChange={toggleSelectAll}
                    disabled={invoices.length === 0}
                    className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 bg-zinc-50">
                  Número
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 bg-zinc-50">
                  Destinatário
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 bg-zinc-50">
                  Emissão
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 bg-zinc-50">
                  Prev. Entrega
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 bg-zinc-50">
                  Endereço
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 bg-zinc-50">
                  Nº
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 bg-zinc-50">
                  Bairro
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 bg-zinc-50">
                  CEP
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 bg-zinc-50">
                  Cidade/UF
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-600 bg-zinc-50">
                  Valor
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-600 bg-zinc-50">
                  Peso
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-600 bg-zinc-50">
                  Volume
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-zinc-600 bg-zinc-50">
                  Status
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-200">
              {loading ? (
                <tr>
                  <td colSpan={14} className="px-4 py-10 text-center text-sm text-zinc-600">
                    Carregando notas...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={14} className="px-4 py-10 text-center text-sm text-red-600">
                    {error}
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-4 py-10 text-center text-sm text-zinc-600">
                    Nenhuma nota fiscal encontrada.
                  </td>
                </tr>
              ) : (
                invoices.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => handleRowClick(row)}
                    className={`cursor-pointer transition-colors hover:bg-zinc-50 ${
                      activeMarkerId === row.id ? "bg-zinc-100" : ""
                    } ${selectedIds.includes(row.id) ? "bg-emerald-50/50" : ""}`}
                  >
                    <td className="px-4 py-3 text-sm w-10" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(row.id)}
                        onChange={() => toggleSelect(row.id)}
                        className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 cursor-pointer"
                      />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-zinc-900">
                      {row.number || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-zinc-700">
                      {row.recipient?.name || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-700">
                      {formatDate(row.issuedAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-700">
                      {formatDate(row.scheduledDelivery)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-700">
                      {row.recipient?.address?.address || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-700">
                      {row.recipient?.address?.number || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-700">
                      {row.recipient?.address?.neighborhood || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-700">
                      {formatCep(row.recipient?.address?.zipCode) || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-700">
                      {row.recipient?.address?.city && row.recipient?.address?.state
                        ? `${row.recipient.address.city}/${row.recipient.address.state}`
                        : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-emerald-700 font-medium">
                      {row.value != null ? (
                        row.value.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-zinc-700">
                      {row.weight != null ? (
                        <span>
                          {row.weight.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                          <span className="ml-1 text-xs text-zinc-500">kg</span>
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-zinc-700">
                      {row.volume != null ? (
                        <span>
                          {(row.volume / 1000000).toLocaleString("pt-BR", {
                            minimumFractionDigits: 4,
                            maximumFractionDigits: 4,
                          })}
                          <span className="ml-1 text-xs text-zinc-500">m³</span>
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-center text-sm">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          row.statusDescription === "Autorizada"
                            ? "bg-emerald-100 text-emerald-700"
                            : row.statusDescription === "Pendente"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-zinc-100 text-zinc-700"
                        }`}
                      >
                        {row.statusDescription || "—"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
