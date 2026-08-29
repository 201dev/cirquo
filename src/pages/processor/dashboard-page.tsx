import { ArrowRight, ClipboardCheck, Recycle, Scale, Settings2, Sprout } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { PageHeader } from "@/components/common/page-header";
import { QueryErrorBoundary } from "@/components/common/query-error-boundary";
import { StatusBadge } from "@/components/common/status-badge";
import { SummaryCard } from "@/components/common/summary-card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { formatDistance, formatKg, formatPercent } from "@/lib/format";

const outputLabels = {
  compost: "Kompos",
  bsf_larvae: "Larva BSF",
  animal_feed: "Pakan ternak",
  biogas: "Biogas",
};

function DashboardSkeleton() {
  return <div role="status" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><span className="sr-only">Memuat ringkasan fasilitas...</span>{[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-36 rounded-xl" />)}</div>;
}

function DashboardContent() {
  const { sessionToken, user } = useAuth();
  const [now, setNow] = useState(Date.now());
  const isVerified = user?.profile?.verificationStatus === "verified";
  const dashboard = useQuery(
    api.recoveryBatches.getDashboard,
    sessionToken && isVerified ? { sessionToken, now } : "skip",
  );
  const offers = useQuery(
    api.recoveryBatches.listQueue,
    sessionToken && isVerified ? { sessionToken, tab: "offered", limit: 3 } : "skip",
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  if (!isVerified) return (
    <div role="status" className="rounded-xl border border-dashed p-8 text-center">
      <p className="font-semibold">Menunggu verifikasi fasilitas</p>
      <p className="mt-1 text-sm text-muted-foreground">Ringkasan operasional tersedia setelah profil Organic Processor terverifikasi.</p>
      <Button asChild variant="outline" className="mt-4"><Link to="/processor/profile">Tinjau profil</Link></Button>
    </div>
  );
  if (dashboard === undefined || offers === undefined) return <DashboardSkeleton />;

  const offeredWeightGrams = offers.reduce((total, batch) => total + batch.offeredWeightGrams, 0);
  const capacityProgress = Math.min(100, dashboard.capacityUsagePercent);
  const capacityLimited = dashboard.capacityUsagePercent >= 90;
  return (
    <>
      <PageHeader
        title={`Ringkasan ${user?.profile?.name ?? "fasilitas"}`}
        description="Pantau kapasitas, antrean recovery, dan hasil pengolahan yang sudah tercatat."
        action={<div className="flex gap-2"><Button asChild variant="outline"><Link to="/processor/profile"><Settings2 />Atur profil</Link></Button><Button asChild><Link to="/processor/recovery">Buka antrean</Link></Button></div>}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Offer baru" value={`${dashboard.offeredCount} batch`} description={offeredWeightGrams ? `${formatKg(offeredWeightGrams)} menunggu` : "Tidak ada berat menunggu"} icon={<Recycle />} tone="blue" />
        <SummaryCard label="Menunggu intake" value={`${dashboard.acceptedCount} batch`} description={`${dashboard.collectedCount} batch siap dicatat outcome`} icon={<ClipboardCheck />} />
        <SummaryCard label="Intake hari ini" value={formatKg(dashboard.todayIntakeGrams)} description={`Komitmen ${formatKg(dashboard.capacityCommittedGrams)}`} icon={<Scale />} tone="green" />
        <SummaryCard label="Efisiensi recovery" value={dashboard.recoveryRatePercent === null ? "—" : formatPercent(dashboard.recoveryRatePercent)} description={`${dashboard.processedCount} batch selesai diproses`} icon={<Sprout />} tone="amber" />
      </div>

      <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="rounded-xl bg-card p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2"><div><h2 className="font-semibold">Kapasitas hari ini</h2><p className="mt-1 text-sm text-muted-foreground">Komitmen batch diterima menentukan eligibility Circular Routing.</p></div><p className="font-semibold">{formatKg(dashboard.capacityCommittedGrams)} / {formatKg(dashboard.dailyCapacityGrams)}</p></div>
          <Progress className="mt-5" value={capacityProgress} aria-label="Pemakaian kapasitas harian" />
          <p role="status" className={`mt-3 text-sm ${capacityLimited ? "text-warning-foreground" : "text-muted-foreground"}`}>
            {dashboard.dailyCapacityGrams === 0 ? "Intake sedang dijeda; kapasitas harian diatur 0 gram." : capacityLimited ? "Kapasitas sudah mencapai 90%; offer baru dapat dibatasi." : `${formatPercent(dashboard.capacityUsagePercent)} kapasitas telah terikat.`}
          </p>
        </div>
        <div className="rounded-xl bg-card p-5 shadow-sm sm:p-6">
          <h2 className="font-semibold">Hasil terolah</h2>
          <p className="mt-1 text-sm text-muted-foreground">Berdasarkan event outcome yang sudah final.</p>
          <dl className="mt-4 space-y-3 text-sm">{Object.entries(outputLabels).map(([type, label]) => <div key={type} className="flex justify-between gap-4"><dt className="text-muted-foreground">{label}</dt><dd className="font-medium">{formatKg(dashboard.outputByType[type as keyof typeof outputLabels])}</dd></div>)}</dl>
          <div className="mt-4 border-t pt-4 text-sm"><p className="flex justify-between gap-4"><span className="text-muted-foreground">Output usable</span><span className="font-medium">{formatKg(dashboard.outputWeightGrams)}</span></p><p className="mt-2 flex justify-between gap-4"><span className="text-muted-foreground">Residual</span><span className="font-medium">{formatKg(dashboard.residualWeightGrams)}</span></p></div>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between gap-4"><div><h2 className="text-xl font-semibold">Permintaan terbaru</h2><p className="mt-1 text-sm text-muted-foreground">Offer aktif yang ditugaskan ke fasilitasmu.</p></div><Button asChild variant="ghost"><Link to="/processor/recovery">Lihat semua <ArrowRight /></Link></Button></div>
        {!offers.length ? <div className="rounded-xl border border-dashed px-5 py-10 text-center text-sm text-muted-foreground">Belum ada offer aktif. Kesesuaian material, radius, dan kapasitas menentukan offer berikutnya.</div> : <div className="space-y-3">{offers.map((batch) => <Link to={`/processor/recovery/${batch._id}`} key={batch._id} className="flex flex-wrap items-center gap-4 rounded-xl bg-card p-4 shadow-sm transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="grid size-11 place-items-center rounded-xl bg-secondary text-primary"><Recycle className="size-5" /></span><div className="min-w-0 flex-1"><p className="font-medium">{batch.itemName}</p><p className="text-xs text-muted-foreground">{batch.merchantName} · {batch.distanceMeters === null ? "Jarak belum tersedia" : formatDistance(batch.distanceMeters)}</p></div><StatusBadge status={batch.status} /><p className="font-semibold">{formatKg(batch.offeredWeightGrams)}</p></Link>)}</div>}
      </section>
    </>
  );
}

export default function ProcessorDashboardPage() {
  return <QueryErrorBoundary title="Ringkasan fasilitas tidak dapat dimuat"><DashboardContent /></QueryErrorBoundary>;
}
