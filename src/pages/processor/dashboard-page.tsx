import { ArrowRight, Recycle, Scale, Sprout } from "lucide-react";
import { Link } from "react-router-dom";
import { ImpactBreakdown } from "@/components/common/impact-breakdown";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { SummaryCard } from "@/components/common/summary-card";
import { Button } from "@/components/ui/button";
import { demoImpact, formatKg, recoveryBatches } from "@/constants/mock-data";

export default function ProcessorDashboardPage() {
  return (
    <>
      <PageHeader
        title="Ringkasan KomposKita"
        description="Pantau kapasitas, terima batch terdekat, dan catat outcome pengolahan."
        action={
          <Button asChild>
            <Link to="/processor/recovery">Buka antrean</Link>
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Antrean baru"
          value="1 batch"
          description="8,2 kg menunggu"
          icon={<Recycle />}
          tone="blue"
        />
        <SummaryCard
          label="Intake bulan ini"
          value="128,4 kg"
          icon={<Scale />}
        />
        <SummaryCard
          label="Terolah"
          value="116,8 kg"
          description="Data demo"
          icon={<Sprout />}
          tone="green"
        />
      </div>
      <div className="mt-6">
        <ImpactBreakdown {...demoImpact} />
      </div>
      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-semibold">Permintaan terbaru</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Diurutkan berdasarkan waktu dan jarak.
            </p>
          </div>
          <Button asChild variant="ghost">
            <Link to="/processor/recovery">
              Lihat semua <ArrowRight />
            </Link>
          </Button>
        </div>
        <div className="space-y-3">
          {recoveryBatches.map((batch) => (
            <Link
              to={`/processor/recovery/${batch.id}`}
              key={batch.id}
              className="flex flex-wrap items-center gap-4 rounded-xl bg-card p-4 shadow-sm"
            >
              <span className="grid size-11 place-items-center rounded-xl bg-secondary text-primary">
                <Recycle className="size-5" />
              </span>
              <div className="min-w-48 flex-1">
                <p className="font-medium">{batch.itemName}</p>
                <p className="text-xs text-muted-foreground">
                  {batch.merchantName} ·{" "}
                  {batch.distanceKm.toLocaleString("id-ID")} km
                </p>
              </div>
              <StatusBadge status={batch.status} />
              <p className="font-semibold">
                {formatKg(batch.offeredWeightGrams)}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
