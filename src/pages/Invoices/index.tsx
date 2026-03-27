import { useEffect, useMemo, useState } from "react";
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

export default function InvoicesIndexPage() {
  const [rows, setRows] = useState<InvoiceApiItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  }, [page, pageSize, search, refreshKey]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [search]);

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
              className="w-full rounded-md bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm ring-1 ring-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
            />
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-zinc-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
                  Número
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
                  Destinatário
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
                  Cidade/UF
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-600">
                  Peso
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-600">
                  Volume
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-zinc-600">
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
                    <td className="px-4 py-3 text-sm text-zinc-700">
                      {row.recipient?.name ? (
                        <span className="line-clamp-2 max-w-[16rem] md:max-w-none">
                          {row.recipient.name}
                        </span>
                      ) : (
                        "—"
                      )}
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
                          {row.volume.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
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
