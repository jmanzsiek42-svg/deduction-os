import { createSupabaseServer } from "@/lib/supabaseServer";

function formatInt(n: number): string {
  return n.toLocaleString();
}

function formatMoney(n: number): string {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function isOpenDisputeStatus(status: unknown): boolean {
  const s = String(status ?? "")
    .trim()
    .toLowerCase();
  if (!s) {
    return false;
  }
  return !["resolved", "rejected", "closed", "written off", "written_off"].includes(s);
}

export default async function Home() {
  let totalDeductionCount = 0;
  let flaggedDeductionCount = 0;
  let openDisputeCount = 0;
  let recoveredTotal = 0;
  let dashboardError: string | null = null;

  try {
    const supabase = createSupabaseServer();

    const { count: dedCount, error: dedErr } = await supabase
      .from("deductions")
      .select("*", { count: "exact", head: true });
    if (dedErr) {
      throw dedErr;
    }
    totalDeductionCount = dedCount ?? 0;

    const { count: flagCount, error: flagErr } = await supabase
      .from("deductions")
      .select("*", { count: "exact", head: true })
      .eq("flagged", true);
    if (flagErr) {
      throw flagErr;
    }
    flaggedDeductionCount = flagCount ?? 0;

    const { data: disputeRows, error: dspErr } = await supabase
      .from("disputes")
      .select("status, recovered_amount");
    if (dspErr) {
      throw dspErr;
    }

    for (const row of disputeRows ?? []) {
      if (isOpenDisputeStatus(row.status)) {
        openDisputeCount += 1;
      }
      recoveredTotal += Number(row.recovered_amount ?? 0) || 0;
    }
  } catch (err) {
    dashboardError =
      err instanceof Error ? err.message : "Could not load dashboard metrics from Supabase.";
  }

  const stats = [
    {
      title: "Total Deductions",
      value: formatInt(totalDeductionCount),
      note: "Rows in deductions table",
    },
    {
      title: "Flagged for Dispute",
      value: formatInt(flaggedDeductionCount),
      note: "deductions.flagged is true",
    },
    {
      title: "Open Disputes",
      value: formatInt(openDisputeCount),
      note: "disputes not resolved, rejected, or closed",
    },
    {
      title: "Recovered Dollars",
      value: formatMoney(recoveredTotal),
      note: "Sum of disputes.recovered_amount",
    },
  ];

  return (
    <main className="min-h-screen bg-white p-6 text-gray-900 sm:p-8 lg:p-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Overview of deductions and active disputes.
          </p>
        </div>
      </header>

      {dashboardError ? (
        <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {dashboardError}
        </p>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <article
            key={stat.title}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-slate-500">{stat.title}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">{stat.value}</p>
            <p className="mt-2 text-xs text-slate-500">{stat.note}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
