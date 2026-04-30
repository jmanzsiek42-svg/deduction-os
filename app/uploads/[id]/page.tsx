"use client";

import { useState } from "react";

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

const mockUploadDetails = {
  fileName: "target_invoice_apr.pdf",
  distributor: "Northline Distribution",
  retailer: "Target",
  uploadStatus: "Extracted",
};

const mockRows: Row[] = [
  {
    id: "r-1",
    distributor: "Northline Distribution",
    retailer: "Target",
    invoiceNumber: "INV-78231",
    deductionCode: "DC-101",
    deductionType: "Pricing",
    reason: "Promo discount mismatch",
    amount: "1240.55",
    date: "2026-04-19",
    flagged: true,
    flagReason: "Amount above threshold",
  },
  {
    id: "r-2",
    distributor: "Northline Distribution",
    retailer: "Target",
    invoiceNumber: "INV-78232",
    deductionCode: "DC-220",
    deductionType: "Shortage",
    reason: "Quantity discrepancy",
    amount: "410.00",
    date: "2026-04-19",
    flagged: false,
    flagReason: "",
  },
  {
    id: "r-3",
    distributor: "Northline Distribution",
    retailer: "Target",
    invoiceNumber: "INV-78238",
    deductionCode: "DC-330",
    deductionType: "Compliance",
    reason: "Late ASN submission",
    amount: "890.42",
    date: "2026-04-20",
    flagged: true,
    flagReason: "Missing supporting docs",
  },
];

export default function UploadExtractionReviewPage() {
  const [rows, setRows] = useState<Row[]>(mockRows);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const updateRow = (id: string, key: keyof Row, value: string | boolean) => {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, [key]: value } : row)),
    );
  };

  const handleSave = () => {
    setIsSaving(true);
    setSaveMessage("");

    window.setTimeout(() => {
      setIsSaving(false);
      setSaveMessage("Deductions saved successfully (mock).");
    }, 900);
  };

  return (
    <main className="min-h-screen bg-white px-6 py-8 text-gray-900 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight">Extraction Review</h1>
          <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
            <p>
              <span className="font-medium text-slate-800">File:</span>{" "}
              {mockUploadDetails.fileName}
            </p>
            <p>
              <span className="font-medium text-slate-800">Distributor:</span>{" "}
              {mockUploadDetails.distributor}
            </p>
            <p>
              <span className="font-medium text-slate-800">Retailer:</span>{" "}
              {mockUploadDetails.retailer}
            </p>
            <p>
              <span className="font-medium text-slate-800">Status:</span>{" "}
              <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">
                {mockUploadDetails.uploadStatus}
              </span>
            </p>
          </div>
        </header>

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
        </section>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSaving ? "Saving..." : "Save Deductions to Database"}
          </button>
          {saveMessage ? <p className="text-sm text-emerald-700">{saveMessage}</p> : null}
        </div>
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
