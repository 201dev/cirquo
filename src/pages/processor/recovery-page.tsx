import { Clock3, MapPin, Recycle } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { PageHeader } from "@/components/common/page-header";
import { QueryErrorBoundary } from "@/components/common/query-error-boundary";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/auth-context";
import { formatDistance, formatKg, formatPickupWindow } from "@/lib/format";

type QueueTab = "offered" | "accepted" | "collected";

const materialLabels: Record<string, string> = {
  prepared_food: "Makanan siap saji",
  bakery: "Roti & bakery",
  produce: "Buah & sayur",
  dairy: "Produk susu",
  protein: "Protein",
  dry_goods: "Bahan kering",
  mixed: "Campuran",
};

function OfferCountdown({ expiresAt }: { expiresAt: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);
  const remaining = Math.max(0, expiresAt - now);
  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1_000);
  const urgent = remaining < 3_600_000;

  return (
    <p
      role="timer"
      className={urgent ? "font-semibold text-destructive" : "text-muted-foreground"}
    >
      <Clock3 className="mr-1.5 inline size-4" />
      {remaining === 0
        ? "Offer telah kedaluwarsa"
        : `Sisa ${hours ? `${hours} jam ` : ""}${minutes} menit ${seconds} detik`}
    </p>
  );
}

function QueueSkeleton() {
  return (
    <div role="status" className="grid gap-4 lg:grid-cols-2">
      <span className="sr-only">Memuat antrean recovery...</span>
      {[0, 1].map((item) => (
        <Skeleton key={item} className="h-72 rounded-xl" />
      ))}
    </div>
  );
}

function QueueContent() {
  const { sessionToken, user } = useAuth();
  const [tab, setTab] = useState<QueueTab>("offered");
  const isVerified = user?.profile?.verificationStatus === "verified";
  const batches = useQuery(
    api.recoveryBatches.listQueue,
    sessionToken && isVerified ? { sessionToken, tab } : "skip",
  );

  if (!isVerified) {
    return (
      <div role="status" className="rounded-xl border border-dashed p-8 text-center">
        <p className="font-semibold">Verifikasi fasilitas masih diperlukan</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Antrean recovery tersedia setelah profil Organic Processor terverifikasi.
        </p>
      </div>
    );
  }

  return (
    <>
      <Tabs value={tab} onValueChange={(value) => setTab(value as QueueTab)} className="mb-5">
        <TabsList className="grid h-auto w-full grid-cols-3 sm:w-fit">
          <TabsTrigger value="offered">Ditawarkan</TabsTrigger>
          <TabsTrigger value="accepted">Diterima</TabsTrigger>
          <TabsTrigger value="collected">Sudah ditimbang</TabsTrigger>
        </TabsList>
      </Tabs>
      {batches === undefined ? <QueueSkeleton /> : batches.length === 0 ? (
        <div className="rounded-xl border border-dashed px-5 py-12 text-center">
          <Recycle className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 font-medium">Belum ada batch pada tahap ini</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Perubahan dari Circular Routing akan muncul otomatis di sini.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {batches.map((batch) => (
            <article key={batch._id} className="rounded-xl bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                  <Recycle />
                </span>
                <StatusBadge status={batch.status} />
              </div>
              <h2 className="mt-4 text-lg font-semibold">{batch.itemName}</h2>
              <p className="text-sm text-muted-foreground">
                {batch.merchantName} · {materialLabels[batch.materialType]}
              </p>
              <p className="mt-4 text-3xl font-semibold tracking-tight">
                {formatKg(batch.offeredWeightGrams)}
              </p>
              <p className="text-xs text-muted-foreground">Berat yang dinyatakan Merchant</p>
              <div className="mt-4 space-y-2 border-y py-4 text-sm">
                <p><MapPin className="mr-1.5 inline size-4 text-primary" />{batch.pickupAddress}</p>
                <p>{formatPickupWindow(batch.pickupStartAt, batch.pickupEndAt)} · {batch.distanceMeters === null ? "Jarak belum tersedia" : formatDistance(batch.distanceMeters)}</p>
                <p>Percobaan routing {batch.routingAttempts} · {batch.declinedProcessorCount} penolakan</p>
                {batch.offerExpiresAt ? <OfferCountdown expiresAt={batch.offerExpiresAt} /> : null}
              </div>
              <Button asChild className="mt-5 min-h-11 w-full" variant={batch.status === "offered" ? "default" : "outline"}>
                <Link to={`/processor/recovery/${batch._id}`}>
                  {batch.status === "offered" ? "Tinjau offer" : batch.status === "accepted" ? "Catat intake" : batch.status === "processed" ? "Lihat hasil" : "Catat outcome"}
                </Link>
              </Button>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

export default function RecoveryPage() {
  return (
    <>
      <PageHeader title="Antrean recovery" description="Batch Circular Routing yang ditugaskan ke fasilitasmu." />
      <QueryErrorBoundary title="Antrean recovery tidak dapat dimuat">
        <QueueContent />
      </QueryErrorBoundary>
    </>
  );
}
