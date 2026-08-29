import { Leaf, Scale, WalletCards } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { PageHeader } from "@/components/common/page-header";
import { QueryErrorBoundary } from "@/components/common/query-error-boundary";
import { SummaryCard } from "@/components/common/summary-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { formatIdr, formatKg } from "@/lib/format";

function ImpactSkeleton() {
  return (
    <div role="status" aria-label="Memuat dampakmu" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <span className="sr-only">Memuat dampakmu...</span>
      {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-32 rounded-xl" />)}
    </div>
  );
}

function ConsumerImpactContent() {
  const { sessionToken } = useAuth();
  const summary = useQuery(
    api.impact.getConsumerSummary,
    sessionToken ? { sessionToken } : "skip",
  );

  if (summary === undefined) return <ImpactSkeleton />;

  if (summary.rescuedQuantity === 0) {
    return (
      <section role="status" className="rounded-xl border border-dashed bg-card px-5 py-12 text-center">
        <Scale className="mx-auto size-9 text-muted-foreground" aria-hidden="true" />
        <h2 className="mt-4 text-lg font-semibold">Belum ada pickup selesai</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          Dampak pribadi tercatat setelah Merchant mengonfirmasi pickup dengan kode yang kamu tunjukkan.
        </p>
        <Button asChild variant="outline" className="mt-5">
          <Link to="/explore">Jelajah Rescue Item</Link>
        </Button>
      </section>
    );
  }

  return (
    <section aria-labelledby="consumer-impact-title">
      {!summary.integrity.isValid ? (
        <p role="alert" className="rounded-lg border border-warning-border bg-warning px-3 py-2 text-sm text-warning-foreground">
          Data dampakmu belum lengkap. Nilai yang belum dapat dipastikan ditampilkan sebagai —.
        </p>
      ) : null}
      <p className="sr-only" role="status" aria-live="polite">
        Dampakmu diperbarui: {formatKg(summary.rescuedGrams)} terselamatkan.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Paket terselamatkan"
          value={summary.rescuedQuantity === null ? "—" : summary.rescuedQuantity.toLocaleString("id-ID")}
          description="Pickup selesai milikmu"
          icon={<Scale />}
          tone="green"
        />
        <SummaryCard
          label="Berat terselamatkan"
          value={formatKg(summary.rescuedGrams)}
          description="Tercatat saat pickup dikonfirmasi"
          icon={<Scale />}
          tone="green"
        />
        <SummaryCard
          label="Hemat"
          value={summary.consumerSavingsIdr === null ? "—" : formatIdr(summary.consumerSavingsIdr)}
          description="Dari snapshot harga asli saat reservasi"
          icon={<WalletCards />}
        />
        <SummaryCard
          label="Estimated CO2e avoided"
          value={summary.estimatedCo2eGrams === null ? "—" : formatKg(summary.estimatedCo2eGrams)}
          description={`Estimasi berdasarkan ${summary.methodologyVersion}`}
          icon={<Leaf />}
          tone="blue"
        />
      </div>
      <p id="consumer-impact-title" className="mt-6 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Estimated CO2e avoided adalah hasil metodologi {summary.methodologyVersion}, bukan pengukuran langsung. Hanya pickup selesai milikmu yang dihitung.
      </p>
    </section>
  );
}

export default function ImpactPage() {
  return (
    <>
      <PageHeader
        title="Dampakmu"
        description="Ringkasan pickup selesai yang tercatat atas namamu di Material Flow Ledger."
      />
      <QueryErrorBoundary title="Dampakmu tidak dapat dimuat">
        <ConsumerImpactContent />
      </QueryErrorBoundary>
    </>
  );
}
