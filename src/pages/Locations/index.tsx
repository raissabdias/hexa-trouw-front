import { useEffect, useMemo, useState } from "react";
import { FileText, Plus } from "lucide-react";
import {
  Autocomplete,
  GoogleMap,
  MarkerF,
  useJsApiLoader,
} from "@react-google-maps/api";
import { api, type ApiResponse } from "../../services/api";

function formatCpfCnpj(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  if (digits.length === 14) {
    return digits.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      "$1.$2.$3/$4-$5",
    );
  }
  return value;
}

function formatCep(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length < 8) return value;
  return digits.replace(/^(\d{5})(\d{3})$/, "$1-$2");
}

type LocationApiItem = {
  id?: string | number;
  description?: string;
  person?: {
    name?: string;
    document?: string;
    cpfCnpj?: string;
    cpf?: string;
    cnpj?: string;
  };
  reference?: {
    description?: string;
    address?: string;
    number?: string | number;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  address?: {
    description?: string;
    street?: string;
    number?: string | number;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    cep?: string;
  };
  local?: {
    name?: string;
  };
};

type LocationFormData = {
  name: string;
  document: string;
  latitude: string;
  longitude: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  radius: string;
};

const INITIAL_FORM: LocationFormData = {
  name: "",
  document: "",
  latitude: "",
  longitude: "",
  street: "",
  number: "",
  neighborhood: "",
  city: "",
  state: "",
  zipCode: "",
  radius: "50",
};

const MAPS_LIBRARIES = ["places"];
const DEFAULT_CENTER = { lat: -23.5505, lng: -46.6333 };

function getName(row: LocationApiItem): string {
  return (
    row.person?.name ??
    row.reference?.description ??
    row.description ??
    row.local?.name ??
    "—"
  );
}

function getDocument(row: LocationApiItem): string {
  const raw =
    row.person?.document ??
    row.person?.cpfCnpj ??
    row.person?.cpf ??
    row.person?.cnpj ??
    "";

  if (!raw) return "—";
  return formatCpfCnpj(raw);
}

function getAddressDescription(row: LocationApiItem): string {
  if (row.reference?.address) {
    const parts = [
      row.reference.address,
      row.reference.number != null ? String(row.reference.number) : undefined,
      row.reference.neighborhood,
    ].filter(Boolean);
    return parts.length ? parts.join(", ") : row.reference.address;
  }

  if (row.address?.description) return row.address.description;

  const parts = [
    row.address?.street,
    row.address?.number != null ? String(row.address.number) : undefined,
    row.address?.complement,
    row.address?.neighborhood,
  ].filter(Boolean);

  return parts.length ? parts.join(", ") : "—";
}

function getCityState(row: LocationApiItem): string {
  const city = row.reference?.city ?? row.address?.city;
  const state = row.reference?.state ?? row.address?.state;
  if (!city && !state) return "—";
  if (city && state) return `${city}/${state}`;
  return city ?? state ?? "—";
}

function getZip(row: LocationApiItem): string {
  const raw =
    row.reference?.zipCode ?? row.address?.zipCode ?? row.address?.cep ?? "";
  if (!raw) return "—";
  return formatCep(raw);
}

export default function LocationsIndexPage() {
  const [mode, setMode] = useState<"list" | "create">("list");
  const [rows, setRows] = useState<LocationApiItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<LocationFormData>(INITIAL_FORM);
  const [addressSearch, setAddressSearch] = useState("");
  const [autocomplete, setAutocomplete] = useState<{
    getPlace: () => {
      formatted_address?: string;
      geometry?: { location?: { lat: () => number; lng: () => number } };
      address_components?: Array<{
        long_name: string;
        short_name: string;
        types: string[];
      }>;
    };
  } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const mapsApiKey =
    (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) ?? "";
  const { isLoaded: isMapsLoaded } = useJsApiLoader({
    id: "locations-google-maps",
    googleMapsApiKey: mapsApiKey,
    libraries: MAPS_LIBRARIES as never,
  });

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(total / pageSize));
  }, [total, pageSize]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await api.get<
          ApiResponse<LocationApiItem[]>,
          ApiResponse<LocationApiItem[]>
        >("/locations", {
          params: { page, limit: pageSize, search: search.trim() || undefined },
        });

        if (cancelled) return;
        setRows(data.data ?? []);
        setTotal(data.meta?.total ?? 0);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Erro ao carregar locais.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, search, refreshKey]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  function updateForm<K extends keyof LocationFormData>(
    key: K,
    value: LocationFormData[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function normalizeDocument(value: string): string {
    return value.replace(/\D/g, "");
  }

  function formatDocumentInput(value: string): string {
    const digits = normalizeDocument(value).slice(0, 14);
    if (digits.length <= 11) {
      return digits
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    }
    return digits
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  function formatZipInput(value: string): string {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    return digits.replace(/^(\d{5})(\d)/, "$1-$2");
  }

  function applyPlaceToForm(place: {
    formatted_address?: string;
    geometry?: { location?: { lat: () => number; lng: () => number } };
    address_components?: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;
  }) {
    const components = place.address_components ?? [];
    const getComponent = (type: string, short = false) =>
      components.find((c) => c.types.includes(type))?.[
        short ? "short_name" : "long_name"
      ] ?? "";

    const street = getComponent("route");
    const number = getComponent("street_number");
    const neighborhood =
      getComponent("sublocality_level_1") || getComponent("neighborhood");
    const city = getComponent("administrative_area_level_2") || getComponent("locality");
    const state = getComponent("administrative_area_level_1", true);
    const zipCode = formatZipInput(getComponent("postal_code"));
    const lat = place.geometry?.location?.lat();
    const lng = place.geometry?.location?.lng();

    setForm((prev) => ({
      ...prev,
      street: street || prev.street,
      number: number || prev.number,
      neighborhood: neighborhood || prev.neighborhood,
      city: city || prev.city,
      state: state || prev.state,
      zipCode: zipCode || prev.zipCode,
      latitude: typeof lat === "number" ? String(lat) : prev.latitude,
      longitude: typeof lng === "number" ? String(lng) : prev.longitude,
    }));

    if (place.formatted_address) {
      setAddressSearch(place.formatted_address);
    }
  }

  const mapCenter = useMemo(() => {
    const lat = Number(form.latitude.replace(",", "."));
    const lng = Number(form.longitude.replace(",", "."));
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    return DEFAULT_CENTER;
  }, [form.latitude, form.longitude]);

  async function handleCreateLocation() {
    setFormError(null);

    const doc = normalizeDocument(form.document);
    const requiredFields: Array<[string, string]> = [
      ["Nome", form.name],
      ["Documento (CPF/CNPJ)", doc],
      ["Latitude", form.latitude],
      ["Longitude", form.longitude],
      ["Logradouro", form.street],
      ["Número", form.number],
      ["Bairro", form.neighborhood],
      ["Cidade", form.city],
      ["Estado", form.state],
      ["CEP", form.zipCode],
    ];

    const missing = requiredFields.find(([, value]) => !value?.trim());
    if (missing) {
      setFormError(`O campo "${missing[0]}" é obrigatório.`);
      return;
    }

    if (doc.length !== 11 && doc.length !== 14) {
      setFormError("Documento inválido. Informe um CPF (11) ou CNPJ (14).");
      return;
    }

    const latitude = Number(form.latitude.replace(",", "."));
    const longitude = Number(form.longitude.replace(",", "."));
    const radius = Number(form.radius || "50");

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      setFormError("Latitude e longitude devem ser números válidos.");
      return;
    }

    if (Number.isNaN(radius) || radius <= 0) {
      setFormError("Raio deve ser um número maior que zero.");
      return;
    }

    const person =
      doc.length === 11
        ? { name: form.name.trim(), cpf: doc }
        : { name: form.name.trim(), cnpj: doc };

    try {
      setSaving(true);

      await api.post<ApiResponse<unknown>, ApiResponse<unknown>>("/locations", {
        person,
        address: {
          latitude,
          longitude,
          street: form.street.trim(),
          number: form.number.trim(),
          neighborhood: form.neighborhood.trim(),
          city: form.city.trim(),
          state: form.state.trim().toUpperCase(),
          zipCode: form.zipCode.trim(),
        },
        local: {
          radius,
        },
      });

      setForm(INITIAL_FORM);
      setAddressSearch("");
      setMode("list");
      setPage(1);
      setRefreshKey((v) => v + 1);
    } catch (e) {
      setFormError(
        e instanceof Error ? e.message : "Erro ao cadastrar local.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (mode === "create") {
    return (
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              Novo Local
            </h1>
            <p className="mt-1 text-sm text-zinc-600">
              Preencha os campos obrigatórios para cadastrar.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setMode("list");
              setFormError(null);
            }}
            className="rounded-md bg-white px-3 py-2 text-sm font-medium text-zinc-900 ring-1 ring-zinc-200 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={saving}
          >
            Voltar
          </button>
        </div>

        <div className="mt-4 rounded-lg bg-white p-4 shadow-sm ring-1 ring-zinc-200 sm:p-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Nome *
              </label>
              <input
                value={form.name}
                onChange={(e) => updateForm("name", e.target.value)}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                placeholder="Ex.: TRANSPORTADORA TREVO 3 LTDA"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                CPF/CNPJ *
              </label>
              <input
                value={form.document}
                onChange={(e) =>
                  updateForm("document", formatDocumentInput(e.target.value))
                }
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Raio (m)
              </label>
              <input
                value={form.radius}
                onChange={(e) => updateForm("radius", e.target.value)}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                placeholder="50"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Latitude *
              </label>
              <input
                value={form.latitude}
                onChange={(e) => updateForm("latitude", e.target.value)}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                placeholder="-23.5505"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Longitude *
              </label>
              <input
                value={form.longitude}
                onChange={(e) => updateForm("longitude", e.target.value)}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                placeholder="-46.6333"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Logradouro *
              </label>
              <input
                value={form.street}
                onChange={(e) => updateForm("street", e.target.value)}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                placeholder="Avenida das Nacoes Unidas"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Número *
              </label>
              <input
                value={form.number}
                onChange={(e) => updateForm("number", e.target.value)}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                placeholder="12901"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Bairro *
              </label>
              <input
                value={form.neighborhood}
                onChange={(e) => updateForm("neighborhood", e.target.value)}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                placeholder="Brooklin Novo"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Cidade *
              </label>
              <input
                value={form.city}
                onChange={(e) => updateForm("city", e.target.value)}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                placeholder="São Paulo"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Estado *
              </label>
              <input
                value={form.state}
                onChange={(e) => updateForm("state", e.target.value.toUpperCase())}
                maxLength={2}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm uppercase outline-none focus:border-zinc-900"
                placeholder="SP"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                CEP *
              </label>
              <input
                value={form.zipCode}
                onChange={(e) => updateForm("zipCode", formatZipInput(e.target.value))}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                placeholder="04578-000"
              />
            </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">
                    Buscar endereço no mapa
                  </label>
                  {isMapsLoaded && mapsApiKey ? (
                    <Autocomplete
                      onLoad={(instance) =>
                        setAutocomplete(instance as unknown as typeof autocomplete)
                      }
                      onPlaceChanged={() => {
                        const place = autocomplete?.getPlace();
                        if (place) applyPlaceToForm(place);
                      }}
                    >
                      <input
                        value={addressSearch}
                        onChange={(e) => setAddressSearch(e.target.value)}
                        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                        placeholder="Digite o endereço para buscar no Google Maps"
                      />
                    </Autocomplete>
                  ) : (
                    <input
                      value={addressSearch}
                      onChange={(e) => setAddressSearch(e.target.value)}
                      className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                      placeholder="Defina VITE_GOOGLE_MAPS_API_KEY para habilitar o mapa"
                    />
                  )}
                  {!mapsApiKey ? (
                    <p className="mt-1 text-xs text-amber-700">
                      Google Maps desabilitado: configure `VITE_GOOGLE_MAPS_API_KEY`.
                    </p>
                  ) : null}
                </div>

                <div className="overflow-hidden rounded-lg border border-zinc-200">
                  {isMapsLoaded && mapsApiKey ? (
                    <GoogleMap
                      center={mapCenter}
                      zoom={15}
                      mapContainerStyle={{ width: "100%", height: "420px" }}
                      options={{ streetViewControl: false, mapTypeControl: false }}
                    >
                      <MarkerF position={mapCenter} />
                    </GoogleMap>
                  ) : (
                    <div className="flex h-[420px] items-center justify-center bg-zinc-100 text-sm text-zinc-500">
                      Mapa indisponivel sem chave da API do Google Maps.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {formError ? (
            <p className="mt-4 text-sm text-red-600">{formError}</p>
          ) : null}

          <div className="mt-6 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setMode("list");
                setFormError(null);
              }}
              className="rounded-md bg-white px-4 py-2 text-sm font-medium text-zinc-900 ring-1 ring-zinc-200 hover:bg-zinc-50"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleCreateLocation()}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={saving}
            >
              {saving ? "Salvando..." : "Salvar Local"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Locais
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Listagem de locais cadastrados.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="sm:w-80">
            <label className="sr-only" htmlFor="locations-search">
              Buscar
            </label>
            <input
              id="locations-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, documento, endereço..."
              className="w-full rounded-md bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm ring-1 ring-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
            />
          </div>

          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-200 hover:bg-zinc-50"
            onClick={() => {
              // placeholder (rota/modal virá depois)
            }}
            aria-label="Importar/relatórios"
            title="Importar/relatórios"
          >
            <FileText className="h-4 w-4" />
            Documentos
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-zinc-800"
            onClick={() => {
              setMode("create");
              setFormError(null);
            }}
            aria-label="Novo local"
            title="Novo local"
          >
            <Plus className="h-4 w-4" />
            Novo
          </button>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-zinc-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
                    Nome
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
                    CPF/CNPJ
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
                    Descrição do Endereço
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
                    Cidade/Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
                    CEP
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-200">
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-sm text-zinc-600"
                    >
                      Carregando...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-sm text-red-600"
                    >
                      {error}
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-sm text-zinc-600"
                    >
                      Nenhum local encontrado.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, idx) => (
                    <tr key={String(row.id ?? idx)} className="hover:bg-zinc-50">
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-zinc-900">
                        {getName(row)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-700">
                        {getDocument(row)}
                      </td>
                      <td className="min-w-[24rem] px-4 py-3 text-sm text-zinc-700">
                        {getAddressDescription(row)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-700">
                        {getCityState(row)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-700">
                        {getZip(row)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-zinc-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-zinc-600">
              Total: <span className="font-medium text-zinc-900">{total}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-md bg-white px-3 py-2 text-sm font-medium text-zinc-900 ring-1 ring-zinc-200 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
              >
                Anterior
              </button>
              <div className="text-sm text-zinc-700">
                Página <span className="font-medium text-zinc-900">{page}</span>{" "}
                de{" "}
                <span className="font-medium text-zinc-900">{totalPages}</span>
              </div>
              <button
                type="button"
                className="rounded-md bg-white px-3 py-2 text-sm font-medium text-zinc-900 ring-1 ring-zinc-200 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
              >
                Próxima
              </button>
            </div>
          </div>
        </div>
    </div>
  );
}

