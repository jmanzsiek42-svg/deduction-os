"use client";

import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Row = {
  id: string;
  distributor: string;
  retailer: string;
  invoiceNumber: string;
  deductionCode: string;
  deductionType: string;
  reason: string;
  amount: string;
  date: string;
  flagged: boolean;
  flagReason: string;
};

function mapDeductionToRow(item: Record<string, unknown>): Row {
  const amt = item.amount;
  const num = typeof amt === "number" ? amt : Number(amt ?? 0);
  return {
    id: String(item.id ?? ""),
    distributor: String(item.distributor ?? ""),
    retailer: String(item.retailer ?? ""),
    invoiceNumber: String(item.invoice_number ?? item.invoiceNumber ?? ""),
    deductionCode: String(item.deduction_code ?? item.deductionCode ?? ""),
    deductionType: String(item.deduction_type ?? item.deductionType ?? ""),
    reason: String(item.reason ?? ""),
    amount: Number.isFinite(num) ? String(num) : "",
    date: String(item.date ?? ""),
    flagged: Boolean(item.flagged ?? item.is_flagged ?? false),
    flagReason: String(item.flag_reason ?? item.flagReason ?? ""),
  };
}

export default function UploadExtractionReviewPage() {
  const params = useParams();
  const uploadId =
    typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";

  const [fileName, setFileName] = useState("");
  const [distributor, setDistributor] = useState("");
  const [retailer, setRetailer] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const loadData = useCallback(async () => {
    if (!uploadId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(false);

    const { data: upload, error: uploadErr } = await supabase
      .from("uploads")
      .select("*")
      .eq("id", uploadId)
      .maybeSingle();

    if (uploadErr || !upload) {
      setLoadError(true);
      setRows([]);
      setLoading(false);
      return;
    }

    const u = upload as Record<string, unknown>;
    setFileName(String(u.file_name ?? ""));
    setDistributor(String(u.distributor ?? ""));
    setRetailer(String(u.retailer ?? ""));
    setUploadStatus(String(u.status ?? ""));

    const { data: deductions, error: dedErr } = await supabase
      .from("deductions")
      .select("*")
      .eq("upload_id", uploadId);

    if (dedErr) {
      setLoadError(true);
      setRows([]);
    } else {
      setRows((deductions ?? []).map((r) => mapDeductionToRow(r as Record<string, unknown>)));
    }
    setLoading(false);
  }, [uploadId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const updateRow = (id: string, key: keyof Row, value: string | boolean) => {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, [key]: value } : row)),
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage("");

    try {
      for (const row of rows) {
        const amountNum = Number.parseFloat(row.amount);
        const { error } = await supabase
          .from("deductions")
          .update({
            distributor: row.distributor,
            retailer: row.retailer,
            invoice_number: row.invoiceNumber,
            deduction_code: row.deductionCode,
            deduction_type: row.deductionType,
            reason: row.reason,
            amount: Number.isFinite(amountNum) ? amountNum : 0,
            date: row.date,
            flagged: row.flagged,
            flag_reason: row.flagReason.trim() || null,
          })
          .eq("id", row.id);

        if (error) {
          setSaveMessage(error.message);
          setIsSaving(false);
          return;
        }
      }
      setSaveMessage("Deductions saved.");
      await loadData();
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!uploadId) {
    return (
      <main className="min-h-screen bg-white px-6 py-8 text-gray-900 sm:px-8 lg:px-10">
        <p className="text-sm text-slate-600">Invalid upload id.</p>
        <Link href="/uploads" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
          Back to uploads
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white px-6 py-8 text-gray-900 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <p>
          <Link href="/uploads" className="text-sm text-blue-600 hover:underline">
            ← Uploads
          </Link>
        </p>

        <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight">Extraction Review</h1>
          {loading ? (
            <p className="mt-4 text-sm text-slate-500">Loading…</p>
          ) : loadError ? (
            <p className="mt-4 text-sm text-red-600">
              Could not load this upload or its deductions from Supabase.
            </p>
          ) : (
            <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
              <p>
                <span className="font-medium text-slate-800">File:</span>{" "}
                {fileName || "—"}
              </p>
              <p>
                <span className="font-medium text-slate-800">Distributor:</span>{" "}
                {distributor || "—"}
              </p>
              <p>
                <span className="font-medium text-slate-800">Retailer:</span>{" "}
                {retailer || "—"}
              </p>
              <p>
                <span className="font-medium text-slate-800">Status:</span>{" "}
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-800">
                  {uploadStatus || "—"}
                </span>
              </p>
            </div>
          )}
        </header>

        {!loading && !loadError ? (
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-[1400px] divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-4 py-3">distributor</th>
                    <th className="px-4 py-3">retailer</th>
                    <th className="px-4 py-3">invoice number</th>
                    <th className="px-4 py-3">deduction code</th>
                    <th className="px-4 py-3">deduction type</th>
                    <th className="px-4 py-3">reason</th>
                    <th className="px-4 py-3">amount</th>
                    <th className="px-4 py-3">date</th>
                    <th className="px-4 py-3">flagged</th>
                    <th className="px-4 py-3">flag reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {rows.map((row) => (
                    <tr key={row.id} className="align-top hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <CellInput
                          value={row.distributor}
                          onChange={(value) => updateRow(row.id, "distributor", value)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <CellInput
                          value={row.retailer}
                          onChange={(value) => updateRow(row.id, "retailer", value)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <CellInput
                          value={row.invoiceNumber}
                          onChange={(value) => updateRow(row.id, "invoiceNumber", value)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <CellInput
                          value={row.deductionCode}
                          onChange={(value) => updateRow(row.id, "deductionCode", value)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <CellInput
                          value={row.deductionType}
                          onChange={(value) => updateRow(row.id, "deductionType", value)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <CellInput
                          value={row.reason}
                          onChange={(value) => updateRow(row.id, "reason", value)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <CellInput
                          value={row.amount}
                          onChange={(value) => updateRow(row.id, "amount", value)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <CellInput
                          value={row.date}
                          onChange={(value) => updateRow(row.id, "date", value)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
                          <input
                            type="checkbox"
                            checked={row.flagged}
                            onChange={(event) =>
                              updateRow(row.id, "flagged", event.target.checked)
                            }
                            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                          />
                          Flagged
                        </label>
                      </td>
                      <td className="px-4 py-3">
                        <CellInput
                          value={row.flagReason}
                          onChange={(value) => updateRow(row.id, "flagReason", value)}
                          placeholder="Optional"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length === 0 ? (
              <p className="border-t border-slate-200 px-4 py-5 text-sm text-slate-500">
                No deductions for this upload yet.
              </p>
            ) : null}
          </section>
        ) : null}

        {!loading && !loadError ? (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSaving || rows.length === 0}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isSaving ? "Saving..." : "Save Deductions to Database"}
            </button>
            {saveMessage ? (
              <p
                className={
                  saveMessage === "Deductions saved."
                    ? "text-sm text-emerald-700"
                    : "text-sm text-red-600"
                }
              >
                {saveMessage}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </main>
  );
}

type CellInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

function CellInput({ value, onChange, placeholder }: CellInputProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full min-w-32 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
    />
  );
}
