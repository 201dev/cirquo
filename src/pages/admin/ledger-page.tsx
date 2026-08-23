import { BookOpenCheck, Search } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Input } from "@/components/ui/input";
import { formatKg, ledgerEvents } from "@/constants/mock-data";

export default function LedgerPage() {
  const [query, setQuery] = useState("");
  const filtered = ledgerEvents.filter((event) =>
    `${event.itemName} ${event.actor} ${event.eventType}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHeader
        title="Material Flow Ledger"
        description="Pratinjau read-only jejak material. Event produksi bersifat append-only dan belum tersedia pada scaffold."
      />
      <label className="relative block max-w-xl">
        <span className="sr-only">Cari event ledger</span>
        <Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="pl-9"
          placeholder="Cari item, aktor, atau event"
        />
      </label>
      <section className="mt-6" aria-label="Daftar event ledger">
        <ol className="relative space-y-0 before:absolute before:bottom-6 before:left-[1.18rem] before:top-6 before:w-px before:bg-border">
          {filtered.map((event) => (
            <li key={event.id} className="relative flex gap-4 pb-6">
              <span className="z-10 grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                <BookOpenCheck className="size-[18px]" />
              </span>
              <div className="flex min-w-0 flex-1 flex-wrap items-start gap-3 rounded-xl bg-card p-4 shadow-sm">
                <div className="min-w-52 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={event.eventType} />
                    <span className="text-xs text-muted-foreground">
                      {event.timestamp}
                    </span>
                  </div>
                  <h2 className="mt-2 text-sm font-semibold">
                    {event.itemName}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {event.actor} · {event.actorRole ?? "sistem"}
                  </p>
                  {event.eventType === "PROCESSED" ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatKg(event.recoveredWeightGrams ?? 0)} terolah ·{" "}
                      {formatKg(event.residualWeightGrams ?? 0)} residu
                    </p>
                  ) : null}
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular-nums">
                    {event.weightDeltaGrams > 0 ? "+" : ""}
                    {formatKg(event.weightDeltaGrams)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    delta berat demo
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
