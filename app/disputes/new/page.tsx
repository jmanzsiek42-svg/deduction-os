"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { type ChangeEvent, useMemo, useState } from "react";
import { deductionRows } from "../../lib/mock-data";

export default function NewDisputePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedIds = useMemo(() => {
    const raw = searchParams.get("ids") ?? "";
    return raw.split(",").filter(Boolean);
  }, [searchParams]);

  const selectedDeductions = useMemo(
    () => deductionRows.filter((row) => selectedIds.includes(row.id)),
    [selectedIds],
  );

  const totalAmount = useMemo(
    () => selectedDeductions.reduce((sum, row) => sum + row.amount, 0),
    [selectedDeductions],
  );

  const [proofFiles, setProofFiles] = useState<string[]>([]);
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState("");

  const handleProofFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    setProofFiles((current) => [...current, ...files.map((file) => file.name)]);
  };

  const generateEmail = () => {
    if (selectedDeductions.length === 0) {
      setMessage("Select deductions from the Deductions page first.");
      return;
    }

    setMessage("");
    setIsGeneratingEmail(true);

    window.setTimeout(() => {
      const distributor = selectedDeductions[0].distributor;
      const invoiceNumbers = selectedDeductions.map((row) => row.invoiceNumber).join(", ");
      const codes = selectedDeductions.map((row) => row.deductionCode).join(", ");
      const formattedAmount = totalAmount.toLocaleString(undefined, {
        style: "currency",
        currency: "USD",
      });

      setEmailSubject(`Dispute Request - ${distributor} - ${formattedAmount}`);
      setEmailBody(
        `Hello,\n\nWe are requesting reversal review for the following deductions.\n\nDistributor: ${distributor}\nInvoice Numbers: ${invoiceNumbers}\nDeduction Codes: ${codes}\nTotal Amount Disputed: ${formattedAmount}\n\nPlease review and confirm next steps for reversal.\n\nThank you,\nDeductionOS Operations`,
      );
      setIsGeneratingEmail(false);
    }, 500);
  };

  const sendDispute = () => {
    if (selectedDeductions.length === 0 || !emailSubject || !emailBody) {
      setMessage("Generate the dispute email before sending.");
      return;
    }

    setIsSending(true);
    setMessage("");

    window.setTimeout(() => {
      const invoiceNumbers = selectedDeductions.map((row) => row.invoiceNumber).join(",");
      const codes = selectedDeductions.map((row) => row.deductionCode).join(",");

      const redirectParams = new URLSearchParams({
        created: "1",
        distributor: selectedDeductions[0].distributor,
        invoices: invoiceNumbers,
        codes,
        total: totalAmount.toFixed(2),
      });

      router.push(`/disputes?${redirectParams.toString()}`);
    }, 900);
  };

  return (
    <main className="min-h-screen bg-white px-6 py-8 text-gray-900 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Create Dispute</h1>
          <p className="mt-1 text-sm text-slate-500">
            Review selected deductions, attach proof, and generate a dispute email.
          </p>
        </header>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-800">Selected Deductions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
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
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {selectedDeductions.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3">{row.distributor}</td>
                    <td className="px-4 py-3">{row.retailer}</td>
                    <td className="px-4 py-3">{row.invoiceNumber}</td>
                    <td className="px-4 py-3">{row.deductionCode}</td>
                    <td className="px-4 py-3">{row.deductionType}</td>
                    <td className="px-4 py-3">{row.reason}</td>
                    <td className="px-4 py-3">
                      {row.amount.toLocaleString(undefined, {
                        style: "currency",
                        currency: "USD",
                      })}
                    </td>
                    <td className="px-4 py-3">{row.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {selectedDeductions.length === 0 ? (
            <p className="border-t border-slate-200 px-4 py-5 text-sm text-slate-500">
              No deductions selected. Go to the Deductions page and choose rows first.
            </p>
          ) : null}
          <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">
            Total Disputed Amount:{" "}
            {totalAmount.toLocaleString(undefined, {
              style: "currency",
              currency: "USD",
            })}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800">Proof Upload</h2>
          <input
            type="file"
            multiple
            onChange={handleProofFiles}
            className="mt-3 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700"
          />
          {proofFiles.length > 0 ? (
            <ul className="mt-3 space-y-1 text-sm text-slate-600">
              {proofFiles.map((file) => (
                <li key={file}>- {file}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-500">No proof files uploaded yet.</p>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-800">Email</h2>
            <button
              type="button"
              onClick={generateEmail}
              disabled={isGeneratingEmail}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isGeneratingEmail ? "Generating..." : "Generate Dispute Email"}
            </button>
          </div>

          <label className="mt-4 block text-sm font-medium text-slate-700">
            Email Subject
            <input
              type="text"
              value={emailSubject}
              onChange={(event) => setEmailSubject(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </label>

          <label className="mt-4 block text-sm font-medium text-slate-700">
            Email Body
            <textarea
              value={emailBody}
              onChange={(event) => setEmailBody(event.target.value)}
              rows={9}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </label>
        </section>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={sendDispute}
            disabled={isSending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSending ? "Sending..." : "Send Dispute"}
          </button>
          {message ? <p className="text-sm text-slate-600">{message}</p> : null}
        </div>
      </div>
    </main>
  );
}
