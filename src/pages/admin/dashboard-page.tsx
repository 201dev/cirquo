import {
  AlertTriangle,
  CircleGauge,
  Leaf,
  Recycle,
  Scale,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ImpactBreakdown } from "@/components/common/impact-breakdown";
import { PageHeader } from "@/components/common/page-header";
import { QueryErrorBoundary } from "@/components/common/query-error-boundary";
import { SummaryCard } from "@/components/common/summary-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { formatKg, formatPercent } from "@/lib/format";

function valueOrDash(value: number | null, formatter: (value: number) => string) {
  return value === null ? "—" : formatter(value);
}

function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Memuat ringkasan platform" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <span className="sr-only">Memuat ringkasan platform...</span>
      {Array.from({ length: 12 }, (_, index) => <Skeleton key={index} className="h-32 rounded-xl" />)}
    </div>
  );
}

function AdminDashboardContent() {
  const { sessionToken } = useAuth();
  const summary = useQuery(
    api.impact.getPlatformSummary,
    sessionToken ? { sessionToken } : "skip",
  );

  if (summary === undefined) return <DashboardSkeleton />;

  const qualityRequiresReview = !summary.integrity.isValid || summary.platform.circularityRequiresReview;
  const circularity = summary.platform.circularityRequiresReview
    ? "Periksa data"
    : valueOrDash(summary.circularityRatePercent, formatPercent);

  return (
    <section aria-labelledby="platform-impact-title">
      {summary.listedItemCount === 0 ? (
        <p role="status" className="rounded-lg border border-dashed bg-card px-4 py-3 text-sm text-muted-foreground">
          Belum ada material yang tercatat di Material Flow Ledger. Angka di bawah akan diperbarui otomatis saat alur pertama berjalan.
        </p>
      ) : null}
      {qualityRequiresReview ? (
        <p role="alert" className="mt-4 rounded-lg border border-warning-border bg-warning px-3 py-2 text-sm text-warning-foreground">
          {summary.platform.circularityRequiresReview
            ? "Circularity rate melampaui 99%. Periksa Material Flow Ledger sebelum memakai angka ini sebagai laporan."
            : `${summary.integrity.issues.length} catatan ledger perlu diperiksa. Nilai yang belum dapat dipastikan ditampilkan sebagai —.`}
        </p>
      ) : null}
      <p className="sr-only" role="status" aria-live="polite">
        Ringkasan platform diperbarui: {formatKg(summary.rescuedGrams)} terselamatkan dan {valueOrDash(summary.recoveredGrams, formatKg)} terolah.
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Rescue Item tercatat" value={summary.listedItemCount.toLocaleString("id-ID")} description={formatKg(summary.listedGrams)} icon={<Scale />} />
        <SummaryCard label="Terselamatkan" value={formatKg(summary.rescuedGrams)} description="Pickup telah dikonfirmasi" icon={<Recycle />} tone="green" />
        <SummaryCard label="Terolah" value={valueOrDash(summary.recoveredGrams, formatKg)} description="Output usable Processor" icon={<Recycle />} tone="green" />
        <SummaryCard label="Residu" value={valueOrDash(summary.residualGrams, formatKg)} description="Dilaporkan setara dengan outcome lain" icon={<AlertTriangle />} tone="amber" />
        <SummaryCard label="Dalam proses" value={valueOrDash(summary.inProgressGrams, formatKg)} description="Belum memiliki outcome akhir" icon={<Recycle />} tone="blue" />
        <SummaryCard label="Circularity rate" value={circularity} description={summary.platform.circularityRequiresReview ? "Melebihi ambang kualitas data" : "Rescued + Recovered dari material listed"} icon={<CircleGauge />} tone="blue" />
        <SummaryCard label="Diversion rate" value={valueOrDash(summary.diversionRatePercent, formatPercent)} description="Recovered dari material yang tidak di-rescue" icon={<CircleGauge />} />
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

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
        <div>
          <h2 id="platform-impact-title" className="text-xl font-semibold">Operasi platform</h2>
          <p className="mt-1 text-sm text-muted-foreground">Akun aktif dan batch yang memerlukan tindak lanjut, diperbarui dari server.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <SummaryCard label="Merchant aktif" value={summary.platform.activeMerchantCount.toLocaleString("id-ID")} icon={<UsersRound />} />
            <SummaryCard label="Consumer aktif" value={summary.platform.activeConsumerCount.toLocaleString("id-ID")} icon={<UsersRound />} />
            <SummaryCard label="Processor aktif" value={summary.platform.activeProcessorCount.toLocaleString("id-ID")} icon={<UsersRound />} />
            <SummaryCard label="Routing belum terselesaikan" value={summary.platform.unroutableBatchCount.toLocaleString("id-ID")} description="Tindak lanjut manual tersedia pada M7" icon={<AlertTriangle />} tone="amber" />
          </div>
        </div>
        <aside className="rounded-xl bg-secondary p-5">
          <ShieldCheck className="size-8 text-primary" aria-hidden="true" />
          <h2 className="mt-4 font-semibold">Kualitas data</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {qualityRequiresReview
              ? "Ada angka yang perlu ditinjau. Gunakan Material Flow Ledger untuk menelusuri sumbernya sebelum pelaporan."
              : "Tidak ada masalah integritas yang terdeteksi dalam ringkasan ini. Material tetap ditampilkan hingga outcome tercatat."}
          </p>
          <Button asChild variant="outline" className="mt-5"><Link to="/admin/ledger">Buka Material Flow Ledger</Link></Button>
        </aside>
      </section>
    </section>
  );
}

export default function AdminDashboardPage() {
  return (
    <>
      <PageHeader
        title="Ringkasan platform"
        description="Pantau alur material platform secara read-only dari Material Flow Ledger."
        action={<Button asChild variant="outline"><Link to="/admin/ledger">Buka ledger</Link></Button>}
      />
      <QueryErrorBoundary title="Ringkasan platform tidak dapat dimuat">
        <AdminDashboardContent />
      </QueryErrorBoundary>
    </>
  );
}
