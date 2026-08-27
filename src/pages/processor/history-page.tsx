import { Sprout } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { formatKg, recoveryBatches } from "@/constants/mock-data";

export default function ProcessorHistoryPage() {
  const processed = recoveryBatches.filter(
    (batch) => batch.status === "processed",
  );
  return (
    <>
      <PageHeader
        title="Riwayat outcome"
        description="Batch yang telah diterima dan selesai diproses oleh KomposKita."
      />
      <div className="overflow-hidden rounded-xl bg-card shadow-sm">
        <div className="divide-y">
          {processed.map((batch) => (
            <Link
              key={batch.id}
              to={`/processor/recovery/${batch.id}`}
              className="flex flex-wrap items-center gap-4 p-4 hover:bg-muted/60"
            >
              <span className="grid size-10 place-items-center rounded-lg bg-recovered/20 text-primary">
                <Sprout className="size-5" />
              </span>
              <div className="min-w-48 flex-1">
                <p className="font-medium">{batch.itemName}</p>
                <p className="text-xs text-muted-foreground">
                  {batch.merchantName} · {batch.requestedAt}
                </p>
              </div>
              <p className="text-sm">
                <span className="block text-xs text-muted-foreground">
                  Outcome
                </span>
                Kompos
              </p>
              <p className="font-semibold">
                {formatKg(batch.offeredWeightGrams)}
              </p>
              <StatusBadge status={batch.status} />
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
