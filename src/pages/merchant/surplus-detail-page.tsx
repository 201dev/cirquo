import { ArrowLeft, Clock3, RotateCcw, Scale, ShieldAlert } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import type { Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import { PageHeader } from "@/components/common/page-header";
import { QueryErrorBoundary } from "@/components/common/query-error-boundary";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import {
  formatIdr,
  formatKg,
  formatPickupWindow,
  formatWibDate,
  formatWibTime,
} from "@/lib/format";

function RecoveryStatus({
  status,
  routingAttempts,
  offerExpiresAt,
  processorName,
  offeredWeightGrams,
  acceptedWeightGrams,
  outputWeightGrams,
  residualWeightGrams,
  processLossGrams,
}: {
  status: string;
  routingAttempts: number;
  offerExpiresAt?: number;
  processorName?: string;
  offeredWeightGrams: number;
  acceptedWeightGrams?: number;
  outputWeightGrams?: number;
  residualWeightGrams?: number;
  processLossGrams?: number;
}) {
  if (status === "pending") {
    return (
      <section role="status" aria-live="polite" className="rounded-xl border border-in-progress/30 bg-in-progress/10 p-5">
        <StatusBadge status="recovery_pending" />
        <h2 className="mt-3 font-semibold">Window pickup telah berakhir</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatKg(offeredWeightGrams)} material menunggu Circular Routing.
        </p>
      </section>
    );
  }

  if (status === "offered") {
    const isRetry = routingAttempts > 1;
    return (
      <section role="status" aria-live="polite" className="rounded-xl border border-primary/30 bg-primary/5 p-5">
        <StatusBadge status="offered" />
        <h2 className="mt-3 font-semibold">
          {isRetry ? "Circular Routing sedang mencoba kembali" : "Material ditawarkan ke Organic Processor"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {processorName ? `Ditawarkan ke ${processorName}. ` : "Processor yang memenuhi syarat sedang menerima offer ini. "}
          Percobaan {routingAttempts} dari 3.
          {offerExpiresAt ? ` Offer berlaku sampai ${formatWibDate(offerExpiresAt)}, ${formatWibTime(offerExpiresAt)} WIB.` : ""}
        </p>
      </section>
    );
  }

  if (status === "unroutable") {
    return (
      <section role="status" aria-live="polite" className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
        <StatusBadge status="unroutable" />
        <h2 className="mt-3 font-semibold">Circular Routing belum berhasil</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tidak ada Organic Processor yang dapat menerima {formatKg(offeredWeightGrams)} material ini{routingAttempts > 0 ? ` setelah ${routingAttempts} percobaan.` : "."}
        </p>
      </section>
    );
  }

  if (status === "accepted" || status === "collected" || status === "processed") {
    return (
      <section role="status" aria-live="polite" className="rounded-xl border border-primary/30 bg-primary/5 p-5">
        <StatusBadge status={status} />
        <h2 className="mt-3 font-semibold">
          {status === "accepted" ? "Organic Processor menerima batch" : status === "collected" ? "Intake terukur telah dicatat" : "Material selesai diproses"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {processorName ? `${processorName}. ` : ""}
          {acceptedWeightGrams !== undefined ? `Berat terukur ${formatKg(acceptedWeightGrams)} dari deklarasi ${formatKg(offeredWeightGrams)}.` : `Berat deklarasi ${formatKg(offeredWeightGrams)}.`}
        </p>
        {status === "processed" ? (
          <p className="mt-2 text-sm">
            Recovered {formatKg(outputWeightGrams ?? 0)} · Residual {formatKg(residualWeightGrams ?? 0)} · Process loss {formatKg(processLossGrams ?? 0)}
          </p>
        ) : null}
      </section>
    );
  }

  return null;
}

function RescuedStatus({ count, weightGrams }: { count: number; weightGrams: number }) {
  if (count === 0) return null;

  return (
    <section role="status" aria-live="polite" className="rounded-xl border border-rescued/30 bg-rescued/10 p-5">
      <StatusBadge status="picked_up" />
      <h2 className="mt-3 font-semibold">Pickup berhasil dikonfirmasi</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {count} pesanan · {formatKg(weightGrams)} material tercatat sebagai Rescued.
      </p>
    </section>
  );
}

function DetailSkeleton() {
  return (
    <>
      <PageHeader title="Memuat Rescue Item" />
      <div role="status" className="space-y-3 rounded-xl bg-card p-5">
        <span className="sr-only">Memuat detail Rescue Item...</span>
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-32 w-full" />
      </div>
    </>
  );
}

function SurplusDetailContent() {
  const { id } = useParams();
  const { sessionToken } = useAuth();
  const item = useQuery(
    api.surplusItems.getMine,
    id && sessionToken
      ? { id: id as Id<"surplusItems">, sessionToken }
      : "skip",
  );
  const recoveryBatches = useQuery(
    api.recoveryBatches.listForMerchant,
    sessionToken ? { sessionToken } : "skip",
  );

  if (item === undefined || recoveryBatches === undefined) return <DetailSkeleton />;
  if (item === null) return <PageHeader title="Rescue Item tidak ditemukan" />;

  const recoveryBatch = recoveryBatches.find(
    (batch) => batch.surplusItemId === item._id,
  );
  const pickupWindow = `${formatWibDate(item.pickupStartAt)} · ${formatPickupWindow(item.pickupStartAt, item.pickupEndAt)}`;

  return (
    <>
      <Button asChild variant="ghost" className="mb-2 -ml-3">
        <Link to="/merchant/surplus">
          <ArrowLeft />
          Kembali
        </Link>
      </Button>
      <PageHeader
        title={item.name}
        description={item.processingOnly ? "Rescue Item khusus Organic Processor." : "Rescue Item yang dikelola Merchant."}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <section className="rounded-xl bg-card p-5 shadow-sm sm:p-6">
          <StatusBadge status={item.status} />
          <p className="mt-4 text-2xl font-semibold">{formatIdr(item.currentPrice)}</p>
          <p className="text-sm text-muted-foreground"><s>{formatIdr(item.originalPrice)}</s></p>
          <dl className="mt-6 grid gap-4 border-t pt-5 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">Stok tersisa</dt>
              <dd className="mt-1 font-semibold">{item.remainingQuantity} dari {item.initialQuantity} unit</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Pickup</dt>
              <dd className="mt-1 font-semibold">{pickupWindow}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Diterbitkan</dt>
              <dd className="mt-1 font-semibold">{item.publishedAt ? formatWibDate(item.publishedAt) : "Masih draf"}</dd>
            </div>
          </dl>
        </section>
        <aside className="rounded-xl bg-secondary p-5">
          <h2 className="font-semibold">Ringkasan</h2>
          <dl className="mt-5 space-y-5">
            <div className="flex gap-3">
              <span className="grid size-9 place-items-center rounded-lg bg-background text-primary"><Scale className="size-4" /></span>
              <div><dt className="text-xs text-muted-foreground">Stok tersedia</dt><dd className="text-sm font-semibold">{item.remainingQuantity} unit</dd></div>
            </div>
            <div className="flex gap-3">
              <span className="grid size-9 place-items-center rounded-lg bg-background text-primary"><Clock3 className="size-4" /></span>
              <div><dt className="text-xs text-muted-foreground">Waktu pickup</dt><dd className="text-sm font-semibold">{pickupWindow}</dd></div>
            </div>
          </dl>
        </aside>
      </div>

      <section className="mt-6 space-y-4" aria-label="Status material">
        <RescuedStatus count={item.pickedUpOrderCount} weightGrams={item.rescuedWeightGrams} />
        {recoveryBatch ? (
          <RecoveryStatus {...recoveryBatch} />
        ) : item.status === "recovery_pending" ? (
          <div role="status" className="rounded-xl border border-in-progress/30 bg-in-progress/10 p-5">
            <RotateCcw className="size-5" aria-hidden="true" />
            <p className="mt-2 text-sm text-muted-foreground">Window pickup berakhir. Batch recovery sedang disiapkan.</p>
          </div>
        ) : item.status === "closed" && item.pickedUpOrderCount === 0 ? (
          <div role="status" className="rounded-xl border bg-card p-5">
            <ShieldAlert className="size-5" aria-hidden="true" />
            <p className="mt-2 text-sm text-muted-foreground">Rescue Item ini sudah ditutup.</p>
          </div>
        ) : null}
      </section>
    </>
  );
}

export default function SurplusDetailPage() {
  return (
    <QueryErrorBoundary title="Status Rescue Item tidak dapat dimuat">
      <SurplusDetailContent />
    </QueryErrorBoundary>
  );
}
