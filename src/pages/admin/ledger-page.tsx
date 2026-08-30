import { AlertTriangle, BookOpenCheck, CheckCircle2, Search } from "lucide-react";
import { useState } from "react";
import { usePaginatedQuery, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { PageHeader } from "@/components/common/page-header";
import { QueryErrorBoundary } from "@/components/common/query-error-boundary";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { formatWeight, formatWibDateTime } from "@/lib/format";
import { statusLabel } from "@/lib/status-labels";

/** How many integrity findings the overview card lists before it links out. */
const VIOLATION_PREVIEW = 5;

/**
 * The event types an Admin audits by name. The server already searches the
 * event types of each item, so these are shortcuts into the existing text
 * search rather than a second filter path that could disagree with it.
 */
const EVENT_FILTERS = ["RESCUED", "PROCESSED", "ROUTING_FAILED", "MODERATED", "EXPIRED"];

/** A yyyy-mm-dd input turned into an epoch ms boundary at WIB midnight. */
function wibBoundary(value: string, nextDay = false) {
  if (!value) return undefined;
  return new Date(`${value}T00:00:00+07:00`).getTime() + (nextDay ? 86_400_000 : 0);
}

function Metric({ label, grams }: { label: string; grams: number | null }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold tabular-nums">
        {grams === null ? "—" : formatWeight(grams)}
      </p>
    </div>
  );
}

