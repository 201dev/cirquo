import { ArrowRight, Recycle } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { SummaryCard } from "@/components/common/summary-card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { formatDistance, formatKg } from "@/lib/format";

export default function ProcessorDashboardPage() {
  const { sessionToken, user } = useAuth();
  const recoveryBatches = useQuery(
    api.recoveryBatches.listQueue,
    sessionToken && user?.profile?.verificationStatus === "verified"
      ? { sessionToken, tab: "offered", limit: 3 }
      : "skip",
  );
  const offered = recoveryBatches ?? [];
  const offeredWeight = offered.reduce((total, batch) => total + batch.offeredWeightGrams, 0);
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
      <div className="grid gap-4 sm:max-w-sm">
        <SummaryCard
          label="Antrean baru"
          value={`${offered.length} batch`}
          description={`${formatKg(offeredWeight)} menunggu`}
          icon={<Recycle />}
          tone="blue"
        />
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
          {offered.map((batch) => (
            <Link
              to={`/processor/recovery/${batch._id}`}
              key={batch._id}
              className="flex flex-wrap items-center gap-4 rounded-xl bg-card p-4 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="grid size-11 place-items-center rounded-xl bg-secondary text-primary">
                <Recycle className="size-5" />
              </span>
              <div className="min-w-48 flex-1">
                <p className="font-medium">{batch.itemName}</p>
                <p className="text-xs text-muted-foreground">
                  {batch.merchantName} · {batch.distanceMeters === null ? "Jarak belum tersedia" : formatDistance(batch.distanceMeters)}
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
