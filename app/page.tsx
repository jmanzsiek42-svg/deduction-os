export default function Home() {
  const stats = [
    { title: "Total Deductions", value: "1,248", note: "Across all filings" },
    { title: "Flagged for Dispute", value: "39", note: "Needs review" },
    { title: "Open Disputes", value: "12", note: "In progress" },
    { title: "Recovered Dollars", value: "$84,320", note: "Year to date" },
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
