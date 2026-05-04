import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

const EXTRACTION_SYSTEM = `You extract structured data from distributor CHARGEBACK and deduction PDFs.

HEADER (once): From the chargeback header area, fill "metadata" with:
issue_date, chargeback_number, chargeback_date, vendor_number, purchase_order, vendor_invoice, deduction_reason, chargeback_total.
Use null when a value is missing or unreadable. chargeback_total must be a number matching the document total when shown (negative if the PDF shows chargebacks/deductions as negative amounts).

DETAIL ROWS ONLY: Each element of "rows" must be ONE real chargeback/deduction line that includes actual item/SKU identity plus numeric quantity and/or cost and/or extended amount columns from the detail grid.

NEVER add rows for: page headers, document titles, vendor address blocks, column header rows, separator lines, blank lines, or grand totals / summary-only lines (totals belong in metadata.chargeback_total and validation only, not as duplicate detail rows).

CODING RULES:
- If the PDF uses QTY, QUANTITY, or similar for quantity shortage chargebacks, set deduction_code to "QTY" (or the PDF's short code) and deduction_type to exactly "Quantity / Shortage".
- Amounts for deductions/chargebacks must be NEGATIVE when the PDF presents them with a minus sign or parentheses as credits/chargebacks.
- Set is_flagged true for quantity discrepancies / shortage chargebacks that warrant dispute review; set flag_reason briefly (e.g. "Quantity discrepancy — dispute review").
- Also flag other high-risk cases (pricing, compliance, unknown codes) when appropriate.
- dispute_status must always be exactly "New".

Distributor / retailer: infer from the document vendor / banner / retailer name when the line does not name them; otherwise null.

Return JSON only — no markdown, no prose, no code fences.`;

const EXTRACTION_USER = `Return exactly one JSON object with this shape and key names:

{
  "metadata": {
    "issue_date": string | null,
    "chargeback_number": string | null,
    "chargeback_date": string | null,
    "vendor_number": string | null,
    "purchase_order": string | null,
    "vendor_invoice": string | null,
    "deduction_reason": string | null,
    "chargeback_total": number | null
  },
  "rows": [
    {
      "distributor": string | null,
      "retailer": string | null,
      "deduction_code": string | null,
      "deduction_type": string | null,
      "reason": string | null,
      "invoice_number": string | null,
      "amount": number,
      "deduction_date": string | null,
      "is_flagged": boolean,
      "flag_reason": string | null,
      "dispute_status": "New"
    }
  ],
  "validation": {
    "extracted_row_count": number,
    "extracted_total_amount": number,
    "reported_total_amount": number | null,
    "difference": number | null
  }
}

Rules:
- rows must only contain real detail lines (item/SKU + numeric columns), never headers or totals as rows.
- validation.extracted_row_count must equal rows.length.
- validation.extracted_total_amount must equal the sum of rows[].amount.
- validation.reported_total_amount should equal metadata.chargeback_total when known.
- validation.difference = extracted_total_amount - reported_total_amount when reported_total_amount is a number; otherwise null.
- When chargeback_total is present, prefer |difference| ≈ 0; if not, still return honest numbers (do not fabricate rows to force a match).`;

type ChargebackMetadata = {
  issue_date: string | null;
  chargeback_number: string | null;
  chargeback_date: string | null;
  vendor_number: string | null;
  purchase_order: string | null;
  vendor_invoice: string | null;
  deduction_reason: string | null;
  chargeback_total: number | null;
};

type DeductionRow = {
  distributor: string | null;
  retailer: string | null;
  deduction_code: string | null;
  deduction_type: string | null;
  reason: string | null;
  invoice_number: string | null;
  amount: number;
  deduction_date: string | null;
  is_flagged: boolean;
  flag_reason: string | null;
  dispute_status: string;
};

type ParsedValidation = {
  extracted_row_count: number;
  extracted_total_amount: number;
  reported_total_amount: number | null;
  difference: number | null;
};

type ParsedExtraction = {
  metadata: ChargebackMetadata;
  rows: DeductionRow[];
  validation: ParsedValidation;
};