function Metadata({ value }: { value: Record<string, unknown> | null }) {
  if (!value || Object.keys(value).length === 0) return null;
  return (
    <dl className="mt-3 grid gap-1 rounded-lg bg-muted/50 p-3 text-xs">
      {Object.entries(value).map(([key, nested]) => (
        <div key={key} className="grid min-w-0 grid-cols-[minmax(6rem,auto)_1fr] gap-2">
          <dt className="font-medium">{key}</dt>
          <dd className="min-w-0 break-all text-muted-foreground">
            {typeof nested === "string" ? nested : JSON.stringify(nested)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function IntegrityOverview({
  sessionToken,
  inspect,
}: {
  sessionToken: string;
  inspect: (id: Id<"surplusItems">) => void;
}) {
  const conservation = useQuery(api.admin.checkWeightConservation, { sessionToken });
  const completeness = useQuery(api.admin.checkLedgerCompleteness, { sessionToken });

  if (conservation === undefined || completeness === undefined) {
    return <Skeleton className="h-24 rounded-xl" aria-label="Memuat pemeriksaan integritas" />;
  }

  const violations = [...conservation.violations, ...completeness.violations];
  const shown = violations.slice(0, VIOLATION_PREVIEW);
  return (
    <Card className={violations.length ? "border-destructive/40" : "border-rescued/40"}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {violations.length ? (
            <AlertTriangle className="size-5 text-destructive" />
          ) : (
            <CheckCircle2 className="size-5 text-rescued" />
          )}
          Integritas Material Flow Ledger
        </CardTitle>
      </CardHeader>
      <CardContent>
        {violations.length === 0 ? (
          <p role="status" className="text-sm text-muted-foreground">
            Tidak ada pelanggaran konservasi atau kelengkapan pada{" "}
            {conservation.checkedItems.toLocaleString("id-ID")} Rescue Item terminal.
          </p>
        ) : (
          <div
            role="alert"
            aria-label={`${violations.length} peringatan integritas`}
            className="space-y-2 text-sm"
          >
            <p className="font-medium">
              {violations.length} temuan memerlukan pemeriksaan. Angka terkait tidak boleh dipakai
              untuk pelaporan.
            </p>
            {shown.map((violation, index) => (
              <button
                key={`${violation.surplusItemId}-${index}`}
                type="button"
                className="block w-full rounded-lg border p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => inspect(violation.surplusItemId)}
              >
                <span className="font-medium">{violation.itemName}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {violation.issues.map((issue) => issue.message).join(" ")}
                </span>
              </button>
            ))}
            {violations.length > shown.length ? (
              <p className="text-xs text-muted-foreground">
                Menampilkan {shown.length} dari {violations.length} temuan. Sisanya dapat ditemukan
                lewat pencarian di bawah — tidak ada temuan yang dihapus.
              </p>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ItemInspector({
  sessionToken,
  itemId,
}: {
  sessionToken: string;
  itemId: Id<"surplusItems"> | null;
}) {
  const detail = useQuery(
    api.admin.getItemLedger,
    itemId ? { sessionToken, surplusItemId: itemId } : "skip",
  );

  if (!itemId) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        Pilih Rescue Item untuk melihat timeline dan rekonsiliasinya.
      </div>
    );
  }

  if (detail === undefined) {
    return (
      <div role="status" aria-label="Memuat timeline" className="space-y-3">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  if (detail === null) {
    return (
      <div role="alert" className="rounded-xl border border-dashed p-8 text-center">
        Rescue Item tidak ditemukan.
      </div>
    );
  }

  const warnings = [...detail.issues, ...detail.summary.integrity.issues];
  return (
    <section aria-labelledby="ledger-item-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="ledger-item-title" className="text-xl font-semibold">
            {detail.item.name}
          </h2>
          <p className="text-sm text-muted-foreground">
            {detail.item.merchantName} · <span className="break-all">{detail.item._id}</span>
          </p>
        </div>
        <StatusBadge status={detail.item.status} />
      </div>

      {warnings.length ? (
        <div
          role="alert"
          aria-label="Peringatan integritas Rescue Item"
          className="mt-4 rounded-xl border border-destructive/40 bg-destructive/5 p-4"
        >
          <p className="font-semibold">Rekonsiliasi perlu diperiksa</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {warnings.map((warning, index) => (
              <li key={`${warning.code}-${index}`}>{warning.message}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p
          role="status"
          className="mt-4 rounded-xl border border-rescued/40 bg-rescued/10 p-4 text-sm"
        >
          Timeline lengkap, urutan masuk akal, dan material terminal terekonsiliasi.
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        <Metric label="Listed" grams={detail.summary.listedGrams} />
        <Metric label="Rescued" grams={detail.summary.rescuedGrams} />
        <Metric label="Recovered" grams={detail.summary.recoveredGrams} />
        <Metric label="Residual" grams={detail.summary.residualGrams} />
        <Metric label="Dalam proses" grams={detail.summary.inProgressGrams} />
        <Metric label="Process loss" grams={detail.summary.processLossGrams} />
      </div>

      {detail.events.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Belum ada event ledger untuk Rescue Item ini.
        </p>
      ) : (
        <ol
          className="relative mt-6 space-y-0 before:absolute before:bottom-6 before:left-[1.18rem] before:top-6 before:w-px before:bg-border"
          aria-label="Timeline kronologis event ledger"
        >
          {detail.events.map((event) => (
            <li
              key={event._id}
              className="relative flex gap-3 pb-5"
              aria-label={`${event.eventType}, ${formatWibDateTime(event.occurredAt)}, delta ${event.weightDeltaGrams} gram`}
            >
              <span
                className={`z-10 grid size-10 shrink-0 place-items-center rounded-xl ${event.terminal ? "bg-primary text-primary-foreground" : "bg-secondary text-primary"}`}
              >
                <BookOpenCheck className="size-[18px]" />
              </span>
              <article
                className={`min-w-0 flex-1 rounded-xl border p-4 ${event.terminal ? "border-primary/40" : "bg-card"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={event.eventType} />
                      <span className="text-xs text-muted-foreground">
                        {event.terminal ? "Terminal" : "Intermediate"}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatWibDateTime(event.occurredAt)} · {event.actorName ?? "Sistem"} ·{" "}
                      {event.actorRole ?? "sistem"}
                    </p>
                  </div>
                  <p className="font-semibold tabular-nums">
                    {event.weightDeltaGrams > 0 ? "+" : ""}
                    {formatWeight(event.weightDeltaGrams)}
                  </p>
                </div>
                {event.orderId || event.recoveryBatchId ? (
                  <p className="mt-2 break-all text-xs text-muted-foreground">
                    {event.orderId
                      ? `Order ${event.orderId}`
                      : `Recovery Batch ${event.recoveryBatchId}`}
                  </p>
                ) : null}
                {event.metadataMalformed ? (
                  <p role="alert" className="mt-2 text-xs text-destructive">
                    Metadata event tidak valid dan tidak digunakan dalam perhitungan.
                  </p>
                ) : (
                  <Metadata value={event.metadata} />
                )}
              </article>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function LedgerSearch({ sessionToken }: { sessionToken: string }) {
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedId, setSelectedId] = useState<Id<"surplusItems"> | null>(null);
  const { results, status, loadMore } = usePaginatedQuery(
    api.admin.searchLedger,
    {
      sessionToken,
      query: search || undefined,
      fromAt: wibBoundary(fromDate),
      toAt: wibBoundary(toDate, true),
    },
    { initialNumItems: 20 },
  );

  /**
   * Narrowing the result list drops the open item: keeping it would leave the
   * inspector showing a Rescue Item the visible list no longer contains.
   */
  const changeSearch = (value: string) => {
    setSearch(value);
    setSelectedId(null);
  };

  return (
    <div className="space-y-6">
      <IntegrityOverview sessionToken={sessionToken} inspect={setSelectedId} />

      <div className="space-y-3 rounded-xl border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_10rem_10rem]">
          <label className="relative block sm:col-span-2 lg:col-span-1">
            <span className="sr-only">Cari Rescue Item, Merchant, ID, atau event</span>
            <Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => changeSearch(event.target.value)}
              className="pl-9"
              placeholder="Cari item, Merchant, ID, atau event"
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Dari tanggal
            <Input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="mt-1"
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Sampai tanggal
            <Input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="mt-1"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Filter event:</span>
          {EVENT_FILTERS.map((eventType) => (
            <Button
              key={eventType}
              type="button"
              size="sm"
              variant={search === eventType ? "default" : "outline"}
              aria-pressed={search === eventType}
              onClick={() => changeSearch(search === eventType ? "" : eventType)}
            >
              {statusLabel(eventType)}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(17rem,.7fr)_minmax(0,1.3fr)]">
        <section aria-label="Hasil pencarian ledger">
          {status === "LoadingFirstPage" ? (
            <div role="status" className="space-y-2">
              {Array.from({ length: 5 }, (_, index) => (
                <Skeleton key={index} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : null}
          {status !== "LoadingFirstPage" && results.length === 0 ? (
            <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              Tidak ada Rescue Item yang cocok dengan pencarian ini.
            </p>
          ) : null}
          <div className="space-y-2">
            {results.map((row) => (
              <button
                key={row.surplusItemId}
                type="button"
                onClick={() => setSelectedId(row.surplusItemId)}
                aria-current={selectedId === row.surplusItemId}
                className={`w-full rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selectedId === row.surplusItemId ? "border-primary bg-primary/5" : "bg-card hover:bg-accent"}`}
              >
                <span className="flex flex-wrap items-start justify-between gap-2">
                  <span className="font-semibold">{row.itemName}</span>
                  <StatusBadge status={row.status} />
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {row.merchantName} · {row.eventCount} event
                </span>
                <span className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-muted-foreground">
                    {row.lastEventAt ? formatWibDateTime(row.lastEventAt) : "Belum ada event"}
                  </span>
                  <span className="font-medium tabular-nums">
                    Saldo {formatWeight(row.balanceGrams)}
                  </span>
                </span>
              </button>
            ))}
          </div>
          {status === "CanLoadMore" || status === "LoadingMore" ? (
            <Button
              type="button"
              variant="outline"
              className="mt-3 w-full"
              disabled={status === "LoadingMore"}
              onClick={() => loadMore(20)}
            >
              {status === "LoadingMore" ? "Memuat..." : "Muat berikutnya"}
            </Button>
          ) : null}
        </section>
        <ItemInspector sessionToken={sessionToken} itemId={selectedId} />
      </div>
    </div>
  );
}

function LedgerContent() {
  const { sessionToken } = useAuth();
  return sessionToken ? <LedgerSearch sessionToken={sessionToken} /> : null;
}

export default function LedgerPage() {
  return (
    <>
      <PageHeader
        title="Material Flow Ledger"
        description="Inspeksi read-only alur material, rekonsiliasi berat, dan bukti outcome tanpa mengubah riwayat."
      />
      <QueryErrorBoundary title="Material Flow Ledger tidak dapat dimuat">
        <LedgerContent />
      </QueryErrorBoundary>
    </>
  );
}
