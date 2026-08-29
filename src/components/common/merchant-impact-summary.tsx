import {
  CircleDollarSign,
  CircleGauge,
  Leaf,
  PackageCheck,
  Recycle,
  Scale,
  Sprout,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ImpactBreakdown } from "@/components/common/impact-breakdown";
import { SummaryCard } from "@/components/common/summary-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { formatIdr, formatKg, formatPercent } from "@/lib/format";

function valueOrDash(value: number | null, formatter: (value: number) => string) {
  return value === null ? "—" : formatter(value);
}

function MerchantImpactSkeleton() {
  return (
    <div role="status" aria-label="Memuat dampak Merchant" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <span className="sr-only">Memuat dampak Merchant...</span>
      {Array.from({ length: 9 }, (_, index) => (
        <Skeleton key={index} className="h-32 rounded-xl" />
      ))}
    </div>
  );
}

export function MerchantImpactSummary() {
  const { sessionToken } = useAuth();
  const summary = useQuery(
    api.impact.getMerchantSummary,
    sessionToken ? { sessionToken } : "skip",
  );

  if (summary === undefined) return <MerchantImpactSkeleton />;

  if (summary.listedItemCount === 0) {
    return (
      <section role="status" className="rounded-xl border border-dashed bg-card px-5 py-12 text-center">
        <PackageCheck className="mx-auto size-9 text-muted-foreground" aria-hidden="true" />
        <h2 className="mt-4 text-lg font-semibold">Belum ada Rescue Item tercatat</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          Buat dan publikasikan Rescue Item pertamamu. Dampak akan diperbarui otomatis saat aliran material tercatat.
        </p>
        <Button asChild variant="outline" className="mt-5">
          <Link to="/merchant/surplus/new">Buat Rescue Item</Link>
        </Button>
      </section>
    );
  }

  return (
    <section aria-labelledby="merchant-impact-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="merchant-impact-title" className="text-xl font-semibold tracking-[-0.02em]">
            Dampak material
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Diperbarui otomatis dari Material Flow Ledger Rescue Item milikmu.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">Estimasi berdasarkan {summary.methodologyVersion}</p>
      </div>

      {!summary.integrity.isValid ? (
        <p role="alert" className="mt-4 rounded-lg border border-warning-border bg-warning px-3 py-2 text-sm text-warning-foreground">
          {summary.integrity.issues.length} catatan ledger perlu diperiksa. Nilai yang belum dapat dipastikan ditampilkan sebagai —.
        </p>
      ) : null}

      <p className="sr-only" role="status" aria-live="polite">
        Dampak Merchant diperbarui: {formatKg(summary.rescuedGrams)} terselamatkan.
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard label="Rescue Item tercatat" value={summary.listedItemCount.toLocaleString("id-ID")} description="Dipublikasikan ke aliran material" icon={<PackageCheck />} tone="green" />
        <SummaryCard label="Berat tercatat" value={formatKg(summary.listedGrams)} description="Material yang masuk ke Cirquo" icon={<Scale />} />
        <SummaryCard label="Terselamatkan" value={formatKg(summary.rescuedGrams)} description="Pickup yang telah dikonfirmasi" icon={<Recycle />} tone="green" />
        <SummaryCard label="Terolah" value={valueOrDash(summary.recoveredGrams, formatKg)} description="Output yang tercatat Processor" icon={<Sprout />} tone="green" />
        <SummaryCard label="Residu" value={valueOrDash(summary.residualGrams, formatKg)} description="Dilaporkan terpisah dari proses" icon={<Scale />} tone="amber" />
        <SummaryCard label="Dalam proses" value={valueOrDash(summary.inProgressGrams, formatKg)} description="Belum memiliki outcome akhir" icon={<Recycle />} tone="blue" />
        <SummaryCard label="Circularity rate" value={valueOrDash(summary.circularityRatePercent, formatPercent)} description="Rescued + Recovered dari material listed" icon={<CircleGauge />} tone="blue" />
        <SummaryCard label="Pendapatan terealisasi" value={valueOrDash(summary.revenueRecoveredIdr, formatIdr)} description="Nilai pickup Rescued, bukan harga awal" icon={<CircleDollarSign />} />
        <SummaryCard label="Estimated CO2e avoided" value={valueOrDash(summary.estimatedCo2eGrams, formatKg)} description={`Estimasi berdasarkan ${summary.methodologyVersion}`} icon={<Leaf />} tone="blue" />
      </div>
      <div className="mt-6">
        <ImpactBreakdown
          rescuedGrams={summary.rescuedGrams}
          recoveredGrams={summary.recoveredGrams}
          residualGrams={summary.residualGrams}
          inProgressGrams={summary.inProgressGrams}
        />
      </div>
    </section>
  );
}
