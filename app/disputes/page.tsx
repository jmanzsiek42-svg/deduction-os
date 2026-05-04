"use client";

import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type DisputeEntry = {
  id: string;
  distributor: string;
  retailer: string;
  totalAmount: number;
  status: string;
  createdDate: string;
  sentDate: string;
  recoveredAmount: number;
  outcome: string;
};

function mapDisputeRow(item: Record<string, unknown>): DisputeEntry {
  const createdRaw = item.created_at ?? item.created_date ?? item.createdDate;
  const sentRaw = item.sent_at ?? item.sent_date ?? item.sentDate;
  return {
    id: String(item.id ?? ""),
    distributor: String(item.distributor ?? ""),
    retailer: String(item.retailer ?? ""),
    totalAmount: Number(item.total_amount ?? item.totalAmount ?? 0),
    status: String(item.status ?? ""),
    createdDate: formatDateOnly(createdRaw),
    sentDate: formatDateOnly(sentRaw),
    recoveredAmount: Number(item.recovered_amount ?? item.recoveredAmount ?? 0),
    outcome: String(item.outcome ?? "Pending"),
  };
}

function isOpenDisputeRow(item: DisputeEntry): boolean {
  const s = item.status.trim().toLowerCase();
  if (!s) {
    return false;
  }
  return !["resolved", "rejected", "closed", "written off", "written_off"].includes(s);
}

function formatDateOnly(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.slice(0, 10);
  }
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) {
    return s;
  }
  return d.toISOString().slice(0, 10);
}

function DisputesPageInner() {
  const searchParams = useSearchParams();
  const [disputes, setDisputes] = useState<DisputeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All");
  const [distributorFilter, setDistributorFilter] = useState("All");
  const [retailerFilter, setRetailerFilter] = useState("All");

  const loadDisputes = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    const { data, error } = await supabase.from("disputes").select("*").order("id", {
      ascending: false,
    });

    if (error) {
      setDisputes([]);
      setLoadError(true);
      setLoading(false);
      return;
    }

    setDisputes((data ?? []).map((row) => mapDisputeRow(row as Record<string, unknown>)));
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadDisputes();
  }, [loadDisputes]);

  const statusOptions = useMemo(() => {
    const fromData = Array.from(new Set(disputes.map((d) => d.status).filter(Boolean))).sort();
    return ["All", ...fromData];
  }, [disputes]);

  const distributors = useMemo(
    () => ["All", ...Array.from(new Set(disputes.map((item) => item.distributor))).sort()],
    [disputes],
  );
  const retailers = useMemo(
    () => ["All", ...Array.from(new Set(disputes.map((item) => item.retailer))).sort()],
    [disputes],
  );

  const filteredDisputes = useMemo(() => {
    return disputes.filter((item) => {
      if (statusFilter !== "All" && item.status !== statusFilter) {
        return false;
      }
      if (distributorFilter !== "All" && item.distributor !== distributorFilter) {
        return false;
      }
      if (retailerFilter !== "All" && item.retailer !== retailerFilter) {
        return false;
      }
      return true;
    });
  }, [disputes, distributorFilter, retailerFilter, statusFilter]);

  const openDisputes = disputes.filter(isOpenDisputeRow).length;
  const waitingOnDistributor = disputes.filter(
    (item) => item.status === "Waiting on Distributor",
  ).length;
  const recoveredDollars = disputes.reduce((sum, item) => sum + item.recoveredAmount, 0);
  const rejectedWrittenOff = disputes.filter(
    (item) => item.status === "Rejected" || item.outcome === "Written Off",
  ).length;

  return (
    <main className="min-h-screen bg-white p-6 text-gray-900 sm:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Disputes</h1>
            <p className="mt-1 text-sm text-slate-500">
              Track submitted disputes and their current status.
            </p>
          </div>
          <Link
            href="/deductions"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
          >
            New Dispute
          </Link>
        </header>

        {searchParams.get("created") === "1" ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Dispute sent successfully.
          </p>
        ) : null}

        {loadError ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            Error loading disputes from Supabase.
          </p>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Open Disputes" value={String(openDisputes)} />
          <SummaryCard
            label="Waiting on Distributor"
            value={String(waitingOnDistributor)}
          />
          <SummaryCard
            label="Recovered Dollars"
            value={formatCurrency(recoveredDollars)}
          />
          <SummaryCard
            label="Rejected / Written Off"
            value={String(rejectedWrittenOff)}
          />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FilterSelect
              label="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={statusOptions.length > 1 ? statusOptions : ["All"]}
            />
            <FilterSelect
              label="Distributor"
              value={distributorFilter}
              onChange={setDistributorFilter}
              options={distributors}
            />
            <FilterSelect
              label="Retailer"
              value={retailerFilter}
              onChange={setRetailerFilter}
              options={retailers}
            />
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3">dispute id</th>
                  <th className="px-4 py-3">distributor</th>
                  <th className="px-4 py-3">retailer</th>
                  <th className="px-4 py-3">total amount</th>
                  <th className="px-4 py-3">status</th>
                  <th className="px-4 py-3">created date</th>
                  <th className="px-4 py-3">sent date</th>
                  <th className="px-4 py-3">recovered amount</th>
                  <th className="px-4 py-3">outcome</th>
                  <th className="px-4 py-3">actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-sm text-slate-500">
                      Loading…
                    </td>
                  </tr>
                ) : null}
                {!loading &&
                  filteredDisputes.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-medium text-slate-800">{item.id}</td>
                      <td className="px-4 py-3">{item.distributor}</td>
                      <td className="px-4 py-3">{item.retailer}</td>
                      <td className="px-4 py-3">{formatCurrency(item.totalAmount)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${statusBadge(item.status)}`}
                        >
                          {item.status || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">{item.createdDate || "—"}</td>
                      <td className="px-4 py-3">{item.sentDate || "—"}</td>
                      <td className="px-4 py-3">{formatCurrency(item.recoveredAmount)}</td>
                      <td className="px-4 py-3">{item.outcome}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Update Status
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {!loading && !loadError && disputes.length === 0 ? (
            <p className="border-t border-slate-200 px-4 py-5 text-sm text-slate-500">
              No disputes yet.
            </p>
          ) : null}
          {!loading && disputes.length > 0 && filteredDisputes.length === 0 ? (
            <p className="border-t border-slate-200 px-4 py-5 text-sm text-slate-500">
              No disputes match your filters.
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}

export default function DisputesPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-white p-6 text-gray-900 sm:p-8 lg:p-10">
          <p className="text-sm text-slate-500">Loading disputes…</p>
        </main>
      }
    >
      <DisputesPageInner />
    </Suspense>
  );
}

function formatCurrency(value: number): string {
  return value.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function statusBadge(status: string): string {
  if (status === "Resolved") {
    return "bg-emerald-100 text-emerald-800";
  }
  if (status === "Waiting on Distributor") {
    return "bg-amber-100 text-amber-800";
  }
  if (status === "Rejected") {
    return "bg-rose-100 text-rose-800";
  }
  return "bg-sky-100 text-sky-800";
}

type SummaryCardProps = {
  label: string;
  value: string;
};

function SummaryCard({ label, value }: SummaryCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
    </article>
  );
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
