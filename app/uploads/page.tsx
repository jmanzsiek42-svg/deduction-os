"use client";

import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

type UploadStatus = "uploaded" | "processing" | "extracted" | "failed";

type UploadRecord = {
  id: string;
  fileName: string;
  distributorDisplay: string;
  retailerDisplay: string;
  uploadedAt: string;
  status: UploadStatus;
  hasFilePath: boolean;
};

function partnerLabel(value: unknown): string {
  if (value === null || value === undefined) {
    return "Unknown";
  }
  const s = String(value).trim();
  return s.length === 0 ? "Unknown" : s;
}

export default function UploadsPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [loadingError, setLoadingError] = useState(false);
  const [parsingUploadId, setParsingUploadId] = useState<string | null>(null);
  const [parseFeedback, setParseFeedback] = useState<{
    uploadId: string;
    message: string;
    variant: "success" | "error";
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadUploads = useCallback(async () => {
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
        distributorDisplay: partnerLabel(item.distributor),
        retailerDisplay: partnerLabel(item.retailer),
        uploadedAt: formatUploadedAt(item.created_at ?? item.uploaded_at),
        status: normalizeUploadStatus(item.status),
        hasFilePath: Boolean(
          item.file_path && String(item.file_path).trim().length > 0,
        ),
      }),
    );

    setUploads(mappedUploads);
    setLoadingError(false);
  }, []);

  useEffect(() => {
    void loadUploads();
  }, [loadUploads]);

  const parseUpload = async (uploadId: string) => {
    setParseFeedback(null);
    setParsingUploadId(uploadId);

    try {
      const response = await fetch("/api/parse-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ upload_id: uploadId }),
      });

      const rawBody = await response.text();
      let payload: { ok?: boolean; error?: string; message?: string } = {};
      if (rawBody.trim().length > 0) {
        try {
          payload = JSON.parse(rawBody) as {
            ok?: boolean;
            error?: string;
            message?: string;
          };
        } catch {
          setParseFeedback({
            uploadId,
            message: rawBody.trim().slice(0, 4000),
            variant: "error",
          });
          return;
        }
      }

      if (!response.ok || payload.ok === false) {
        const fromApi =
          typeof payload.error === "string" && payload.error.length > 0
            ? payload.error
            : typeof payload.message === "string" && payload.message.length > 0
              ? payload.message
              : "";
        const errText =
          fromApi ||
          rawBody.trim().slice(0, 4000) ||
          `Request failed (${response.status})`;
        setParseFeedback({ uploadId, message: errText, variant: "error" });
        return;
      }

      setParseFeedback({
        uploadId,
        message: "Extraction complete",
        variant: "success",
      });
      await loadUploads();
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : String(err);
      setParseFeedback({ uploadId, message: errMessage, variant: "error" });
    } finally {
      setParsingUploadId(null);
    }
  };

  const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedFile) {
      setMessage("Please choose a PDF file to upload.");
      return;
    }

    setIsUploading(true);
    setMessage("");

    const filePath = `files/${Date.now()}-${selectedFile.name}`;

    console.log("Uploading to bucket:", "uploads");
    console.log("File path:", filePath);

    const { error: storageError } = await supabase.storage
      .from("uploads")
      .upload(filePath, selectedFile, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (storageError) {
      setMessage(`Storage upload failed: ${storageError.message}`);
      setIsUploading(false);
      return;
    }

    const { data, error } = await supabase
      .from("uploads")
      .insert({
        file_name: selectedFile.name,
        file_path: filePath,
        status: "uploaded",
        distributor: null,
        retailer: null,
      })
      .select("*")
      .single();

    if (error) {
      setMessage(`Database error: ${error.message}`);
      setIsUploading(false);
      return;
    }

    const newUpload: UploadRecord = {
      id: String(data.id ?? crypto.randomUUID()),
      fileName: String(data.file_name ?? selectedFile.name),
      distributorDisplay: partnerLabel(data.distributor),
      retailerDisplay: partnerLabel(data.retailer),
      uploadedAt: formatUploadedAt(data.created_at ?? new Date().toISOString()),
      status: normalizeUploadStatus(data.status),
      hasFilePath: Boolean(
        data.file_path && String(data.file_path).trim().length > 0,
      ),
    };

    setUploads((current) => [newUpload, ...current]);
    setMessage(`Uploaded: ${selectedFile.name}`);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setIsUploading(false);
  };

  return (
    <main className="min-h-screen bg-white px-6 py-8 text-gray-900 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Upload PDF</h1>
          <p className="mt-1 text-sm text-slate-500">
            Upload a PDF to storage, then use Parse to extract deduction rows (Claude).
            Partner names can be set later in Settings.
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
                <span className="mt-2 text-xs text-slate-500">PDF only</span>
                <span className="mt-4 rounded-lg bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                  {selectedFile ? selectedFile.name : "No file selected"}
                </span>
              </label>
              <input
                ref={fileInputRef}
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

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={isUploading}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isUploading ? "Uploading..." : "Upload"}
              </button>
              {message ? <p className="text-sm text-slate-600">{message}</p> : null}
            </div>
          </form>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-800">Recent Uploads</h2>
            <Link
              href="/deductions"
              className="text-sm font-medium text-blue-600 underline-offset-2 hover:text-blue-500 hover:underline"
            >
              View deductions
            </Link>
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
                  <th className="px-4 py-3">actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {uploads.map((upload) => (
                  <tr key={upload.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {upload.fileName}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {upload.distributorDisplay}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {upload.retailerDisplay}
                    </td>
                    <td className="px-4 py-3">{upload.uploadedAt}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${statusBadge(upload.status)}`}
                      >
                        {toTitleCase(upload.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => void parseUpload(upload.id)}
                          disabled={
                            !upload.hasFilePath || parsingUploadId === upload.id
                          }
                          title={
                            upload.hasFilePath
                              ? "Extract deductions with Claude"
                              : "No file_path on this upload"
                          }
                          className="w-max rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {parsingUploadId === upload.id ? "Parsing..." : "Parse Upload"}
                        </button>
                        {parseFeedback?.uploadId === upload.id ? (
                          <div className="space-y-1">
                            <p
                              className={
                                parseFeedback.variant === "error"
                                  ? "whitespace-pre-wrap break-words text-xs text-red-600"
                                  : "text-xs text-emerald-700"
                              }
                            >
                              {parseFeedback.message}
                            </p>
                            {parseFeedback.variant === "success" ? (
                              <Link
                                href="/deductions"
                                className="inline-block text-xs font-medium text-blue-600 underline-offset-2 hover:text-blue-500 hover:underline"
                              >
                                View deductions
                              </Link>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
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
