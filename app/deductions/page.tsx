"use client";

import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { DeductionRecord } from "@/app/lib/types";

function uniqueValues(rows: DeductionRecord[], key: keyof DeductionRecord): string[] {
  return Array.from(new Set(rows.map((row) => String(row[key])))).sort();
}

export default function DeductionsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<DeductionRecord[]>([]);
  const [loadingError, setLoadingError] = useState(false);
  const [distributorFilter, setDistributorFilter] = useState("All");
  const [retailerFilter, setRetailerFilter] = useState("All");
  const [codeFilter, setCodeFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  useEffect(() => {
    async function loadDeductions() {
      const { data, error } = await supabase.from("deductions").select("*");

      if (error) {
        setRows([]);
        setLoadingError(true);
        return;
      }

      if (!data || data.length === 0) {
        setRows([]);
        setLoadingError(false);
        return;
      }

      const mappedRows: DeductionRecord[] = data.map((item: Record<string, unknown>) => ({
        id: String(item.id ?? crypto.randomUUID()),
        distributor: String(item.distributor ?? ""),
        retailer: String(item.retailer ?? ""),
        invoiceNumber: String(item.invoiceNumber ?? item.invoice_number ?? ""),
        deductionCode: String(item.deductionCode ?? item.deduction_code ?? ""),
        deductionType: String(item.deductionType ?? item.deduction_type ?? ""),
        reason: String(item.reason ?? ""),
        amount: Number(item.amount ?? 0),
        date: String(item.date ?? ""),
        flagged: Boolean(item.flagged ?? item.is_flagged ?? false),
        disputeStatus: normalizeDisputeStatus(item.disputeStatus ?? item.dispute_status),
      }));

      setRows(mappedRows);
      setLoadingError(false);
    }

    loadDeductions();
  }, []);

  const distributors = ["All", ...uniqueValues(rows, "distributor")];
  const retailers = ["All", ...uniqueValues(rows, "retailer")];
  const codes = ["All", ...uniqueValues(rows, "deductionCode")];
  const types = ["All", ...uniqueValues(rows, "deductionType")];
  const statuses = ["All", ...uniqueValues(rows, "disputeStatus")];

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (distributorFilter !== "All" && row.distributor !== distributorFilter) {
        return false;
      }
      if (retailerFilter !== "All" && row.retailer !== retailerFilter) {
        return false;
      }
      if (codeFilter !== "All" && row.deductionCode !== codeFilter) {
        return false;
      }
      if (typeFilter !== "All" && row.deductionType !== typeFilter) {
        return false;
      }
      if (statusFilter !== "All" && row.disputeStatus !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [codeFilter, distributorFilter, retailerFilter, rows, statusFilter, typeFilter]);

  const allVisibleSelected =
    filteredRows.length > 0 && filteredRows.every((row) => selectedRows.includes(row.id));

  const toggleRow = (id: string) => {
    setSelectedRows((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const toggleAllVisibleRows = () => {
    setSelectedRows((current) => {
      if (allVisibleSelected) {
        return current.filter((id) => !filteredRows.some((row) => row.id === id));
      }
      const visibleIds = filteredRows.map((row) => row.id);
      return Array.from(new Set([...current, ...visibleIds]));
    });
  };

  const startDispute = () => {
    const params = new URLSearchParams();
    params.set("ids", selectedRows.join(","));
    router.push(`/disputes/new?${params.toString()}`);
  };

  return (
    <main className="min-h-screen bg-white px-6 py-8 text-gray-900 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Deductions</h1>
            <p className="mt-1 text-sm text-slate-500">
              Review, filter, and select deductions to begin disputes.
            </p>
          </div>
          <button
            type="button"
            onClick={startDispute}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={selectedRows.length === 0}
          >
            Start Dispute {selectedRows.length > 0 ? `(${selectedRows.length})` : ""}
          </button>
        </header>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <FilterSelect
              label="Distributor"
              value={distributorFilter}
              options={distributors}
              onChange={setDistributorFilter}
            />
            <FilterSelect
              label="Retailer"
              value={retailerFilter}
              options={retailers}
              onChange={setRetailerFilter}
            />
            <FilterSelect
              label="Deduction Code"
              value={codeFilter}
              options={codes}
              onChange={setCodeFilter}
            />
            <FilterSelect
              label="Type"
              value={typeFilter}
              options={types}
              onChange={setTypeFilter}
            />
            <FilterSelect
              label="Status"
              value={statusFilter}
              options={statuses}
              onChange={setStatusFilter}
            />
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label="Select all visible rows"
                      checked={allVisibleSelected}
                      onChange={toggleAllVisibleRows}
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                    />
                  </th>
                  <th className="px-4 py-3">distributor</th>
                  <th className="px-4 py-3">retailer</th>
                  <th className="px-4 py-3">invoice number</th>
                  <th className="px-4 py-3">deduction code</th>
                  <th className="px-4 py-3">deduction type</th>
                  <th className="px-4 py-3">reason</th>
                  <th className="px-4 py-3">amount</th>
                  <th className="px-4 py-3">date</th>
                  <th className="px-4 py-3">flagged</th>
                  <th className="px-4 py-3">dispute status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredRows.map((row) => {
                  const isSelected = selectedRows.includes(row.id);
                  return (
                    <tr
                      key={row.id}
                      className={isSelected ? "bg-slate-50" : "hover:bg-slate-50/70"}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          aria-label={`Select row ${row.invoiceNumber}`}
                          checked={isSelected}
                          onChange={() => toggleRow(row.id)}
                          className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                        />
                      </td>
                      <td className="px-4 py-3">{row.distributor}</td>
                      <td className="px-4 py-3">{row.retailer}</td>
                      <td className="px-4 py-3">{row.invoiceNumber}</td>
                      <td className="px-4 py-3">{row.deductionCode}</td>
                      <td className="px-4 py-3">{row.deductionType}</td>
                      <td className="px-4 py-3">{row.reason}</td>
                      <td className="px-4 py-3">${row.amount.toLocaleString()}</td>
                      <td className="px-4 py-3">{row.date}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${
                            row.flagged
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {row.flagged ? "Yes" : "No"}
                        </span>
                      </td>
                      <td className="px-4 py-3">{row.disputeStatus}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {loadingError ? (
            <p className="border-t border-slate-200 px-4 py-6 text-sm text-slate-500">
              Error loading data
            </p>
          ) : null}

          {!loadingError && rows.length === 0 ? (
            <p className="border-t border-slate-200 px-4 py-6 text-sm text-slate-500">
              No deductions yet.
            </p>
          ) : null}

          {rows.length > 0 && filteredRows.length === 0 ? (
            <p className="border-t border-slate-200 px-4 py-6 text-sm text-slate-500">
              No deductions match your current filters.
            </p>
          ) : null}
        </section>

      </div>
    </main>
  );
}

function normalizeDisputeStatus(value: unknown): DeductionRecord["disputeStatus"] {
  if (
    value === "New" ||
    value === "Not Started" ||
    value === "In Review" ||
    value === "Submitted" ||
    value === "Resolved"
  ) {
    return value;
  }
  return "Not Started";
}

type FilterSelectProps = {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
};

function FilterSelect({ label, value, options, onChange }: FilterSelectProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
