"use client";

import { supabase } from "@/lib/supabaseClient";
import { FormEvent, useEffect, useState } from "react";

type UploadStatus = "uploaded" | "processing" | "extracted" | "failed";

type UploadRecord = {
  id: string;
  fileName: string;
  distributor: string;
  retailer: string;
  uploadedAt: string;
  status: UploadStatus;
};

export default function UploadsPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [distributor, setDistributor] = useState("");
  const [retailer, setRetailer] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [loadingError, setLoadingError] = useState(false);

  useEffect(() => {
    async function loadUploads() {
      const { data, error } = await supabase
        .from("uploads")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        setLoadingError(true);
        return;
      }

      const mappedUploads: UploadRecord[] = (data ?? []).map(
        (item: Record<string, unknown>) => ({
          id: String(item.id ?? crypto.randomUUID()),
          fileName: String(item.file_name ?? item.fileName ?? ""),
          distributor: String(item.distributor ?? ""),
          retailer: String(item.retailer ?? ""),
          uploadedAt: formatUploadedAt(item.created_at ?? item.uploaded_at),
          status: normalizeUploadStatus(item.status),
        }),
      );

      setUploads(mappedUploads);
      setLoadingError(false);
    }

    loadUploads();
  }, []);

  const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedFile || !distributor.trim() || !retailer.trim()) {
      setMessage("Please add a PDF, distributor, and retailer before uploading.");
      return;
    }

    setIsUploading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("uploads")
      .insert({
        file_name: selectedFile.name,
        distributor: distributor.trim(),
        retailer: retailer.trim(),
        status: "uploaded",
      })
      .select("*")
      .single();

    if (error) {
      setMessage("Error saving upload metadata.");
      setIsUploading(false);
      return;
    }

    const newUpload: UploadRecord = {
      id: String(data.id ?? crypto.randomUUID()),
      fileName: String(data.file_name ?? selectedFile.name),
      distributor: String(data.distributor ?? distributor.trim()),
      retailer: String(data.retailer ?? retailer.trim()),
      uploadedAt: formatUploadedAt(data.created_at ?? new Date().toISOString()),
      status: normalizeUploadStatus(data.status),
    };

    setUploads((current) => [newUpload, ...current]);
    setMessage(`Upload successful: ${selectedFile.name} metadata saved.`);
    setSelectedFile(null);
    setDistributor("");
    setRetailer("");
    setIsUploading(false);
  };

  return (
    <main className="min-h-screen bg-white px-6 py-8 text-gray-900 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Upload PDF</h1>
          <p className="mt-1 text-sm text-slate-500">
            Upload deduction PDFs and prepare them for extraction.
          </p>
        </header>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <form className="space-y-5" onSubmit={handleUpload}>
            <div>
              <label
                htmlFor="pdfFile"
                className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center transition hover:border-slate-400 hover:bg-slate-100"
              >
                <span className="text-sm font-medium text-slate-700">
                  Drag and drop PDF here, or click to browse
                </span>
                <span className="mt-2 text-xs text-slate-500">
                  PDF only, max 20MB (mock validation)
                </span>
                <span className="mt-4 rounded-lg bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                  {selectedFile ? selectedFile.name : "No file selected"}
                </span>
              </label>
              <input
                id="pdfFile"
                name="pdfFile"
                type="file"
                accept="application/pdf"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setSelectedFile(file);
                }}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  Distributor
                </span>
                <input
                  type="text"
                  value={distributor}
                  onChange={(event) => setDistributor(event.target.value)}
                  placeholder="e.g. Northline Distribution"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  Retailer
                </span>
                <input
                  type="text"
                  value={retailer}
                  onChange={(event) => setRetailer(event.target.value)}
                  placeholder="e.g. Target"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </label>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={isUploading}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isUploading ? "Uploading..." : "Upload and Parse"}
              </button>
              {message ? <p className="text-sm text-slate-600">{message}</p> : null}
            </div>
          </form>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-800">Recent Uploads</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3">file</th>
                  <th className="px-4 py-3">distributor</th>
                  <th className="px-4 py-3">retailer</th>
                  <th className="px-4 py-3">uploaded at</th>
                  <th className="px-4 py-3">status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {uploads.map((upload) => (
                  <tr key={upload.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {upload.fileName}
                    </td>
                    <td className="px-4 py-3">{upload.distributor}</td>
                    <td className="px-4 py-3">{upload.retailer}</td>
                    <td className="px-4 py-3">{upload.uploadedAt}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${statusBadge(upload.status)}`}
                      >
                        {toTitleCase(upload.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {loadingError ? (
            <p className="border-t border-slate-200 px-4 py-5 text-sm text-slate-500">
              Error loading uploads.
            </p>
          ) : null}
          {!loadingError && uploads.length === 0 ? (
            <p className="border-t border-slate-200 px-4 py-5 text-sm text-slate-500">
              No uploads yet.
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function statusBadge(status: UploadStatus): string {
  if (status === "uploaded") {
    return "bg-sky-100 text-sky-800";
  }
  if (status === "processing") {
    return "bg-amber-100 text-amber-800";
  }
  if (status === "extracted") {
    return "bg-emerald-100 text-emerald-800";
  }
  return "bg-rose-100 text-rose-800";
}

function normalizeUploadStatus(value: unknown): UploadStatus {
  if (
    value === "uploaded" ||
    value === "processing" ||
    value === "extracted" ||
    value === "failed"
  ) {
    return value;
  }
  return "uploaded";
}

function toTitleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatUploadedAt(value: unknown): string {
  const asString = String(value ?? "");
  const date = new Date(asString);
  if (Number.isNaN(date.getTime())) {
    return asString;
  }
  return date.toLocaleString();
}
