import { MapPin, Recycle } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { formatKg, recoveryBatches } from "@/constants/mock-data";

export default function RecoveryPage() {
  return (
    <>
      <PageHeader
        title="Antrean recovery"
        description="Permintaan Circular Routing dari merchant di area operasionalmu."
      />
      <div className="grid gap-4 xl:grid-cols-2">
        {recoveryBatches.map((batch) => (
          <article key={batch.id} className="rounded-xl bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <span className="grid size-11 place-items-center rounded-xl bg-secondary text-primary">
                <Recycle />
              </span>
              <StatusBadge status={batch.status} />
            </div>
            <h2 className="mt-5 text-lg font-semibold">{batch.itemName}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Dari {batch.merchantName}
            </p>
            <p className="mt-5 text-3xl font-semibold tracking-[-0.035em]">
              {formatKg(batch.offeredWeightGrams)}
            </p>
            <p className="text-xs text-muted-foreground">
              Berat yang dinyatakan merchant
            </p>
            <div className="mt-5 grid gap-3 border-y py-4 text-sm sm:grid-cols-2">
              <p>
                <span className="block text-xs text-muted-foreground">
                  Pickup window
                </span>
                {batch.pickupWindow}
              </p>
              <p className="flex items-center gap-1.5">
                <MapPin className="size-4 text-primary" />
                {batch.distanceKm.toLocaleString("id-ID")} km dari fasilitas
              </p>
            </div>
            <Button
              asChild
              className="mt-5 w-full"
              variant={batch.status === "offered" ? "default" : "outline"}
            >
              <Link to={`/processor/recovery/${batch.id}`}>
                {batch.status === "offered"
                  ? "Tinjau permintaan"
                  : "Lihat hasil"}
              </Link>
            </Button>
          </article>
        ))}
      </div>
    </>
  );
}
