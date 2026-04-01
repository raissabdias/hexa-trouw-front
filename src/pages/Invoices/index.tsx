import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { api, type ApiResponse } from "../../services/api";

type InvoiceApiItem = {
  id: number;
  number: string;
  series: string | null;
  value: number | null;
  weight: number | null;
  volume: number | null;
  recipientId: number | null;
  companyId: number | null;
  statusId: number;
  isActive: boolean;
  issuedAt: string | null;
  scheduledDelivery: string | null;
  createdAt: string;
  updatedAt: string | null;
  statusDescription: string;
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

type LocationApiItem = {
  id?: string | number;
  personId?: string | number;
  description?: string;
  person?: {
    id?: string | number;
    name?: string;
    document?: string;
    cpfCnpj?: string;
    cpf?: string;
    cnpj?: string;
  };
  reference?: {
    description?: string;
  };
  local?: {
    name?: string;
  };
};

function getLocationName(row: LocationApiItem): string {
  return (
    row.person?.name ??
    row.reference?.description ??
    row.description ??
    row.local?.name ??
    "—"
  );
}

function formatOnlyNumbers(value: string): string {
  return value.replace(/\D/g, "");
}

function formatDecimal(value: string): string {
  let val = value.replace(/[^\d.,]/g, "");
  val = val.replace(/\./g, ",");
  const parts = val.split(",");
  if (parts.length > 2) {
    val = parts[0] + "," + parts.slice(1).join("");
  }
  return val;
}

type InvoiceFormData = {
  number: string;
  series: string;
  value: string;
  weight: string;
  volume: string;
  recipientId: string;
  issuedAt: string;
  scheduledDelivery: string;
};

const INITIAL_FORM: InvoiceFormData = {
  number: "",
  series: "1",
  value: "",
  weight: "",
  volume: "",
  recipientId: "",
  issuedAt: "",
  scheduledDelivery: "",
};

export default function InvoicesIndexPage() {
  const [mode, setMode] = useState<"list" | "create">("list");

  // Lista States
  const [rows, setRows] = useState<InvoiceApiItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form States
  const [form, setForm] = useState<InvoiceFormData>(INITIAL_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [locations, setLocations] = useState<LocationApiItem[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(total / pageSize));
  }, [total, pageSize]);

  // Load List
  useEffect(() => {
    if (mode !== "list") return;

    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await api.get<
          ApiResponse<InvoiceApiItem[]>,
          ApiResponse<InvoiceApiItem[]>
        >("/invoices", {
          params: { page, limit: pageSize, search: search.trim() || undefined },
        });

        if (cancelled) return;
        setRows(data.data ?? []);
        setTotal(data.meta?.total ?? 0);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Erro ao carregar notas fiscais.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, search, refreshKey, mode]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  // Load Locations for Select
  useEffect(() => {
    if (mode !== "create") return;
    let cancelled = false;

    async function loadLocations() {
      setLoadingLocations(true);
      try {
        const data = await api.get<
          ApiResponse<LocationApiItem[]>,
          ApiResponse<LocationApiItem[]>
        >("/locations", { params: { limit: 100, page: 1 } });
        if (cancelled) return;
        setLocations(data.data ?? []);
      } catch (e) {
        console.error("Erro carregando locais", e);
      } finally {
        if (!cancelled) setLoadingLocations(false);
      }
    }

    void loadLocations();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  function updateForm<K extends keyof InvoiceFormData>(key: K, value: InvoiceFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleCreateInvoice() {
    setFormError(null);

    const requiredFields: Array<[string, string]> = [
      ["Número", form.number],
      ["Série", form.series],
      ["Valor", form.value],
      ["Peso", form.weight],
      ["Volume", form.volume],
      ["Destinatário", form.recipientId],
    ];

    const missing = requiredFields.find(([, val]) => !val?.trim());
    if (missing) {
      setFormError(`O campo "${missing[0]}" é obrigatório.`);
      return;
    }

    const valueNum = Number(form.value.replace(",", "."));
    const weightNum = Number(form.weight.replace(",", "."));
    const volumeNum = Number(form.volume.replace(",", "."));

    if (Number.isNaN(valueNum) || Number.isNaN(weightNum) || Number.isNaN(volumeNum)) {
      setFormError("Valores numéricos (Valor, Peso, Volume) inválidos.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        number: form.number.trim(),
        series: form.series.trim(),
        value: valueNum,
        weight: weightNum,
        volume: Math.round(volumeNum * 1000000),
        recipientId: Number(form.recipientId),
        issuedAt: form.issuedAt ? new Date(form.issuedAt).toISOString() : undefined,
        scheduledDelivery: form.scheduledDelivery ? new Date(form.scheduledDelivery).toISOString() : undefined,
      };

      await api.post<ApiResponse<unknown>, ApiResponse<unknown>>("/invoices", payload);

      setForm(INITIAL_FORM);
      setMode("list");
      setPage(1);
      setRefreshKey((v) => v + 1);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Erro ao cadastrar nota fiscal.");
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
              Nova Nota Fiscal
            </h1>
            <p className="mt-1 text-sm text-zinc-600">
              Preencha os campos abaixo para cadastrar uma NFe.
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
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">

            <div className="sm:col-span-2 lg:col-span-4">
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Destinatário *
              </label>
              <select
                value={form.recipientId}
                onChange={(e) => updateForm("recipientId", e.target.value)}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-[#2E3191] focus:ring-2 focus:ring-[#2E3191]/20"
                disabled={loadingLocations}
              >
                <option value="">
                  {loadingLocations ? "Carregando locais..." : "Selecione um destinatário"}
                </option>
                {locations.map((loc) => {
                  const personId = loc.personId ?? loc.person?.id;
                  if (!personId) return null;

                  return (
                    <option key={String(loc.id)} value={String(personId)}>
                      {getLocationName(loc)}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Número *
              </label>
              <input
                value={form.number}
                onChange={(e) => updateForm("number", formatOnlyNumbers(e.target.value))}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-[#2E3191] focus:ring-2 focus:ring-[#2E3191]/20"
                placeholder="Ex: 125001"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Série *
              </label>
              <input
                value={form.series}
                onChange={(e) => updateForm("series", formatOnlyNumbers(e.target.value))}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-[#2E3191] focus:ring-2 focus:ring-[#2E3191]/20"
                placeholder="Ex: 1"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Valor Total (R$) *
              </label>
              <input
                value={form.value}
                onChange={(e) => updateForm("value", formatDecimal(e.target.value))}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-[#2E3191] focus:ring-2 focus:ring-[#2E3191]/20"
                placeholder="1500,50"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Peso (kg) *
              </label>
              <input
                value={form.weight}
                onChange={(e) => updateForm("weight", formatDecimal(e.target.value))}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-[#2E3191] focus:ring-2 focus:ring-[#2E3191]/20"
                placeholder="10,75"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Volume (m³) *
              </label>
              <input
                value={form.volume}
                onChange={(e) => updateForm("volume", formatDecimal(e.target.value))}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-[#2E3191] focus:ring-2 focus:ring-[#2E3191]/20"
                placeholder="0,50"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Data de Emissão
              </label>
              <input
                type="datetime-local"
                value={form.issuedAt}
                onChange={(e) => updateForm("issuedAt", e.target.value)}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-[#2E3191] focus:ring-2 focus:ring-[#2E3191]/20"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Previsão de Entrega
              </label>
              <input
                type="datetime-local"
                value={form.scheduledDelivery}
                onChange={(e) => updateForm("scheduledDelivery", e.target.value)}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-[#2E3191] focus:ring-2 focus:ring-[#2E3191]/20"
              />
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
              onClick={() => void handleCreateInvoice()}
              className="rounded-md bg-[#2E3191] px-4 py-2 text-sm font-medium text-white hover:bg-[#2E3191] disabled:cursor-not-allowed disabled:opacity-70 transition-colors"
              disabled={saving}
            >
              {saving ? "Salvando..." : "Salvar Nota"}
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
            Notas Fiscais
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Listagem de notas fiscais emitidas ou recebidas.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="sm:w-80">
            <label className="sr-only" htmlFor="invoices-search">
              Buscar
            </label>
            <input
              id="invoices-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por número, destinatário..."
              className="w-full rounded-md bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm ring-1 ring-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#2E3191]/20 focus:border-[#2E3191]"
            />
          </div>

          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md bg-[#2E3191] px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#2E3191] transition-colors"
            onClick={() => {
              setMode("create");
              setFormError(null);
            }}
            aria-label="Nova nota fiscal"
            title="Nova nota fiscal"
          >
            <Plus className="h-4 w-4" />
            Novo
          </button>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-zinc-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200">
            <thead className="bg-zinc-100/80 border-b border-zinc-300">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-zinc-700">
                  Número
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-zinc-700">
                  Destinatário
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-zinc-700">
                  Cidade/UF
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-zinc-700">
                  Peso
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-zinc-700">
                  Volume
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-zinc-700">
                  Status
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-200">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm text-zinc-600"
                  >
                    Carregando...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm text-red-600"
                  >
                    {error}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm text-zinc-600"
                  >
                    Nenhuma nota fiscal encontrada.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="hover:bg-zinc-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-zinc-900">
                      {row.number || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-700">
                      {row.recipient?.name || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-700">
                      {row.recipient?.address?.city && row.recipient?.address?.state
                        ? `${row.recipient.address.city}/${row.recipient.address.state}`
                        : row.recipient?.address?.city || row.recipient?.address?.state || "—"}
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
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${row.statusDescription === "Autorizada"
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
              de <span className="font-medium text-zinc-900">{totalPages}</span>
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
