import {
  ArrowRight,
  ClipboardCheck,
  Leaf,
  Recycle,
  Scale,
  Settings2,
  Sprout,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ImpactBreakdown } from "@/components/common/impact-breakdown";
import { PageHeader } from "@/components/common/page-header";
import { QueryErrorBoundary } from "@/components/common/query-error-boundary";
import { SummaryCard } from "@/components/common/summary-card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { formatKg, formatPercent } from "@/lib/format";

const outputLabels = {
  compost: "Kompos",
  bsf_larvae: "Larva BSF",
  animal_feed: "Pakan ternak",
  biogas: "Biogas",
};

function valueOrDash(value: number | null, formatter: (value: number) => string) {
  return value === null ? "—" : formatter(value);
}

function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Memuat ringkasan fasilitas" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <span className="sr-only">Memuat ringkasan fasilitas...</span>
      {Array.from({ length: 8 }, (_, index) => <Skeleton key={index} className="h-32 rounded-xl" />)}
    </div>
  );
}

function ProcessorDashboardContent() {
  const { sessionToken, user } = useAuth();
  const isVerified = user?.profile?.type === "processor" && user.profile.verificationStatus === "verified";
  const summary = useQuery(
    api.impact.getProcessorSummary,
    sessionToken && isVerified ? { sessionToken } : "skip",
  );

  if (!isVerified) {
    return (
      <section role="status" className="rounded-xl border border-dashed bg-card px-5 py-12 text-center">
        <Recycle className="mx-auto size-9 text-muted-foreground" aria-hidden="true" />
        <h2 className="mt-4 text-lg font-semibold">Menunggu verifikasi fasilitas</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          Ringkasan operasional tersedia setelah profil Organic Processor terverifikasi.
        </p>
        <Button asChild variant="outline" className="mt-5">
          <Link to="/processor/profile">Tinjau profil</Link>
        </Button>
      </section>
    );
  }

  if (summary === undefined) return <DashboardSkeleton />;

  const operations = summary.processor;
  const capacityWarning = operations.capacityUtilizationPercent !== null
    && operations.capacityUtilizationPercent >= 90;

  if (!operations.hasBatches) {
    return (
      <section role="status" className="rounded-xl border border-dashed bg-card px-5 py-12 text-center">
        <Recycle className="mx-auto size-9 text-muted-foreground" aria-hidden="true" />
        <h2 className="mt-4 text-lg font-semibold">Belum ada batch recovery</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          Saat material yang sesuai selesai masa pickup, Circular Routing dapat menawarkan batch ke fasilitasmu berdasarkan material, radius, dan kapasitas harian.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button asChild><Link to="/processor/recovery">Buka antrean <ArrowRight /></Link></Button>
          <Button asChild variant="outline"><Link to="/processor/profile">Atur kapasitas</Link></Button>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="processor-impact-title">
      {!summary.integrity.isValid ? (
        <p role="alert" className="rounded-lg border border-warning-border bg-warning px-3 py-2 text-sm text-warning-foreground">
          {summary.integrity.issues.length} catatan ledger perlu diperiksa. Nilai yang belum dapat dipastikan ditampilkan sebagai —.
        </p>
      ) : null}
      {capacityWarning ? (
        <p role="alert" className="mt-4 rounded-lg border border-warning-border bg-warning px-3 py-2 text-sm text-warning-foreground">
          Kapasitas intake hari ini sudah {formatPercent(operations.capacityUtilizationPercent!)}. Offer baru dapat dibatasi.
        </p>
      ) : null}
      <p className="sr-only" role="status" aria-live="polite">
        Ringkasan fasilitas diperbarui: {formatKg(operations.totalMeasuredIntakeGrams ?? 0)} intake terukur.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Offer aktif" value={operations.offeredBatchCount.toLocaleString("id-ID")} description="Menunggu keputusan fasilitas" icon={<Recycle />} tone="blue" />
        <SummaryCard label="Menunggu intake" value={operations.acceptedBatchCount.toLocaleString("id-ID")} description="Batch sudah diterima" icon={<ClipboardCheck />} />
        <SummaryCard label="Menunggu outcome" value={operations.collectedBatchCount.toLocaleString("id-ID")} description="Intake sudah diukur" icon={<Scale />} />
        <SummaryCard label="Batch terproses" value={operations.processedBatchCount.toLocaleString("id-ID")} description="Outcome final tercatat" icon={<Sprout />} tone="green" />
        <SummaryCard label="Intake terukur" value={valueOrDash(operations.totalMeasuredIntakeGrams, formatKg)} description="Total dari event INTAKE_ACCEPTED" icon={<Scale />} tone="green" />
        <SummaryCard label="Efisiensi recovery" value={valueOrDash(operations.recoveryEfficiencyPercent, formatPercent)} description="Output usable dari intake batch terproses" icon={<Sprout />} tone="green" />
        <SummaryCard label="Residu terukur" value={valueOrDash(summary.residualGrams, formatKg)} description={`Laju residu ${valueOrDash(operations.residualRatePercent, formatPercent)}`} icon={<Scale />} tone="amber" />
        <SummaryCard label="Estimated CO2e avoided" value={valueOrDash(summary.estimatedCo2eGrams, formatKg)} description={`Estimasi berdasarkan ${summary.methodologyVersion}`} icon={<Leaf />} tone="blue" />
      </div>

      <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="rounded-xl bg-card p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 id="processor-impact-title" className="font-semibold">Kapasitas intake hari ini</h2>
              <p className="mt-1 text-sm text-muted-foreground">Berat intake terukur dibanding kapasitas harian fasilitas.</p>
            </div>
            <p className="font-semibold">
              {valueOrDash(operations.todayIntakeGrams, formatKg)} / {valueOrDash(operations.dailyCapacityGrams, formatKg)}
            </p>
          </div>
          <Progress className="mt-5" value={Math.min(100, operations.capacityUtilizationPercent ?? 0)} aria-label="Pemakaian kapasitas intake hari ini" />
          <p role="status" className="mt-3 text-sm text-muted-foreground">
            {operations.dailyCapacityGrams === 0
              ? "Intake sedang dijeda; kapasitas harian diatur 0 gram."
              : operations.capacityUtilizationPercent === null
                ? "Kapasitas atau intake belum dapat dipastikan."
                : `${formatPercent(operations.capacityUtilizationPercent)} kapasitas telah digunakan.`}
          </p>
        </div>
        <div className="rounded-xl bg-card p-5 shadow-sm sm:p-6">
          <h2 className="font-semibold">Output terolah</h2>
          <p className="mt-1 text-sm text-muted-foreground">Berdasarkan outcome yang telah final.</p>
          <dl className="mt-4 space-y-3 text-sm">
            {Object.entries(outputLabels).map(([type, label]) => (
              <div key={type} className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-medium">{summary.recoveredByOutputType === null ? "—" : formatKg(summary.recoveredByOutputType[type as keyof typeof outputLabels])}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
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

export default function ProcessorDashboardPage() {
  const { user } = useAuth();
  const processorName = user?.profile?.type === "processor" ? user.profile.name : "fasilitas";

  return (
    <>
      <PageHeader
        title={`Ringkasan ${processorName}`}
        description="Pantau offer, kapasitas, dan outcome berdasarkan batch serta Material Flow Ledger fasilitasmu."
        action={<div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link to="/processor/profile"><Settings2 />Atur profil</Link></Button><Button asChild><Link to="/processor/recovery">Buka antrean</Link></Button></div>}
      />
      <QueryErrorBoundary title="Ringkasan fasilitas tidak dapat dimuat">
        <ProcessorDashboardContent />
      </QueryErrorBoundary>
    </>
  );
}
