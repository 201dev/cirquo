import { Sprout } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { PageHeader } from "@/components/common/page-header";
import { QueryErrorBoundary } from "@/components/common/query-error-boundary";
import { StatusBadge } from "@/components/common/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { formatKg, formatWibDate } from "@/lib/format";

function HistoryContent() {
  const { sessionToken, user } = useAuth();
  const batches = useQuery(
    api.recoveryBatches.listQueue,
    sessionToken && user?.profile?.verificationStatus === "verified"
      ? { sessionToken, tab: "collected" }
      : "skip",
  );

  if (batches === undefined) return <Skeleton className="h-48 w-full rounded-xl" />;
  const processed = batches.filter((batch) => batch.status === "processed");
  if (!processed.length) return (
    <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
      Belum ada batch yang selesai diproses.
    </div>
  );

  return (
    <div className="overflow-hidden rounded-xl bg-card shadow-sm">
      <div className="divide-y">
        {processed.map((batch) => (
          <Link key={batch._id} to={`/processor/recovery/${batch._id}`} className="flex flex-wrap items-center gap-4 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:bg-muted/60">
            <span className="grid size-10 place-items-center rounded-lg bg-recovered/20 text-primary"><Sprout className="size-5" /></span>
            <div className="min-w-48 flex-1"><p className="font-medium">{batch.itemName}</p><p className="text-xs text-muted-foreground">{batch.merchantName}{batch.completedAt ? ` · ${formatWibDate(batch.completedAt)}` : ""}</p></div>
            <p className="text-sm"><span className="block text-xs text-muted-foreground">Output usable</span>{formatKg(batch.outputWeightGrams ?? 0)}</p>
            <p className="text-sm"><span className="block text-xs text-muted-foreground">Residual</span>{formatKg(batch.residualWeightGrams ?? 0)}</p>
            <StatusBadge status={batch.status} />
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function ProcessorHistoryPage() {
  return (
    <>
      <PageHeader title="Riwayat outcome" description="Batch yang telah selesai diproses oleh fasilitasmu." />
      <QueryErrorBoundary title="Riwayat outcome tidak dapat dimuat"><HistoryContent /></QueryErrorBoundary>
    </>
  );
}