export async function POST(request: Request) {
  let uploadId: string | null = null;

  try {
    const body = (await request.json()) as { upload_id?: string; uploadId?: string };
    uploadId = body.upload_id ?? body.uploadId ?? null;

    if (!uploadId || typeof uploadId !== "string") {
      return NextResponse.json(
        { ok: false, error: "Missing or invalid upload_id in request body." },
        { status: 400 },
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { ok: false, error: "ANTHROPIC_API_KEY is not configured." },
        { status: 500 },
      );
    }

    const supabase = createSupabaseServer();

    const { data: uploadRow, error: fetchError } = await supabase
      .from("uploads")
      .select("*")
      .eq("id", uploadId)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json(
        { ok: false, error: `Failed to fetch upload: ${fetchError.message}` },
        { status: 500 },
      );
    }

    if (!uploadRow) {
      return NextResponse.json({ ok: false, error: "Upload not found." }, { status: 404 });
    }

    const filePath =
      (uploadRow as Record<string, unknown>).file_path ??
      (uploadRow as Record<string, unknown>).filePath;

    if (!filePath || typeof filePath !== "string") {
      await supabase.from("uploads").update({ status: "failed" }).eq("id", uploadId);
      return NextResponse.json(
        {
          ok: false,
          error:
            "Upload has no file_path. Upload the PDF to storage first so file_path is set.",
        },
        { status: 400 },
      );
    }

    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from("uploads")
      .download(filePath);

    if (downloadError || !fileBlob) {
      await supabase.from("uploads").update({ status: "failed" }).eq("id", uploadId);
      return NextResponse.json(
        {
          ok: false,
          error: downloadError?.message ?? "Failed to download PDF from storage.",
        },
        { status: 500 },
      );
    }

    const arrayBuffer = await fileBlob.arrayBuffer();
    const pdfBase64 = Buffer.from(arrayBuffer).toString("base64");

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const model =
      process.env.ANTHROPIC_MODEL?.trim() || "claude-3-5-sonnet-20241022";

    const message = await anthropic.messages.create({
      model,
      max_tokens: 16384,
      system: EXTRACTION_SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: pdfBase64,
              },
            },
            { type: "text", text: EXTRACTION_USER },
          ],
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      await supabase.from("uploads").update({ status: "failed" }).eq("id", uploadId);
      return NextResponse.json(
        { ok: false, error: "Claude returned no text content." },
        { status: 502 },
      );
    }

    let parsed: ParsedExtraction;
    try {
      parsed = parseExtractionJson(textBlock.text);
    } catch (parseErr) {
      await supabase.from("uploads").update({ status: "failed" }).eq("id", uploadId);
      const msg = parseErr instanceof Error ? parseErr.message : "Invalid JSON from model.";
      return NextResponse.json({ ok: false, error: msg }, { status: 422 });
    }

    const uploadRecord = uploadRow as Record<string, unknown>;
    const uploadDistributor = nullableDbString(uploadRecord.distributor);
    const uploadRetailer = nullableDbString(uploadRecord.retailer);
    const meta = parsed.metadata;

    const rows = Array.isArray(parsed.rows) ? parsed.rows : [];
    const insertPayload = rows.map((row) => ({
      upload_id: uploadId,
      distributor: coalescePartner(row.distributor, uploadDistributor),
      retailer: coalescePartner(row.retailer, uploadRetailer),
      invoice_number: coalesceString(
        row.invoice_number,
        meta.vendor_invoice,
        meta.chargeback_number,
      ),
      deduction_code: String(row.deduction_code ?? "").trim(),
      deduction_type: String(row.deduction_type ?? "").trim(),
      reason: buildDeductionReason(row, meta),
      amount: typeof row.amount === "number" && !Number.isNaN(row.amount) ? row.amount : 0,
      date: coalesceString(
        row.deduction_date,
        meta.chargeback_date,
        meta.issue_date,
      ),
      flagged: Boolean(row.is_flagged),
      flag_reason: row.flag_reason ?? null,
      dispute_status: "New",
    }));

    const { error: deleteError } = await supabase
      .from("deductions")
      .delete()
      .eq("upload_id", uploadId);

    if (deleteError) {
      await supabase.from("uploads").update({ status: "failed" }).eq("id", uploadId);
      return NextResponse.json(
        { ok: false, error: `Failed to clear old deductions: ${deleteError.message}` },
        { status: 500 },
      );
    }

    if (insertPayload.length > 0) {
      const { error: insertError } = await supabase.from("deductions").insert(insertPayload);

      if (insertError) {
        await supabase.from("uploads").update({ status: "failed" }).eq("id", uploadId);
        return NextResponse.json(
          { ok: false, error: `Failed to insert deductions: ${insertError.message}` },
          { status: 500 },
        );
      }
    }

    const { error: updateError } = await supabase
      .from("uploads")
      .update({ status: "extracted" })
      .eq("id", uploadId);

    const validationNote = validationMismatchNote(parsed.validation);

    if (updateError) {
      return NextResponse.json(
        {
          ok: true,
          warning: `Deductions saved but failed to update upload status: ${updateError.message}`,
          metadata: parsed.metadata,
          validation: parsed.validation,
          validation_note: validationNote,
          inserted_count: insertPayload.length,
        },
        { status: 200 },
      );
    }

    return NextResponse.json({
      ok: true,
      metadata: parsed.metadata,
      validation: parsed.validation,
      validation_note: validationNote,
      inserted_count: insertPayload.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected server error.";

    try {
      if (uploadId) {
        const supabase = createSupabaseServer();
        await supabase.from("uploads").update({ status: "failed" }).eq("id", uploadId);
      }
    } catch {
      // ignore secondary errors
    }

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

function nullableDbString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const s = String(value).trim();
  return s.length === 0 ? null : s;
}

function coalescePartner(
  rowValue: string | null,
  uploadValue: string | null,
): string {
  const a = rowValue?.trim() ?? "";
  if (a.length > 0) {
    return a;
  }
  return uploadValue?.trim() ?? "";
}

function coalesceString(
  primary: string | null,
  ...fallbacks: (string | null)[]
): string {
  if (primary?.trim()) {
    return primary.trim();
  }
  for (const f of fallbacks) {
    if (f?.trim()) {
      return f.trim();
    }
  }
  return "";
}

function buildDeductionReason(row: DeductionRow, meta: ChargebackMetadata): string {
  const parts: string[] = [];
  if (row.reason?.trim()) {
    parts.push(row.reason.trim());
  }
  if (meta.deduction_reason?.trim() && !parts.includes(meta.deduction_reason.trim())) {
    parts.push(meta.deduction_reason.trim());
  }
  const out = parts.join(" — ").trim();
  return out.length > 0 ? out.slice(0, 4000) : "Deduction line";
}

function validationMismatchNote(v: ParsedValidation): string | null {
  if (v.reported_total_amount === null || Number.isNaN(v.reported_total_amount)) {
    return null;
  }
  if (v.difference === null || Number.isNaN(v.difference)) {
    return null;
  }
  if (Math.abs(v.difference) <= 0.02) {
    return null;
  }
  return `Extracted line total (${v.extracted_total_amount}) differs from reported chargeback total (${v.reported_total_amount}) by ${v.difference}.`;
}

function parseExtractionJson(text: string): ParsedExtraction {
  let trimmed = text.trim();
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/m);
  if (fence) {
    trimmed = fence[1].trim();
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in model output.");
  }

  const raw = JSON.parse(trimmed.slice(start, end + 1)) as unknown;
  if (!raw || typeof raw !== "object") {
    throw new Error("Parsed JSON is not an object.");
  }

  const obj = raw as Record<string, unknown>;
  const metadataRaw = obj.metadata;
  const rowsRaw = obj.rows;
  let validationRaw = obj.validation;

  if (!metadataRaw || typeof metadataRaw !== "object") {
    throw new Error("Missing metadata object.");
  }
  if (!Array.isArray(rowsRaw)) {
    throw new Error("Missing or invalid rows array.");
  }

  const m = metadataRaw as Record<string, unknown>;
  const metadata: ChargebackMetadata = {
    issue_date: nullableString(m.issue_date),
    chargeback_number: nullableString(m.chargeback_number),
    chargeback_date: nullableString(m.chargeback_date),
    vendor_number: nullableString(m.vendor_number),
    purchase_order: nullableString(m.purchase_order),
    vendor_invoice: nullableString(m.vendor_invoice),
    deduction_reason: nullableString(m.deduction_reason),
    chargeback_total:
      m.chargeback_total === null || m.chargeback_total === undefined
        ? null
        : Number(m.chargeback_total),
  };

  const rows: DeductionRow[] = rowsRaw.map((r) => {
    if (!r || typeof r !== "object") {
      throw new Error("Invalid row entry.");
    }
    const row = r as Record<string, unknown>;
    return {
      distributor: nullableString(row.distributor),
      retailer: nullableString(row.retailer),
      deduction_code: nullableString(row.deduction_code),
      deduction_type: nullableString(row.deduction_type),
      reason: nullableString(row.reason),
      invoice_number: nullableString(row.invoice_number),
      amount: Number(row.amount),
      deduction_date: nullableString(row.deduction_date),
      is_flagged: Boolean(row.is_flagged),
      flag_reason: nullableString(row.flag_reason),
      dispute_status: String(row.dispute_status ?? "New"),
    };
  });

  const sumAmount = rows.reduce((acc, row) => {
    const n = typeof row.amount === "number" && !Number.isNaN(row.amount) ? row.amount : 0;
    return acc + n;
  }, 0);

  if (!validationRaw || typeof validationRaw !== "object") {
    const reported = metadata.chargeback_total;
    validationRaw = {
      extracted_row_count: rows.length,
      extracted_total_amount: sumAmount,
      reported_total_amount: reported,
      difference:
        reported !== null && !Number.isNaN(reported) ? sumAmount - reported : null,
    };
  }

  const v = validationRaw as Record<string, unknown>;
  const validation: ParsedValidation = {
    extracted_row_count: Number(v.extracted_row_count ?? rows.length),
    extracted_total_amount: Number(v.extracted_total_amount ?? sumAmount),
    reported_total_amount:
      v.reported_total_amount === null || v.reported_total_amount === undefined
        ? null
        : Number(v.reported_total_amount),
    difference:
      v.difference === null || v.difference === undefined ? null : Number(v.difference),
  };

  return { metadata, rows, validation };
}

function nullableString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const s = String(value).trim();
  return s.length === 0 ? null : s;
}
