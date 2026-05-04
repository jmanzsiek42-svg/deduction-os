"use client";

import { useState } from "react";

type SettingsTab = "flagging" | "distributors" | "retailers" | "deduction-codes";

type DistributorRow = {
  id: string;
  name: string;
  dispute_email: string;
  notes: string;
  active: boolean;
};

type RetailerRow = {
  id: string;
  retailer_name: string;
  parent_distributor: string;
  notes: string;
  active: boolean;
};

type DeductionCodeRow = {
  id: string;
  code: string;
  description: string;
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("flagging");
  const [tabNotice, setTabNotice] = useState("");

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

  const [distributors, setDistributors] = useState<DistributorRow[]>([]);
  const [newDist, setNewDist] = useState({
    name: "",
    dispute_email: "",
    notes: "",
    active: true,
  });

  const [retailers, setRetailers] = useState<RetailerRow[]>([]);
  const [newRetailer, setNewRetailer] = useState({
    retailer_name: "",
    parent_distributor: "",
    notes: "",
    active: true,
  });

  const [deductionCodes, setDeductionCodes] = useState<DeductionCodeRow[]>([]);
  const [newCode, setNewCode] = useState({ code: "", description: "" });

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

  const handleSaveFlagging = () => {
    setSaveMessage("Preferences saved locally (not persisted to the server yet).");
    setTabNotice("");
  };

  const addDistributor = () => {
    if (!newDist.name.trim()) {
      setTabNotice("Enter a distributor name.");
      return;
    }
    setDistributors((list) => [
      ...list,
      {
        id: `dist-${crypto.randomUUID()}`,
        name: newDist.name.trim(),
        dispute_email: newDist.dispute_email.trim(),
        notes: newDist.notes.trim(),
        active: newDist.active,
      },
    ]);
    setNewDist({ name: "", dispute_email: "", notes: "", active: true });
    setTabNotice("Distributor added for this session (not saved to the database yet).");
  };

  const updateDistributor = (id: string, patch: Partial<DistributorRow>) => {
    setDistributors((list) =>
      list.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  };

  const addRetailer = () => {
    if (!newRetailer.retailer_name.trim()) {
      setTabNotice("Enter a retailer name.");
      return;
    }
    setRetailers((list) => [
      ...list,
      {
        id: `ret-${crypto.randomUUID()}`,
        retailer_name: newRetailer.retailer_name.trim(),
        parent_distributor: newRetailer.parent_distributor.trim(),
        notes: newRetailer.notes.trim(),
        active: newRetailer.active,
      },
    ]);
    setNewRetailer({
      retailer_name: "",
      parent_distributor: "",
      notes: "",
      active: true,
    });
    setTabNotice("Retailer added for this session (not saved to the database yet).");
  };

  const updateRetailer = (id: string, patch: Partial<RetailerRow>) => {
    setRetailers((list) =>
      list.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  };

  const addDeductionCode = () => {
    if (!newCode.code.trim() || !newCode.description.trim()) {
      setTabNotice("Enter both code and description.");
      return;
    }
    setDeductionCodes((list) => [
      ...list,
      {
        id: `dc-${crypto.randomUUID()}`,
        code: newCode.code.trim().toUpperCase(),
        description: newCode.description.trim(),
      },
    ]);
    setNewCode({ code: "", description: "" });
    setTabNotice("Mapping added for this session (not saved to the database yet).");
  };

  const updateDeductionCode = (id: string, patch: Partial<DeductionCodeRow>) => {
    setDeductionCodes((list) =>
      list.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  };

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: "flagging", label: "Flagging Rules" },
    { id: "distributors", label: "Distributors" },
    { id: "retailers", label: "Retailers" },
    { id: "deduction-codes", label: "Deduction Codes" },
  ];

  return (
    <main className="min-h-screen bg-white p-6 text-gray-900 sm:p-8 lg:p-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-slate-500">
            Trading partner and flagging preferences. Lists below are local to this browser
            session until these screens are wired to Supabase.
          </p>
        </header>

        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setTabNotice("");
              }}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {tabNotice ? (
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
            {tabNotice}
          </p>
        ) : null}

        {activeTab === "flagging" ? (
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
                        onChange={() => toggleSelection(code, flagCodes, setFlagCodes)}
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
                        onChange={() => toggleSelection(type, flagTypes, setFlagTypes)}
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

            <section className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-800">Example rules (reference)</h3>
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                <li>Example: flag deductions over a dollar threshold.</li>
                <li>Example: always flag shortage or pricing-related codes.</li>
                <li>Example: ignore very small amounts below a floor.</li>
              </ul>
            </section>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={handleSaveFlagging}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
              >
                Save flagging rules
              </button>
              {saveMessage ? (
                <p className="text-sm text-emerald-700">{saveMessage}</p>
              ) : null}
            </div>
          </section>
        ) : null}

        {activeTab === "distributors" ? (
          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
              Distributors
            </h2>
            <p className="text-sm text-slate-500">
              Add distributor records for this session. Example names: UNFI, KeHE.
            </p>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-3 py-2">name</th>
                    <th className="px-3 py-2">dispute email</th>
                    <th className="px-3 py-2">notes</th>
                    <th className="px-3 py-2">active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {distributors.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-sm text-slate-500">
                        No distributors yet. Add one below.
                      </td>
                    </tr>
                  ) : null}
                  {distributors.map((row) => (
                    <tr key={row.id}>
                      <td className="px-3 py-2">
                        <input
                          value={row.name}
                          onChange={(e) =>
                            updateDistributor(row.id, { name: e.target.value })
                          }
                          className="w-full min-w-[8rem] rounded border border-slate-300 px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="email"
                          value={row.dispute_email}
                          onChange={(e) =>
                            updateDistributor(row.id, { dispute_email: e.target.value })
                          }
                          className="w-full min-w-[10rem] rounded border border-slate-300 px-2 py-1 text-sm"
                          placeholder="disputes@…"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={row.notes}
                          onChange={(e) =>
                            updateDistributor(row.id, { notes: e.target.value })
                          }
                          className="w-full min-w-[10rem] rounded border border-slate-300 px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={row.active}
                          onChange={(e) =>
                            updateDistributor(row.id, { active: e.target.checked })
                          }
                          className="h-4 w-4 rounded border-slate-300 text-blue-600"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-800">Add distributor</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <input
                  placeholder="Name"
                  value={newDist.name}
                  onChange={(e) => setNewDist((s) => ({ ...s, name: e.target.value }))}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <input
                  placeholder="Dispute email"
                  type="email"
                  value={newDist.dispute_email}
                  onChange={(e) =>
                    setNewDist((s) => ({ ...s, dispute_email: e.target.value }))
                  }
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <input
                  placeholder="Notes"
                  value={newDist.notes}
                  onChange={(e) => setNewDist((s) => ({ ...s, notes: e.target.value }))}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2 lg:col-span-1"
                />
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={newDist.active}
                    onChange={(e) =>
                      setNewDist((s) => ({ ...s, active: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-blue-600"
                  />
                  Active
                </label>
              </div>
              <button
                type="button"
                onClick={addDistributor}
                className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
              >
                Add distributor
              </button>
            </div>
          </section>
        ) : null}

        {activeTab === "retailers" ? (
          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
              Retailers
            </h2>
            <p className="text-sm text-slate-500">
              Link retailers to a parent distributor. Data here is local to this session.
            </p>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-3 py-2">retailer name</th>
                    <th className="px-3 py-2">parent distributor</th>
                    <th className="px-3 py-2">notes</th>
                    <th className="px-3 py-2">active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {retailers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-sm text-slate-500">
                        No retailers yet. Add one below.
                      </td>
                    </tr>
                  ) : (
                    retailers.map((row) => (
                      <tr key={row.id}>
                        <td className="px-3 py-2">
                          <input
                            value={row.retailer_name}
                            onChange={(e) =>
                              updateRetailer(row.id, { retailer_name: e.target.value })
                            }
                            className="w-full min-w-[8rem] rounded border border-slate-300 px-2 py-1 text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            value={row.parent_distributor}
                            onChange={(e) =>
                              updateRetailer(row.id, {
                                parent_distributor: e.target.value,
                              })
                            }
                            className="w-full min-w-[8rem] rounded border border-slate-300 px-2 py-1 text-sm"
                            placeholder="e.g. UNFI"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            value={row.notes}
                            onChange={(e) =>
                              updateRetailer(row.id, { notes: e.target.value })
                            }
                            className="w-full min-w-[10rem] rounded border border-slate-300 px-2 py-1 text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={row.active}
                            onChange={(e) =>
                              updateRetailer(row.id, { active: e.target.checked })
                            }
                            className="h-4 w-4 rounded border-slate-300 text-blue-600"
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-800">Add retailer</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <input
                  placeholder="Retailer name"
                  value={newRetailer.retailer_name}
                  onChange={(e) =>
                    setNewRetailer((s) => ({ ...s, retailer_name: e.target.value }))
                  }
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <input
                  placeholder="Parent distributor"
                  value={newRetailer.parent_distributor}
                  onChange={(e) =>
                    setNewRetailer((s) => ({
                      ...s,
                      parent_distributor: e.target.value,
                    }))
                  }
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <input
                  placeholder="Notes"
                  value={newRetailer.notes}
                  onChange={(e) =>
                    setNewRetailer((s) => ({ ...s, notes: e.target.value }))
                  }
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2 lg:col-span-1"
                />
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={newRetailer.active}
                    onChange={(e) =>
                      setNewRetailer((s) => ({ ...s, active: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-blue-600"
                  />
                  Active
                </label>
              </div>
              <button
                type="button"
                onClick={addRetailer}
                className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
              >
                Add retailer
              </button>
            </div>
          </section>
        ) : null}

        {activeTab === "deduction-codes" ? (
          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
              Deduction codes
            </h2>
            <p className="text-sm text-slate-500">
              Map short codes to readable deduction types. Example: code{" "}
              <span className="font-mono">QTY</span> → “Quantity / Shortage”. Local session
              only until persisted.
            </p>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-3 py-2">code</th>
                    <th className="px-3 py-2">description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deductionCodes.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-3 py-6 text-center text-sm text-slate-500">
                        No code mappings yet. Add one below.
                      </td>
                    </tr>
                  ) : null}
                  {deductionCodes.map((row) => (
                    <tr key={row.id}>
                      <td className="px-3 py-2">
                        <input
                          value={row.code}
                          onChange={(e) =>
                            updateDeductionCode(row.id, { code: e.target.value })
                          }
                          className="w-full max-w-[10rem] rounded border border-slate-300 px-2 py-1 font-mono text-sm uppercase"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={row.description}
                          onChange={(e) =>
                            updateDeductionCode(row.id, { description: e.target.value })
                          }
                          className="w-full min-w-[12rem] rounded border border-slate-300 px-2 py-1 text-sm"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-800">Add code mapping</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <input
                  placeholder="Code (e.g. FRT)"
                  value={newCode.code}
                  onChange={(e) =>
                    setNewCode((s) => ({ ...s, code: e.target.value.toUpperCase() }))
                  }
                  className="w-32 rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                />
                <input
                  placeholder="Description"
                  value={newCode.description}
                  onChange={(e) =>
                    setNewCode((s) => ({ ...s, description: e.target.value }))
                  }
                  className="min-w-[12rem] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={addDeductionCode}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
                >
                  Add mapping
                </button>
              </div>
            </div>
          </section>
        ) : null}
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
