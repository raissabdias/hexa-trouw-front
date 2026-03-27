import { useEffect, useMemo, useState } from "react";
import { FileText, Plus } from "lucide-react";
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
  return row.reference?.zipCode ?? row.address?.zipCode ?? row.address?.cep ?? "—";
}

export default function LocationsIndexPage() {
  const [rows, setRows] = useState<LocationApiItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [search, setSearch] = useState("");

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
  }, [page, pageSize, search]);

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
              // placeholder (rota/modal virá depois)
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

