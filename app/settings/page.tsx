"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [autoFlagThreshold, setAutoFlagThreshold] = useState("100");
  const [ignoreBelowThreshold, setIgnoreBelowThreshold] = useState("25");
  const [flagCodes, setFlagCodes] = useState<string[]>([
    "SHORTAGE",
    "PRICING",
    "COMPLIANCE",
  ]);
  const [flagTypes, setFlagTypes] = useState<string[]>(["Shortage", "Pricing"]);
  const [flagMissingInvoice, setFlagMissingInvoice] = useState(true);
  const [flagUnknownCodes, setFlagUnknownCodes] = useState(true);
  const [flagDuplicateInvoice, setFlagDuplicateInvoice] = useState(true);
  const [saveMessage, setSaveMessage] = useState("");

  const codeOptions = ["SHORTAGE", "PRICING", "COMPLIANCE", "PROMO", "FREIGHT", "DAMAGE"];
  const typeOptions = [
    "Shortage",
    "Pricing",
    "Compliance",
    "Promotional",
    "Freight",
    "Returns",
  ];

  const toggleSelection = (
    value: string,
    selected: string[],
    onChange: (next: string[]) => void,
  ) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
      return;
    }
    onChange([...selected, value]);
  };

  const handleSave = () => {
    setSaveMessage("Flagging rules saved (mock).");
  };

  return (
    <main className="min-h-screen bg-white p-6 text-gray-900 sm:p-8 lg:p-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-slate-500">
            Configure flagging rules used to prioritize deductions for dispute review.
          </p>
        </header>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
            Flagging Rules
          </h2>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Dollar threshold for auto-flagging deductions
              </span>
              <input
                type="number"
                value={autoFlagThreshold}
                onChange={(event) => setAutoFlagThreshold(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Ignore deductions below dollar threshold
              </span>
              <input
                type="number"
                value={ignoreBelowThreshold}
                onChange={(event) => setIgnoreBelowThreshold(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </label>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <fieldset className="rounded-lg border border-slate-200 p-4">
              <legend className="px-1 text-sm font-medium text-slate-700">
                Deduction codes to always flag
              </legend>
              <div className="mt-2 space-y-2">
                {codeOptions.map((code) => (
                  <label key={code} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={flagCodes.includes(code)}
                      onChange={() =>
                        toggleSelection(code, flagCodes, setFlagCodes)
                      }
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-slate-400"
                    />
                    {code}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="rounded-lg border border-slate-200 p-4">
              <legend className="px-1 text-sm font-medium text-slate-700">
                Deduction types to always flag
              </legend>
              <div className="mt-2 space-y-2">
                {typeOptions.map((type) => (
                  <label key={type} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={flagTypes.includes(type)}
                      onChange={() =>
                        toggleSelection(type, flagTypes, setFlagTypes)
                      }
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-slate-400"
                    />
                    {type}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="mt-6 grid gap-3">
            <ToggleRow
              label="Flag missing invoice number"
              checked={flagMissingInvoice}
              onChange={setFlagMissingInvoice}
            />
            <ToggleRow
              label="Flag unknown deduction codes"
              checked={flagUnknownCodes}
              onChange={setFlagUnknownCodes}
            />
            <ToggleRow
              label="Flag duplicate invoice/reference number"
              checked={flagDuplicateInvoice}
              onChange={setFlagDuplicateInvoice}
            />
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
            Mock Rule Examples
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>- Flag all deductions over $100</li>
            <li>- Always flag shortage deductions</li>
            <li>- Always flag pricing discrepancies</li>
            <li>- Flag compliance fees</li>
            <li>- Ignore cash discounts under $25</li>
          </ul>
        </section>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
          >
            Save Settings
          </button>
          {saveMessage ? <p className="text-sm text-emerald-700">{saveMessage}</p> : null}
        </div>
      </div>
    </main>
  );
}

type ToggleRowProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

function ToggleRow({ label, checked, onChange }: ToggleRowProps) {
  return (
    <label className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
      <span className="text-sm text-slate-700">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-slate-400"
      />
    </label>
  );
}
